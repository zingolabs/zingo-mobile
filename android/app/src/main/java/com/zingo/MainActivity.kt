package com.zingo

import android.os.Bundle
import android.util.Log
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import com.facebook.react.ReactActivity
import java.util.concurrent.TimeUnit

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String? {
        return "Zingo!"
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        Log.w("", "Starting main activity")
        super.onCreate(null)
    }

    override fun onPause() {
        Log.w("", "Pausing main activity")
        super.onPause()
        //val backgroundRequest = PeriodicWorkRequest.Builder(BackgroundWorker::class.java, 15, TimeUnit.MINUTES).build()
        //WorkManager.getInstance(application).enqueue(backgroundRequest)
    }
}