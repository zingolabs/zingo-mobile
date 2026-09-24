package org.ZingoLabs.Zingo

import android.app.Activity
import android.view.WindowManager
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Per-screen FLAG_SECURE. Blocks screenshots, screen recording and the
 * recents thumbnail while enabled.
 *
 * The flag belongs to the Activity window, not to a view, so it cannot be
 * expressed as a React component. JS owns the lifetime: every setSecure(true)
 * needs a matching setSecure(false) once the sensitive screen unmounts. See
 * app/hooks/useSecureScreen.ts, which ref-counts the callers.
 */
class ScreenSecurityModule(private val reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    // A recreated Activity comes back with a fresh window and no flag, while
    // JS still holds its ref-count and believes the screen is protected. The
    // requested state is kept here and re-applied on every host resume so the
    // window can never drift from what JS asked for.
    @Volatile private var secureRequested = false

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "ScreenSecurity"

    override fun invalidate() {
        reactContext.removeLifecycleEventListener(this)
        super.invalidate()
    }

    /**
     * Resolves once the request is recorded and applied to the current window.
     * Callers await it before rendering anything sensitive.
     */
    @ReactMethod
    fun setSecure(secure: Boolean, promise: Promise) {
        secureRequested = secure
        val activity = reactContext.currentActivity
        if (activity == null) {
            // No window to flag. onHostResume applies the stored state before
            // the Activity becomes visible, so nothing capturable exists in
            // the meantime and the caller is safe to proceed.
            promise.resolve(true)
            return
        }
        activity.runOnUiThread {
            apply(activity)
            promise.resolve(true)
        }
    }

    override fun onHostResume() {
        val activity = reactContext.currentActivity ?: return
        activity.runOnUiThread { apply(activity) }
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun apply(activity: Activity) {
        if (secureRequested) {
            activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
            )
        } else {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
