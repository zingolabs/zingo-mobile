package org.ZingoLabs.Zingo

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * The device-auth call behind the app's privacy shutter (ADR 0007): one
 * BiometricPrompt ceremony per invocation, resolved as a typed outcome.
 *
 * The promise always resolves; the outcome union carries every ending, so
 * the JS gate controller needs no rejection path. `declined` covers the
 * endings the person chose (cancel, negative button, lockout after
 * repeated failures); `unavailable` covers everything the platform
 * refused (no hardware, no enrollment, no resumed activity), where the
 * shutter fails open with a notice. `code` is the platform's own error
 * code, for bug reports.
 */
class DeviceAuthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
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

    private fun outcomeMap(outcome: String, code: String) =
        Arguments.createMap().apply {
            putString("outcome", outcome)
            putString("code", code)
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
        val activity = currentActivity as? FragmentActivity
        if (activity == null) {
            promise.resolve(outcomeMap("unavailable", "no-resumed-activity"))
            return
        }
        UiThreadUtil.runOnUiThread {
            var settled = false
            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(
                    result: BiometricPrompt.AuthenticationResult,
                ) {
                    if (settled) return
                    settled = true
                    promise.resolve(outcomeMap("authenticated", ""))
                }

                override fun onAuthenticationError(
                    errorCode: Int,
                    errString: CharSequence,
                ) {
                    if (settled) return
                    settled = true
                    val outcome =
                        if (errorCode in declinedCodes) "declined"
                        else "unavailable"
                    promise.resolve(outcomeMap(outcome, errorCode.toString()))
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
                if (!settled) {
                    settled = true
                    promise.resolve(
                        outcomeMap("unavailable", e.javaClass.simpleName),
                    )
                }
            }
        }
    }
}
