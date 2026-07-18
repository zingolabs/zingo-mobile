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
import org.ZingoLabs.Zingo.Constants.*
import java.io.FileInputStream
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

data class ScanRanges (
    val priority : String = "",
    val start_block : String = "",
    val end_block : String = ""
)

data class SyncStatus (
    val scan_ranges : List<ScanRanges> = emptyList(),
    val sync_start_height : Long = 0L,
    val session_blocks_scanned : Long = 0L,
    val total_blocks_scanned : Long = 0L,
    val percentage_session_blocks_scanned : Double = 0.0,
    val percentage_total_blocks_scanned : Double = 0.0,
    val session_sapling_outputs_scanned : Long = 0L,
    val total_sapling_outputs_scanned : Long = 0L,
    val session_orchard_outputs_scanned : Long = 0L,
    val total_orchard_outputs_scanned : Long = 0L,
    val percentage_session_outputs_scanned : Double = 0.0,
    val percentage_total_outputs_scanned : Double = 0.0
)

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

    @RequiresApi(Build.VERSION_CODES.O)
    override fun doWork(): Result {

        Log.i("SCHEDULED_TASK_RUN", "Task running")

        val mapper = jacksonObjectMapper()

        // save the background JSON file
        val timeStampStart = Date().time / 1000
        val timeStampStrStart = timeStampStart.toString()
        val jsonBackgroundStart = "{\"batches\": \"0\", \"message\": \"Starting OK.\", \"date\": \"$timeStampStrStart\", \"dateEnd\": \"0\"}"
        rpcModule.saveBackgroundFile(jsonBackgroundStart)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundStart")

        if (isAppInForeground(context)) {
            Log.i("SCHEDULED_TASK_RUN", "App in Foreground, cancel background task")
            // save the background JSON file
            val timeStampError = Date().time / 1000
            val timeStampStrError = timeStampError.toString()
            val payload = JSONObject().apply {
                put("batches", "0")
                put("message", "App in Foreground, Background task KO.")
                put("date", "$timeStampStrStart")
                put("dateEnd", "$timeStampStrError")
            }
            val jsonBackgroundError = payload.toString()
            rpcModule.saveBackgroundFile(jsonBackgroundError)
            Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
            return Result.failure()
        }

        try {
            // if the App is close, it need this at first step.
            val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
            Log.i("SCHEDULED_TASK_RUN", "crypto provider default: $setCrytoProvider")
        } catch (t: Throwable) {
            Log.i("SCHEDULED_TASK_RUN", "crypto provider default error: $t")
            // save the background JSON file
            val timeStampError = Date().time / 1000
            val timeStampStrError = timeStampError.toString()
            val msg = (t.message ?: "Error: Unknown")
            val payload = JSONObject().apply {
                put("batches", "0")
                put("message", "Crypto Provider Default KO.")
                put("date", "$timeStampStrStart")
                put("dateEnd", "$timeStampStrError")
                put("error", "Crypto Provider Default KO. $msg")
            }
            val jsonBackgroundError = payload.toString()
            rpcModule.saveBackgroundFile(jsonBackgroundError)
            Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
            return Result.failure()
        }

        // checking if the wallet file exists
        val exists: Boolean = rpcModule.fileExists(WalletFileName.value)

        if (exists) {
            try {
                uniffi.zingo.initLogging()
                // load the wallet file
                val shouldSync = loadWalletFile()

                if (!shouldSync) {
                    Log.i("SCHEDULED_TASK_RUN", "Offline mode, sync skipped")
                    val timeStampOffline = Date().time / 1000
                    val timeStampStrOffline = timeStampOffline.toString()
                    val payload = JSONObject().apply {
                        put("batches", "0")
                        put("message", "Sync skipped - Offline mode.")
                        put("date", "$timeStampStrStart")
                        put("dateEnd", "$timeStampStrOffline")
                    }
                    val jsonBackgroundOffline = payload.toString()
                    rpcModule.saveBackgroundFile(jsonBackgroundOffline)
                    Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundOffline")
                    return Result.success()
                }

                // runSync throws on failure (typed FFI errors); the catch
                // below owns the error path, so the launch message is never
                // inspected for an error sentinel.
                val syncing = uniffi.zingo.runSync()
                Log.i("SCHEDULED_TASK_RUN", "sync LAUNCH: $syncing")
            } catch (t: Throwable) {
                Log.i("SCHEDULED_TASK_RUN", "Run Sync unknown error: $t")
                // save the background JSON file
                val timeStampError = Date().time / 1000
                val timeStampStrError = timeStampError.toString()
                val msg = (t.message ?: "Error: Unknown")
                val payload = JSONObject().apply {
                    put("batches", "0")
                    put("message", "Run sync process KO.")
                    put("date", "$timeStampStrStart")
                    put("dateEnd", "$timeStampStrError")
                    put("error", "Run sync process KO. $msg")
                }
                val jsonBackgroundError = payload.toString()
                rpcModule.saveBackgroundFile(jsonBackgroundError)
                Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
                return Result.failure()
            }

            val startTime = System.currentTimeMillis()
            val maxDurationMillis = 60 * 60 * 1000

            var syncStatus: SyncStatus
            while (true) {
                val elapsed = System.currentTimeMillis() - startTime
                if (elapsed > maxDurationMillis) {
                    Log.w("SCHEDULED_TASK_RUN", "sync TIMEOUT after 1 hour")
                    break
                }

                var syncStatusJson: String = ""
                try {
                    // statusSync throws on failure (typed FFI errors); the
                    // catch below owns the error path, so the status JSON is
                    // never inspected for an error sentinel.
                    syncStatusJson = uniffi.zingo.statusSync()
                } catch (t: Throwable) {
                    Log.i("SCHEDULED_TASK_RUN", "Sync STATUS unknown error: $t")
                    // save the background JSON file
                    val timeStampError = Date().time / 1000
                    val timeStampStrError = timeStampError.toString()
                    val msg = (t.message ?: "Error: Unknown")
                    val payload = JSONObject().apply {
                        put("batches", "0")
                        put("message", "Status sync process KO.")
                        put("date", "$timeStampStrStart")
                        put("dateEnd", "$timeStampStrError")
                        put("error", "Status sync process KO. $msg")
                    }
                    val jsonBackgroundError = payload.toString()
                    rpcModule.saveBackgroundFile(jsonBackgroundError)
                    Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
                    return Result.failure()
                }

                try {
                    syncStatus = mapper.readValue(syncStatusJson)

                    val percent = syncStatus.percentage_total_outputs_scanned
                       ?: syncStatus.percentage_total_blocks_scanned

                    if (percent >= 100.0) {
                        Log.i("SCHEDULED_TASK_RUN", "sync COMPLETED %: $percent")
                        break
                    } else {
                        Log.i("SCHEDULED_TASK_RUN", "sync STATUS %: $percent")
                    }
                } catch (e: Exception) {
                    Log.e("SCHEDULED_TASK_RUN", "sync STATUS - parsing ERROR ${e.localizedMessage}")
                    // save the background JSON file
                    val timeStampError = Date().time / 1000
                    val timeStampStrError = timeStampError.toString()
                    val payload = JSONObject().apply {
                        put("batches", "0")
                        put("message", "Status sync parsing process KO.")
                        put("date", "$timeStampStrStart")
                        put("dateEnd", "$timeStampStrError")
                        put("error", "Status sync parsing process KO. ${e.localizedMessage}")
                    }
                    val jsonBackgroundError = payload.toString()
                    rpcModule.saveBackgroundFile(jsonBackgroundError)
                    Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
                    return Result.failure()
                }

                Thread.sleep(5000)
            }

        } else {
            Log.i("SCHEDULED_TASK_RUN", "No exists wallet file END")
            // save the background JSON file
            val timeStampError = Date().time / 1000
            val timeStampStrError = timeStampError.toString()
            val jsonBackgroundError = "{\"batches\": \"0\", \"message\": \"No active wallet KO.\", \"date\": \"$timeStampStrStart\", \"dateEnd\": \"$timeStampStrError\"}"
            rpcModule.saveBackgroundFile(jsonBackgroundError)
            Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundError")
            return Result.failure()
        }

        // save the wallet file with the new data from the sync process
        rpcModule.saveWalletFile()
        Log.i("SCHEDULED_TASK_RUN", "wallet file SAVED")

        // save the background JSON file
        val timeStampEnd = Date().time / 1000
        val timeStampStrEnd = timeStampEnd.toString()
        val jsonBackgroundEnd = "{\"batches\": \"0\", \"message\": \"Finished OK.\", \"date\": \"$timeStampStrStart\", \"dateEnd\": \"$timeStampStrEnd\"}"
        rpcModule.saveBackgroundFile(jsonBackgroundEnd)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED $jsonBackgroundEnd")

        return Result.success()
    }

    /**
     * Reads settings.json and loads the wallet file when a server URI is
     * configured. Returns `true` to signal the caller may proceed with sync, or
     * `false` only when the user is explicitly in offline mode (empty server
     * URI) and sync must be skipped. On any other unexpected condition the
     * function returns `true` so the downstream sync path surfaces its own
     * error rather than masquerading as offline mode.
     */
    private fun loadWalletFile(): Boolean {
        var shouldSync = true
        context.openFileInput("settings.json")?.use { file: FileInputStream ->
            val settingsBytes = file.readBytes()
            file.close()
            val settingsString = settingsBytes.toString(Charsets.UTF_8)
            val jsonObject = JSONObject(settingsString)
            val serveruri = jsonObject.getJSONObject("server").getString("uri")
            val chainhint = jsonObject.getJSONObject("server").getString("chainName")
            if (serveruri.isEmpty()) {
                Log.i(
                    "SCHEDULED_TASK_RUN",
                    "Offline mode detected (empty serveruri) - skipping wallet load"
                )
                shouldSync = false
                return@use
            }
            Log.i(
                "SCHEDULED_TASK_RUN",
                "Opening the wallet file - No App active - serveruri: $serveruri chain: $chainhint"
            )
            rpcModule.loadExistingWalletNative(serveruri, chainhint, "Medium", "3")
        }
        return shouldSync
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