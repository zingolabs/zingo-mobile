package org.ZingoLabs.Zingo

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap

/**
 * The device-auth call behind the app's privacy shutter (ADR 0007): one
 * BiometricPrompt ceremony at a time, resolved as a typed outcome.
 *
 * The module guarantees settlement. Every promise resolves: on the
 * prompt's own terminal callback, on the host's destruction or a context
 * reload (either takes the callback with it), when the prompt cannot
 * start, or at once when the call cannot attach. A ceremony carries its
 * own identity, so a callback arriving late settles its own waiters or
 * nothing at all, never the ceremony that replaced it. Concurrent calls
 * join the live ceremony and share its single answer instead of stacking
 * prompts or landing in a fail-open arm. The JS gate controller therefore
 * needs no rejection path and no watchdog of its own.
 *
 * `declined` covers the endings the person chose, leaving the app while
 * it asked included. `unavailable` covers every ending the platform owns,
 * permanent (no hardware, no enrollment) and transient (the sensor held
 * by another client, a vendor fault) alike, where the shutter fails open
 * with a notice. `code` is the platform's own error code, for bug
 * reports.
 */
class DeviceAuthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "DeviceAuth"
    }

    // BIOMETRIC_STRONG, not WEAK. react-native-keychain gates the same
    // secrets on Class 3 and binds its keys to AUTH_BIOMETRIC_STRONG (the
    // profile keychainOptions.ts centralises), so a shutter admitting a
    // Class 2 face unlock would accept, over this data, the same person
    // the keychain refuses.
    private val allowedAuthenticators =
        BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

    private val declinedCodes = setOf(
        BiometricPrompt.ERROR_TIMEOUT,
        BiometricPrompt.ERROR_CANCELED,
        BiometricPrompt.ERROR_LOCKOUT,
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
        BiometricPrompt.ERROR_USER_CANCELED,
        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
    )

    /**
     * One prompt's worth of waiting callers. Identity is the point: the
     * terminal callback, the teardown hooks, and the cannot-start paths
     * all settle a named ceremony, so a callback that outlives its own
     * ceremony can no longer answer the one that replaced it. Each waiter
     * gets its own map, because the bridge consumes a WritableMap once.
     */
    private class Ceremony {
        private val waiters = mutableListOf<Promise>()
        var settled = false
            private set

        fun join(promise: Promise) {
            waiters.add(promise)
        }

        fun settle(map: () -> WritableMap) {
            settled = true
            for (waiter in waiters) {
                waiter.resolve(map())
            }
            waiters.clear()
        }
    }

    // The one ceremony that may be live, held so every settle path can
    // name it and so a concurrent call has something to join.
    private var pending: Ceremony? = null

    private fun outcomeMap(outcome: String, code: String): WritableMap =
        Arguments.createMap().apply {
            putString("outcome", outcome)
            putString("code", code)
        }

    /** Settles this ceremony exactly once, releasing the slot while it still holds it. */
    @Synchronized
    private fun settle(ceremony: Ceremony, outcome: String, code: String) {
        if (ceremony.settled) {
            return
        }
        if (pending === ceremony) {
            pending = null
        }
        ceremony.settle { outcomeMap(outcome, code) }
    }

    /** Settles whichever ceremony is live, for the teardown hooks that hold no handle on one. */
    @Synchronized
    private fun settlePending(outcome: String, code: String) {
        val ceremony = pending ?: return
        settle(ceremony, outcome, code)
    }

    override fun onHostResume() {}

    override fun onHostPause() {}

    // The prompt's callback dies with its activity; the promise must not.
    // Leaving is the person's answer, so it locks like a decline.
    override fun onHostDestroy() {
        settlePending("declined", "activity-destroyed")
    }

    // The listener outlives the activity but must not outlive the module.
    // Under the new architecture a ReactHost reload destroys the context
    // without destroying MainActivity, so onHostDestroy never runs and a
    // live ceremony would be dropped with the shutter closed.
    override fun invalidate() {
        reactApplicationContext.removeLifecycleEventListener(this)
        settlePending("declined", "context-invalidated")
        super.invalidate()
    }

    @ReactMethod
    fun canAuthenticate(promise: Promise) {
        val code = BiometricManager.from(reactApplicationContext)
            .canAuthenticate(allowedAuthenticators)
        val map = Arguments.createMap().apply {
            putBoolean("available", code == BiometricManager.BIOMETRIC_SUCCESS)
            putString("code", code.toString())
        }
        promise.resolve(map)
    }

    // `cancelLabel` is unused here: a prompt that allows the device
    // credential owns its cancel affordance, and setNegativeButtonText is
    // forbidden alongside DEVICE_CREDENTIAL. iOS uses the label.
    @ReactMethod
    fun authenticate(title: String, cancelLabel: String, promise: Promise) {
        // PromptInfo.Builder.build() throws on an empty title, and thrown
        // from the UI thread that is a process crash with the slot latched.
        // A catalog key resolving before the translations load returns "".
        if (title.isBlank()) {
            promise.resolve(outcomeMap("unavailable", "empty-title"))
            return
        }
        val activity =
            reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            // The person left before the prompt could attach; that is an
            // answer, not a broken gate.
            promise.resolve(outcomeMap("declined", "no-resumed-activity"))
            return
        }
        // A second call must never cancel a live prompt, and must never
        // fail the shutter open behind one: it joins, and shares the
        // answer the person is about to give. Only the caller that opens
        // a ceremony goes on to raise a prompt.
        val ceremony = synchronized(this) {
            val live = pending
            if (live != null) {
                live.join(promise)
                null
            } else {
                Ceremony().also {
                    it.join(promise)
                    pending = it
                }
            }
        } ?: return
        UiThreadUtil.runOnUiThread {
            try {
                // BiometricPrompt.authenticate() logs and returns without
                // showing anything, and without ever calling back, once the
                // host FragmentManager has saved its state. RN clears
                // currentActivity only in onHostDestroy, so the guard above
                // still passes while the activity is merely stopped.
                if (activity.supportFragmentManager.isStateSaved) {
                    settle(ceremony, "declined", "state-saved")
                    return@runOnUiThread
                }
                val callback = object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult,
                    ) {
                        settle(ceremony, "authenticated", "")
                    }

                    override fun onAuthenticationError(
                        errorCode: Int,
                        errString: CharSequence,
                    ) {
                        settle(
                            ceremony,
                            if (errorCode in declinedCodes) "declined"
                            else "unavailable",
                            errorCode.toString(),
                        )
                    }
                    // onAuthenticationFailed is per-attempt; the prompt keeps
                    // running and delivers a terminal callback later.
                }
                val info = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setAllowedAuthenticators(allowedAuthenticators)
                    .build()
                BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(activity),
                    callback,
                ).authenticate(info)
            } catch (e: Exception) {
                settle(ceremony, "unavailable", e.javaClass.simpleName)
            }
        }
    }
}
