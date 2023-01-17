package com.zingo

import android.os.Bundle
import androidx.work.PeriodicWorkRequest
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
        super.onCreate(null)
    }

    override fun onPause() {
        super.onPause()
        PeriodicWorkRequest.Builder(BackgroundWorker::class.java, 15, TimeUnit.MINUTES).build()
    }
}