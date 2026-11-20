package org.ZingoLabs.Zingo

import android.app.NotificationManager
import android.content.Context
import androidx.work.WorkManager

object NotifeeResidue {
    const val CHANNEL_ID = "ironwood-migration"
    const val DATABASE = "notifee_core_database"
    const val LEDGER = "notifee_residue"
    const val PURGED = "purged"

    val WORK_TAGS = listOf(
        "app.notifee.core.NotificationManager.TRIGGER",
        "app.notifee.core.BlockStateBroadcastReceiver.WORKER",
    )

    class Hooks(
        val deleteChannel: (String) -> Unit,
        val cancelWork: (String) -> Unit,
        val deleteDatabase: (String) -> Unit,
    )

    fun purgeOnce(purged: Boolean, markPurged: () -> Unit, hooks: Hooks): Boolean {
        if (purged) {
            return false
        }
        hooks.deleteChannel(CHANNEL_ID)
        WORK_TAGS.forEach(hooks.cancelWork)
        hooks.deleteDatabase(DATABASE)
        markPurged()
        return true
    }

    /**
     * - Reads the `notifee_residue` SharedPreferences file and writes `purged` into it after a purge.
     * - Deletes the migration notification channel through the system NotificationManager.
     * - Cancels every WorkManager job notifee enqueued, by tag.
     * - Deletes notifee-core's Room database from the app's databases directory.
     */
    fun purge(context: Context) {
        val ledger = context.getSharedPreferences(LEDGER, Context.MODE_PRIVATE)
        purgeOnce(
            purged = ledger.getBoolean(PURGED, false),
            markPurged = { ledger.edit().putBoolean(PURGED, true).apply() },
            hooks = Hooks(
                deleteChannel = { id ->
                    context.getSystemService(NotificationManager::class.java).deleteNotificationChannel(id)
                },
                cancelWork = { tag -> WorkManager.getInstance(context).cancelAllWorkByTag(tag) },
                deleteDatabase = { name -> context.deleteDatabase(name) },
            ),
        )
    }
}
