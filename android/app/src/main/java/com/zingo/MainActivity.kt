package org.ZingoLabs.Zingo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
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
        val channelId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannel()
        } else {
            // If earlier version channel ID is not used
            // https://developer.android.com/reference/android/support/v4/app/NotificationCompat.Builder.html#NotificationCompat.Builder(android.content.Context)
            ""
        }
        Log.w("", "Pausing main activity")
        val service = Intent(applicationContext, BackgroundSync::class.java)
        service.setAction(START)
        val bundle = Bundle()

        bundle.putString("channelId", channelId)
        bundle.putInt("notifId", 12345)
       ;

        service.putExtras(bundle)

        applicationContext.startService(service)
        super.onPause()
        //val backgroundRequest = PeriodicWorkRequest.Builder(BackgroundWorker::class.java, 15, TimeUnit.MINUTES).build()
        //WorkManager.getInstance(application).enqueue(backgroundRequest)
    }

    override fun onResume() {
        val service = Intent(applicationContext, BackgroundSync::class.java)
        service.setAction(STOP)
        applicationContext.stopService(service)
        super.onResume()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun createNotificationChannel(): String{
        val channelId = "zbschannel"
        val channelName = "Zingo Background Sync"
        val chan = NotificationChannel(channelId,
            channelName, NotificationManager.IMPORTANCE_DEFAULT)
        chan.lightColor = Color.BLUE
        chan.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        val service = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        service.createNotificationChannel(chan)
        return channelId
    }
}