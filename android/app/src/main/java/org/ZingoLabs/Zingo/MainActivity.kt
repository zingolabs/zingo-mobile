package org.ZingoLabs.Zingo

import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.work.*
import com.facebook.react.ReactActivity
import kotlin.random.Random
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes
import kotlin.time.DurationUnit
import kotlin.time.toDuration
import kotlin.time.toJavaDuration
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atTime
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.until

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    private val taskID = "Zingo_Processing_Task_ID"
    private val SYNC_PERIOD = 24.hours
    private val SYNC_DAY_SHIFT = 1.days // Move to tomorrow
    private val SYNC_START_TIME_HOURS = 3.hours // Start around 3 a.m. at night
    private val SYNC_START_TIME_MINUTES = 60.minutes // Randomize with minutes until 4 a.m.

    override fun getMainComponentName(): String {
        return "Zingo!"
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i("ON_CREATE", "Starting main activity")
        super.onCreate(null)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onPause() {
        Log.i("ON_PAUSE", "Pausing main activity - Background")
        scheduleBackgroundTask()
        super.onPause()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onResume() {
        Log.i("ON_RESUME", "Resuming main activity - Foreground")
        // cancel the task if it is in execution now
        cancelExecutingTask()
        super.onResume()
    }

    private fun cancelExecutingTask() {
        Log.i("SCHEDULING_TASK", "Cancel background Task")
        WorkManager.getInstance(this)
            .cancelUniqueWork(taskID)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun scheduleBackgroundTask() {
        val constraints = Constraints.Builder()
            .setRequiresStorageNotLow(false) // less restricted
            .setRequiredNetworkType(NetworkType.UNMETERED)
            .setRequiresCharging(true)
            .build()

        // PRODUCTION - next day between 3:00 and 4:00 am.
        val targetTimeDiff = calculateTargetTimeDifference()

        Log.i("SCHEDULING_TASK", "calculated target time DIFF $targetTimeDiff")

        // DEVELOPMENT - after 5 minutes.
        //val timeFiveMinutes: Long = 5

        val workRequest = PeriodicWorkRequest.Builder(BackgroundSyncWorker::class.java, SYNC_PERIOD.toJavaDuration())
            .setConstraints(constraints)
            .setInitialDelay(targetTimeDiff.toJavaDuration())
            //.setInitialDelay(timeFiveMinutes, TimeUnit.MINUTES)
            .build()

        Log.i("SCHEDULING_TASK", "Enqueuing the background task - Background")
        WorkManager.getInstance(this)
            .enqueueUniquePeriodicWork(
                taskID,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
    }

    private fun calculateTargetTimeDifference(): Duration {
            val currentTimeZone: TimeZone = TimeZone.currentSystemDefault()

            val now: Instant = Clock.System.now()

            val targetTime =
                now
                    .plus(SYNC_DAY_SHIFT)
                    .toLocalDateTime(currentTimeZone)
                    .date
                    .atTime(
                        hour = SYNC_START_TIME_HOURS.inWholeHours.toInt(),
                        // Even though the WorkManager will trigger the work approximately at the set time, it's
                        // better to randomize time in 3-4 a.m. This generates a number between 0 (inclusive) and 60
                        // (exclusive)
                        minute = Random.nextInt(0, SYNC_START_TIME_MINUTES.inWholeMinutes.toInt())
                    )

            val targetTimeTime = targetTime.time
            val targetTimeDate = targetTime.date
            Log.i("SCHEDULING_TASK", "calculated target time $targetTimeTime and date $targetTimeDate")

            return now.until(
                other = targetTime.toInstant(currentTimeZone),
                unit = DateTimeUnit.MILLISECOND,
                timeZone = currentTimeZone
            ).toDuration(DurationUnit.MILLISECONDS)
        }
}