package org.ZingoLabs.Zingo

import android.app.NotificationManager
import android.content.Context
import androidx.work.WorkManager

object NotifeeResidue {
    const val CHANNEL_ID = "ironwood-migration"

    val WORK_TAGS = listOf(
        "app.notifee.core.NotificationManager.TRIGGER",
        "app.notifee.core.BlockStateBroadcastReceiver.WORKER",
    )

    fun purge(deleteChannel: (String) -> Unit, cancelWork: (String) -> Unit) {
        deleteChannel(CHANNEL_ID)
        WORK_TAGS.forEach(cancelWork)
    }

    /**
     * - Deletes the migration notification channel through the system NotificationManager.
     * - Cancels every WorkManager job notifee enqueued, by tag.
     */
    fun purge(context: Context) {
        val notifications = context.getSystemService(NotificationManager::class.java)
        val work = WorkManager.getInstance(context)
        purge(
            { id -> notifications.deleteNotificationChannel(id) },
            { tag -> work.cancelAllWorkByTag(tag) },
        )
    }
}
