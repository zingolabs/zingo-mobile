package org.ZingoLabs.Zingo

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Log
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

    // Android's "Bold text" setting (API 31+) makes a TextView draw its
    // default typeface bolder, but React Native measures text with the
    // plain one, so any Text without an explicit fontWeight is laid out
    // narrower than it draws and loses its last letters. Zeroing the
    // adjustment for this activity keeps measure and draw on the same font.
    // Only that field is overridden; the rest follows the system. Toggling
    // the setting recreates the activity (it is not in configChanges), so
    // this runs again.
    override fun attachBaseContext(newBase: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            newBase.resources.configuration.fontWeightAdjustment != 0) {
            val override = Configuration().apply { fontWeightAdjustment = 0 }
            super.attachBaseContext(newBase.createConfigurationContext(override))
        } else {
            super.attachBaseContext(newBase)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i("ON_CREATE", "Starting main activity")
        // Screenshot blocking is not applied here. FLAG_SECURE used to sit on
        // the window for the whole app lifetime, which also killed captures on
        // History and Home. It is now toggled per-screen from JS, for the
        // screens that render recovery material only — see ScreenSecurityModule
        // and app/hooks/useSecureScreen.ts.
        super.onCreate(null)
        // Audit Issue I: tapjacking protection — drop touches if another
        // window (e.g. SYSTEM_ALERT_WINDOW overlay) is on top of ours.
        // Applied to every flavor: beta has to behave exactly like the build
        // that ships, or beta testing proves nothing about prod.
        window.decorView.filterTouchesWhenObscured = true
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