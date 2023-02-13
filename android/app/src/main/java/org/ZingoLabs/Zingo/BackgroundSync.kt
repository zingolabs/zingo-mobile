package org.ZingoLabs.Zingo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

val START = "start"
val STOP = "stop"

class BackgroundSync : HeadlessJsTaskService() {
    private val SERVICE_NOTIFICATION_ID = 12345;



    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        return intent.extras?.let {
            HeadlessJsTaskConfig(
                "BackgroundSync",
                Arguments.fromBundle(it),
                0, // timeout for the task
                true // optional: defines whether or not the task is allowed in foreground.
                // Default is false
            )
        }
    }

     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
         if (intent?.action == STOP) {
             stopForeground(true)
             stopSelf()
         } else if (intent?.action == START) {
             val channelId =
                 if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                     createNotificationChannel()
                 } else {
                     // If earlier version channel ID is not used
                     // https://developer.android.com/reference/android/support/v4/app/NotificationCompat.Builder.html#NotificationCompat.Builder(android.content.Context)
                     ""
                 }

             val notificationIntent = Intent(this, MainActivity::class.java)
             val contentIntent = PendingIntent.getActivity(
                 this,
                 0,
                 notificationIntent,
                 PendingIntent.FLAG_CANCEL_CURRENT
             )
             val notification: Notification = NotificationCompat.Builder(this, channelId)
                 .setContentTitle("Zingo Sync")
                 .setContentText("Syncing...")
                 .setSmallIcon(R.mipmap.zingo)
                 .setContentIntent(contentIntent)
                 .setOngoing(true)
                 .build()
             startForeground(SERVICE_NOTIFICATION_ID, notification)
             Log.i("Foreground sync", notification.toString())
             super.onStartCommand(intent, flags, startId)
         }
         return START_STICKY
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


