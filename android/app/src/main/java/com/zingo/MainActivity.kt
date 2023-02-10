package org.ZingoLabs.Zingo

import android.content.Intent
import android.os.Bundle
import android.util.Log
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
        val service = Intent(applicationContext, BackgroundSync::class.java)
        applicationContext.stopService(service)
        super.onCreate(null)
    }

    override fun onPause() {
        Log.w("", "Pausing main activity")
        val service = Intent(applicationContext, BackgroundSync::class.java)
        val bundle = Bundle()

        bundle.putString("foo", "bar")

        service.putExtras(bundle)

        applicationContext.startService(service)
        super.onPause()
        //val backgroundRequest = PeriodicWorkRequest.Builder(BackgroundWorker::class.java, 15, TimeUnit.MINUTES).build()
        //WorkManager.getInstance(application).enqueue(backgroundRequest)
    }

    override fun onResume() {
        val service = Intent(applicationContext, BackgroundSync::class.java)
        applicationContext.stopService(service)
        super.onResume()
    }
}