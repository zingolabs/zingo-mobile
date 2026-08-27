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

/**
 * The device-auth call behind the app's privacy shutter (ADR 0007): one
 * BiometricPrompt ceremony per invocation, resolved as a typed outcome.
 *
 * The module guarantees settlement: every promise resolves, on the
 * prompt's own terminal callback, on the host activity's destruction
 * (which takes the callback with it), or at once when the call cannot
 * attach. The JS gate controller therefore needs no rejection path and no
 * watchdog of its own. `declined` covers the endings the person chose,
 * leaving the app while it asked included; `unavailable` covers
 * everything the platform refused (no hardware, no enrollment, a second
 * call while one is pending), where the shutter fails open with a notice.
 * `code` is the platform's own error code, for bug reports.
 */
class DeviceAuthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "DeviceAuth"
    }

    private val allowedAuthenticators =
        BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

    private val declinedCodes = setOf(
        BiometricPrompt.ERROR_TIMEOUT,
        BiometricPrompt.ERROR_CANCELED,
        BiometricPrompt.ERROR_LOCKOUT,
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
        BiometricPrompt.ERROR_USER_CANCELED,
        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
    )

    // One ceremony at a time, held here so the terminal callback, the
    // host-destroy hook, and the busy answer all settle the same promise
    // exactly once.
    private var pendingCeremony: Promise? = null

    private fun outcomeMap(outcome: String, code: String) =
        Arguments.createMap().apply {
            putString("outcome", outcome)
            putString("code", code)
        }

    @Synchronized
    private fun settlePending(outcome: String, code: String) {
        val pending = pendingCeremony ?: return
        pendingCeremony = null
        pending.resolve(outcomeMap(outcome, code))
    }

    override fun onHostResume() {}

    override fun onHostPause() {}

    // The prompt's callback dies with its activity; the promise must not.
    // Leaving is the person's answer, so it locks like a decline.
    override fun onHostDestroy() {
        settlePending("declined", "activity-destroyed")
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
        val activity =
            reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            // The person left before the prompt could attach; that is an
            // answer, not a broken gate.
            promise.resolve(outcomeMap("declined", "no-resumed-activity"))
            return
        }
        synchronized(this) {
            if (pendingCeremony != null) {
                // A second call must never cancel a live prompt; the
                // pending ceremony carries the answer.
                promise.resolve(outcomeMap("unavailable", "busy"))
                return
            }
            pendingCeremony = promise
        }
        UiThreadUtil.runOnUiThread {
            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(
                    result: BiometricPrompt.AuthenticationResult,
                ) {
                    settlePending("authenticated", "")
                }

                override fun onAuthenticationError(
                    errorCode: Int,
                    errString: CharSequence,
                ) {
                    settlePending(
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
            try {
                BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(activity),
                    callback,
                ).authenticate(info)
            } catch (e: Exception) {
                settlePending("unavailable", e.javaClass.simpleName)
            }
        }
    }
}
