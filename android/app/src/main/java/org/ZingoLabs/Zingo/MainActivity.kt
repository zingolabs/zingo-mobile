package org.ZingoLabs.Zingo

import android.app.ActivityManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */

    override fun getMainComponentName(): String = "Zingo"

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i("ON_CREATE", "Starting main activity")
        // Gated per-flavor in build.gradle.kts (resValue "enforce_privacy_controls").
        // Prod: true (audit-mandated). Beta: false so testers can capture
        // screenshots/video and overlays from screen recorders don't drop touches.
        val enforcePrivacyControls = resources.getBoolean(R.bool.enforce_privacy_controls)
        if (enforcePrivacyControls) {
            // Block screenshots, screen recording, and the recents-screen thumbnail.
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )
            // Recents card background when FLAG_SECURE blanks the thumbnail.
            // Builder and setBackgroundColor both landed in API 33; below
            // that the background is not settable through public API, so
            // leave the card at the system default.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                setTaskDescription(
                    ActivityManager.TaskDescription.Builder()
                        .setBackgroundColor(Color.BLACK)
                        .build()
                )
            }
        }
        super.onCreate(null)
        if (enforcePrivacyControls) {
            // Audit Issue I: tapjacking protection — drop touches if another
            // window (e.g. SYSTEM_ALERT_WINDOW overlay) is on top of ours.
            window.decorView.filterTouchesWhenObscured = true
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        Log.i("CREATE_REACT_ACTIVITY_DELEGATE", "Created!")
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,  // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            fabricEnabled
        )
    }

    override fun onPause() {
        Log.i("ON_PAUSE", "Pausing main activity - Background")
        // oreo 8.0 (SDK 26)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            BSCompanion.scheduleBackgroundTask()
        }
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        Log.w("ON_WINDOW_FOCUS_CHANGE", "trying to focus.")
        // RN fires a soft exception here if the Context is not available
        // seems harmless.
        super.onWindowFocusChanged(hasFocus)
    }

    override fun onResume() {
        Log.i("ON_RESUME", "Resuming main activity - Foreground")
        // cancel the task always
        // oreo 8.0 (SDK 26)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            BSCompanion.cancelExecutingTask()
            BSCompanion.scheduleBackgroundTask()
        }
        super.onResume()
    }

}