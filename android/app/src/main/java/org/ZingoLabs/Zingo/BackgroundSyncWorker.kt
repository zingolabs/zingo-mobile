package org.ZingoLabs.Zingo

import android.content.Context
import android.app.ActivityManager
import android.os.Build
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import java.util.*
import org.json.JSONObject
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atTime
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.until
import kotlin.random.Random
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes
import kotlin.time.DurationUnit
import kotlin.time.toDuration
import kotlin.time.toJavaDuration
import java.io.FileNotFoundException

class BackgroundSyncWorker(private val context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    fun isAppInForeground(context: Context): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false

        val packageName = context.packageName
        for (appProcess in appProcesses) {
            if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                appProcess.processName == packageName
            ) {
                return true
            }
        }
        return false
    }

    /** How one wallet's turn in the nightly sync ended. */
    private sealed class Turn {
        object Synced : Turn()
        object Offline : Turn()
        object Foreground : Turn()
        class Failed(val message: String, val error: String) : Turn()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override fun doWork(): Result {

        Log.i("SCHEDULED_TASK_RUN", "Task running")

        val timeStampStrStart = (Date().time / 1000).toString()
        saveReport(timeStampStrStart, "Starting OK.", "0")

        if (isAppInForeground(context)) {
            Log.i("SCHEDULED_TASK_RUN", "App in Foreground, cancel background task")
            saveReport(timeStampStrStart, "App in Foreground, Background task KO.")
            return Result.failure()
        }

        if (!rpcModule.hasActiveWallet()) {
            Log.i("SCHEDULED_TASK_RUN", "No exists wallet file END")
            saveReport(timeStampStrStart, "No active wallet KO.")
            return Result.failure()
        }

        uniffi.zingo.initLogging()
        val deadline = System.currentTimeMillis() + SYNC_WINDOW_MS
        val filesDir = context.filesDir
        val active = WalletStore.active(filesDir)
        var activeTurn: Turn = Turn.Synced
        for (id in WalletStore.syncOrder(filesDir)) {
            if (System.currentTimeMillis() >= deadline) {
                Log.w("SCHEDULED_TASK_RUN", "sync window over before wallet $id")
                break
            }
            val turn = syncWallet(id, id == active, deadline)
            if (id == active) activeTurn = turn
            if (turn is Turn.Foreground) break
        }
        if (RPCModule.openWalletId != active && !isAppInForeground(context)) {
            rpcModule.closeWalletFile()
        }

        return when (val turn = activeTurn) {
            is Turn.Failed -> {
                saveReport(timeStampStrStart, turn.message, error = turn.error)
                Result.failure()
            }
            Turn.Offline -> {
                saveReport(timeStampStrStart, "Sync skipped - Offline mode.")
                Result.success()
            }
            Turn.Foreground -> {
                saveReport(timeStampStrStart, "App in Foreground, Background task KO.")
                Result.failure()
            }
            Turn.Synced -> {
                saveReport(timeStampStrStart, "Finished OK.")
                Result.success()
            }
        }
    }

    /** Syncs the wallet `id` until it catches up or the window ends, then saves it. */
    private fun syncWallet(id: String, isActive: Boolean, deadline: Long): Turn {
        if (isAppInForeground(context)) return Turn.Foreground
        try {
            val server = (if (isActive) rpcModule.activeServer() else rpcModule.walletServer(id))
                ?: throw FileNotFoundException("Error: the wallet $id has no server")
            val (serveruri, chainhint) = server
            if (serveruri.isEmpty()) {
                Log.i("SCHEDULED_TASK_RUN", "Offline mode, sync skipped for wallet $id")
                return Turn.Offline
            }
            Log.i("SCHEDULED_TASK_RUN", "Opening the wallet $id - serveruri: $serveruri chain: $chainhint")
            rpcModule.loadWalletNative(id, serveruri, chainhint, "Medium", "3", activate = false)
            val syncing = uniffi.zingo.runSync()
            Log.i("SCHEDULED_TASK_RUN", "sync LAUNCH $id: $syncing")
        } catch (t: uniffi.zingo.ZingolibException.Offline) {
            return Turn.Offline
        } catch (t: Throwable) {
            Log.i("SCHEDULED_TASK_RUN", "Run Sync error for wallet $id: $t")
            return Turn.Failed("Run sync process KO.", "Run sync process KO. ${t.message ?: "Error: Unknown"}")
        }

        while (true) {
            if (System.currentTimeMillis() >= deadline) {
                Log.w("SCHEDULED_TASK_RUN", "sync window over for wallet $id")
                break
            }
            if (isAppInForeground(context)) {
                if (RPCModule.openWalletId == id) stopAndSave(id)
                return Turn.Foreground
            }
            val syncStatusJson = try {
                // The session is continuous: it never ends on its own,
                // so one that has ended stopped on a failure, which
                // pollSync throws.
                val poll = uniffi.zingo.pollSync()
                if (!poll.lowercase().startsWith("sync task is not complete")) {
                    Log.i("SCHEDULED_TASK_RUN", "sync ENDED $id: $poll")
                    break
                }
                // syncCaughtUp reads only the engine's published status;
                // statusSync would read a stale wallet as complete before
                // the engine publishes.
                uniffi.zingo.syncCaughtUp()
            } catch (t: Throwable) {
                Log.i("SCHEDULED_TASK_RUN", "Sync STATUS error for wallet $id: $t")
                stopSyncAndWait()
                return Turn.Failed("Status sync process KO.", "Status sync process KO. ${t.message ?: "Error: Unknown"}")
            }
            try {
                val status = JSONObject(syncStatusJson)
                val percent = status.optDouble("percent")
                if (status.getBoolean("caught_up")) {
                    Log.i("SCHEDULED_TASK_RUN", "sync CAUGHT UP $id %: $percent")
                    break
                }
                Log.i("SCHEDULED_TASK_RUN", "sync STATUS $id %: $percent")
            } catch (e: Exception) {
                Log.e("SCHEDULED_TASK_RUN", "sync STATUS - parsing ERROR $id $e")
                stopSyncAndWait()
                return Turn.Failed("Status sync parsing process KO.", "Status sync parsing process KO. $e")
            }
            Thread.sleep(5000)
        }

        stopAndSave(id)
        return Turn.Synced
    }

    /** Ends the wallet's sync and saves what it reached. */
    private fun stopAndSave(id: String) {
        stopSyncAndWait()
        rpcModule.saveWalletFile()
        Log.i("SCHEDULED_TASK_RUN", "wallet $id SAVED")
    }

    /** Writes the night's result to the background JSON file. */
    private fun saveReport(start: String, message: String, end: String = (Date().time / 1000).toString(), error: String? = null) {
        val payload = JSONObject().apply {
            put("batches", "0")
            put("message", message)
            put("date", start)
            put("dateEnd", end)
            if (error != null) put("error", error)
        }.toString()
        rpcModule.saveBackgroundFile(payload)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $payload")
    }

    // The engine would keep scanning after the worker returns; end it so the
    // save holds the whole session and nothing runs on behind the app.
    private fun stopSyncAndWait() {
        try {
            uniffi.zingo.stopSync()
            val deadline = System.currentTimeMillis() + 30 * 1000
            while (System.currentTimeMillis() < deadline) {
                val poll = uniffi.zingo.pollSync()
                if (!poll.lowercase().startsWith("sync task is not complete")) {
                    return
                }
                Thread.sleep(200)
            }
            Log.w("SCHEDULED_TASK_RUN", "sync STOP timed out")
        } catch (t: Throwable) {
            Log.i("SCHEDULED_TASK_RUN", "sync STOP error: $t")
        }
    }

    private companion object {
        /** WorkManager stops a worker at 10 minutes; the last save lands before that. */
        const val SYNC_WINDOW_MS = 8 * 60 * 1000L + 30 * 1000L
    }
}

class BSCompanion {
    companion object {
        private const val TASKID = "Zingo_Processing_Task_ID"
        private val SYNC_PERIOD = 24.hours
        private val SYNC_DAY_SHIFT = 1.days // Move to tomorrow
        private val SYNC_START_TIME_HOURS = 3.hours // Start around 3 a.m. at night
        private val SYNC_START_TIME_MINUTES = 60.minutes // Randomize with minutes until 4 a.m.
        @RequiresApi(Build.VERSION_CODES.O)
        fun scheduleBackgroundTask() {
            val context = MainApplication.getAppContext() as Context
            val constraints = Constraints.Builder()
                .setRequiresStorageNotLow(false) // less restricted
                .setRequiredNetworkType(NetworkType.UNMETERED)
                .setRequiresCharging(true)
                .build()

            // PRODUCTION - next day between 3:00 and 4:00 am.
            val targetTimeDiff = calculateTargetTimeDifference()

            // TEST - 1 minutes later
            //val targetTimeDiff = calculateInFiveMinutes()

            Log.i("SCHEDULING_TASK", "calculated target time DIFF $targetTimeDiff")

            val workRequest = PeriodicWorkRequest.Builder(BackgroundSyncWorker::class.java, SYNC_PERIOD.toJavaDuration())
                .setConstraints(constraints)
                .setInitialDelay(targetTimeDiff.toJavaDuration())
                .build()

            Log.i("SCHEDULING_TASK", "Enqueuing the background task - Background")
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    TASKID,
                    ExistingPeriodicWorkPolicy.UPDATE,
                    workRequest
                )

            Log.i("SCHEDULING_TASK", "Task info ${WorkManager.getInstance(context).getWorkInfosForUniqueWork(
                TASKID).get()}")
        }

        //private fun calculateInFiveMinutes(): Duration = 1.minutes

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

        fun cancelExecutingTask() {
            val context = MainApplication.getAppContext() as Context

            Log.i("SCHEDULING_TASK", "Cancel background Task")
            WorkManager.getInstance(context)
                .cancelUniqueWork(TASKID)
        }

    }
}