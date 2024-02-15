package org.ZingoLabs.Zingo

import android.os.Bundle
import android.util.Log
import androidx.work.*
import com.facebook.react.ReactActivity
import java.util.concurrent.TimeUnit
import java.util.Calendar

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    private val taskID = "Zingo_Processing_Task_ID"
    override fun getMainComponentName(): String {
        return "Zingo!"
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        Log.w("ON_CREATE", "Starting main activity")
        // cancel the task if it is in execution now
        cancelExecutingTask()
        super.onCreate(null)
    }

    override fun onPause() {
        Log.w("ON_PAUSE", "Pausing main activity - Background")
        scheduleBackgroundTask()
        super.onPause()
    }

    override fun onResume() {
        Log.w("ON_RESUME", "Resuming main activity - Foreground")
        // cancel the task if it is in execution now
        cancelExecutingTask()
        // re-scheduling the task, just in case.
        scheduleBackgroundTask()
        super.onResume()
    }

    private fun cancelExecutingTask() {
        WorkManager.getInstance(this)
            .cancelUniqueWork(taskID)
    }

    private fun scheduleBackgroundTask() {
        val constraints = Constraints.Builder()
            .setRequiresStorageNotLow(true)
            .setRequiredNetworkType(NetworkType.UNMETERED)
            .setRequiresCharging(true)
            .build()

        // PRODUCTION - next day between 3:00 and 4:00 am.
        val currentTime = Calendar.getInstance()
        val targetTime = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 3)
            set(Calendar.MINUTE, (0..59).random())
            set(Calendar.SECOND, 0)
            if (before(currentTime)) {
                add(Calendar.DATE, 1)
            }
        }
        val timeDifference = targetTime.timeInMillis - currentTime.timeInMillis

        // DEVELOPMENT - after 5 minutes.
        //val timeFiveMinutes: Long = 5

        val workRequest = PeriodicWorkRequest.Builder(BackgroundSyncWorker::class.java, 24, TimeUnit.HOURS)
            .setConstraints(constraints)
            .setInitialDelay(timeDifference, TimeUnit.MILLISECONDS)
            //.setInitialDelay(timeFiveMinutes, TimeUnit.MINUTES)
            .build()

        Log.w("SCHEDULING_TASK", "Enqueuing the background task - Background")
        WorkManager.getInstance(this)
            .enqueueUniquePeriodicWork(
                taskID,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
    }
}