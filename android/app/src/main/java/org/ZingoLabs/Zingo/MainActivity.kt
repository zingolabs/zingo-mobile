package org.ZingoLabs.Zingo

import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.work.*
import com.facebook.react.ReactActivity


class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "Zingo!"
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i("ON_CREATE", "Starting main activity")
        super.onCreate(null)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onPause() {
        Log.i("ON_PAUSE", "Pausing main activity - Background")
        BSCompanion.scheduleBackgroundTask()
        super.onPause()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onResume() {
        Log.i("ON_RESUME", "Resuming main activity - Foreground")
        // cancel the task if it is in execution now
        BSCompanion.cancelExecutingTask()
        super.onResume()
    }

}