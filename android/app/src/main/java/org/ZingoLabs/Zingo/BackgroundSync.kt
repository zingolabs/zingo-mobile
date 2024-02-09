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

    //TODO: Migrate the following service start/stop logic to BackgroundSync.ts
/*     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
         if (intent?.action == STOP) {
             stopForeground(true)
             stopSelf()
         } else if (intent?.action == START) {
             val channelId = intent.extras!!.getString("channelId")


             val notificationIntent = Intent(this, MainActivity::class.java)
             val contentIntent = PendingIntent.getActivity(
                 this,
                 0,
                 notificationIntent,
                 PendingIntent.FLAG_IMMUTABLE
             )
             val notification: Notification = NotificationCompat.Builder(this, channelId!!)
                 .setContentTitle("Zingo Sync")
                 .setContentText("Syncing...")
                 .setSmallIcon(R.mipmap.zingo)
                 .setContentIntent(contentIntent)
                 .setOngoing(true)
                 .build()
             //startForeground(intent.extras!!.getInt("notifId")!!, notification)
             Log.i("Foreground sync", notification.toString())
             super.onStartCommand(intent, flags, startId)
         }
         return START_STICKY
     }*/



}


