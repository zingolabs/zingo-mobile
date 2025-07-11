package org.ZingoLabs.Zingo

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

    private var isStarting = true

    override fun getMainComponentName(): String = "Zingo"

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i("ON_CREATE", "Starting main activity")
        super.onCreate(null)
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
        // cancel the task if it is in execution now
        if (isStarting) {
            // this is the time the App is launching.
            isStarting = false
        } else {
            // oreo 8.0 (SDK 26)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                BSCompanion.cancelExecutingTask()
            }
        }
        super.onResume()
    }

}