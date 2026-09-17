package org.ZingoLabs.Zingo

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.Date
import kotlin.random.Random
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes
import kotlin.time.DurationUnit
import kotlin.time.toDuration
import kotlin.time.toJavaDuration
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atTime
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.until
import org.ZingoLabs.Zingo.Constants.*
import org.json.JSONObject
import uniffi.zingo.EventStream
import uniffi.zingo.Wallet
import uniffi.zingo.WalletEvent
import uniffi.zingo.currentWallet

private const val TAG = "SCHEDULED_TASK_RUN"
private val SYNC_TIMEOUT = 1.hours

class BackgroundSyncWorker(private val context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())
    private val startedAt = unixSeconds()

    private fun unixSeconds(): String = (Date().time / 1000).toString()

    private fun isAppInForeground(): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        return appProcesses.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                it.processName == context.packageName
        }
    }

    /** Writes the background report JS reads on the next launch. */
    private fun report(message: String, dateEnd: String = unixSeconds(), error: String? = null) {
        val payload = JSONObject()
            .put("batches", "0")
            .put("message", message)
            .put("date", startedAt)
            .put("dateEnd", dateEnd)
        error?.let { payload.put("error", it) }
        rpcModule.saveBackgroundFile(payload.toString())
        Log.i(TAG, "background json file SAVED $payload")
    }

    private fun serverSettings(): Pair<String, String> {
        val settings = context.openFileInput("settings.json").use {
            JSONObject(it.readBytes().toString(Charsets.UTF_8))
        }
        val server = settings.getJSONObject("server")
        return server.getString("uri") to server.getString("chainName")
    }

    @RequiresApi(Build.VERSION_CODES.O)
    override suspend fun doWork(): Result {
        Log.i(TAG, "Task running")
        report("Starting OK.", dateEnd = "0")

        if (isAppInForeground()) {
            Log.i(TAG, "App in Foreground, cancel background task")
            report("App in Foreground, Background task KO.")
            return Result.failure()
        }

        if (!rpcModule.fileExists(WalletFileName.value)) {
            Log.i(TAG, "No exists wallet file END")
            report("No active wallet KO.")
            return Result.failure()
        }

        try {
            val (serverUri, chainName) = serverSettings()
            if (serverUri.isEmpty()) {
                Log.i(TAG, "Offline mode detected (empty serveruri) - skipping wallet load")
                report("Sync skipped - Offline mode.")
                return Result.success()
            }
            Log.i(TAG, "Opening the wallet file - No App active - serveruri: $serverUri chain: $chainName")
            val wallet = currentWallet()
                ?: rpcModule.openWalletFile(walletConnection(serverUri, chainName, "Medium", 3u))
            val end = syncUntilDone(wallet)
            if (end is WalletEvent.SyncFailed) {
                Log.i(TAG, "sync FAILED: ${end.error}")
                report("Run sync process KO.", error = "Run sync process KO. ${end.error.message}")
                return Result.failure()
            }
            rpcModule.saveWalletFile()
            Log.i(TAG, "wallet file SAVED")
        } catch (stop: CancellationException) {
            throw stop
        } catch (t: Throwable) {
            Log.i(TAG, "Run Sync unknown error: $t")
            report("Run sync process KO.", error = "Run sync process KO. ${t.message ?: "Error: Unknown"}")
            return Result.failure()
        }

        report("Finished OK.")
        return Result.success()
    }

    /** Starts a sync and reads its events until it completes, fails, or ends early on the timeout or the worker's stop, which pause it. */
    private suspend fun syncUntilDone(wallet: Wallet): WalletEvent? {
        val events = wallet.events()
        try {
            wallet.startSync()
            val end = withTimeoutOrNull(SYNC_TIMEOUT) { awaitSyncEnd(events) }
            if (end == null) {
                Log.w(TAG, "sync TIMEOUT after 1 hour")
                wallet.pauseSync()
            }
            return end
        } catch (stop: CancellationException) {
            withContext(NonCancellable) { wallet.pauseSync() }
            throw stop
        } finally {
            events.cancel()
        }
    }

    private suspend fun awaitSyncEnd(events: EventStream): WalletEvent? {
        while (true) {
            val event = events.next()
            when (event) {
                null -> return null
                is WalletEvent.SyncComplete -> {
                    Log.i(TAG, "sync COMPLETED %: ${event.result.percentageTotalOutputsScanned}")
                    return event
                }
                is WalletEvent.SyncFailed -> return event
                is WalletEvent.SyncProgress ->
                    Log.i(TAG, "sync STATUS %: ${event.status.percentageTotalOutputsScanned}")
                else -> Unit
            }
        }
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
