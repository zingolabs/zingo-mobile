package org.ZingoLabs.Zingo

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            DefaultNewArchitectureEntryPoint.fabricEnabled
        )
    }
    override fun getMainComponentName(): String {
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

        bundle.putString("BS: start syncing", "Native")

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