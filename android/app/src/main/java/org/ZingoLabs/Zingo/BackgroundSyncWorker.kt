package org.ZingoLabs.Zingo

import android.content.Context
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
import java.io.File
import java.util.*
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import com.facebook.react.bridge.ReactApplicationContext
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

class BackgroundSyncWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    @RequiresApi(Build.VERSION_CODES.O)
    override fun doWork(): Result {
        val reactContext = ReactApplicationContext(MainApplication.getAppContext())
        val rpcModule = RPCModule(reactContext)

        Log.i("SCHEDULED_TASK_RUN", "Task running")

        // save the background JSON file
        val timeStampStart = Date().time / 1000
        val timeStampStrStart = timeStampStart.toString()
        val jsonBackgroundStart = "{\"batches\": \"0\", \"message\": \"Starting OK.\", \"date\": \"$timeStampStrStart\"}"
        rpcModule.saveBackgroundFile(jsonBackgroundStart)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED")

        // checking if the wallet file exists
        val exists: Boolean = walletExists()

        if (exists) {
            RustFFI.initlogging()

            // check the Server, because the task can run without the App.
            val balance = RustFFI.execute("balance", "")
            Log.i("SCHEDULED_TASK_RUN", "Testing if server is active: $balance")
            if (balance.lowercase().startsWith("error")) {
                // this means this task is running with the App closed
                loadWalletFile(rpcModule)
            } else {
                // this means the App is open,
                // stop syncing first, just in case.
                stopSyncingProcess()
            }

            // interrupt sync to false, just in case it is true.
            val noInterrupting = RustFFI.execute("interrupt_sync_after_batch", "false")
            Log.i("SCHEDULED_TASK_RUN", "Not interrupting sync: $noInterrupting")

            // the task is running here blocking this execution until this process finished:
            // 1. finished the syncing.

            Log.i("SCHEDULED_TASK_RUN", "sync BEGIN")
            val syncing = RustFFI.execute("sync", "")
            Log.i("SCHEDULED_TASK_RUN", "sync END: $syncing")

        } else {
            Log.i("SCHEDULED_TASK_RUN", "No exists wallet file END")
            // save the background JSON file
            val timeStampError = Date().time / 1000
            val timeStampStrError = timeStampError.toString()
            val jsonBackgroundError = "{\"batches\": \"0\", \"message\": \"No wallet file KO.\", \"date\": \"$timeStampStrError\"}"
            rpcModule.saveBackgroundFile(jsonBackgroundError)
            Log.i("SCHEDULED_TASK_RUN", "background json file SAVED")
            return Result.failure()

        }

        // save the wallet file with the new data from the sync process
        rpcModule.saveWallet()
        Log.i("SCHEDULED_TASK_RUN", "wallet file SAVED")

        // save the background JSON file
        val timeStampEnd = Date().time / 1000
        val timeStampStrEnd = timeStampEnd.toString()
        val jsonBackgroundEnd = "{\"batches\": \"0\", \"message\": \"Finished OK.\", \"date\": \"$timeStampStrEnd\"}"
        rpcModule.saveBackgroundFile(jsonBackgroundEnd)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED")

        // the last thing... scheduling the same task for tomorrow
        BSCompanion.scheduleBackgroundTask()

        return Result.success()
    }

    private fun loadWalletFile(rpcModule: RPCModule) {
        // I have to init from wallet file in order to do the sync
        // and I need to read the settings.json to find the server & chain type
        MainApplication.getAppContext()?.openFileInput("settings.json")?.use { file ->
            val settingsBytes = file.readBytes()
            file.close()
            val settingsString = settingsBytes.toString(Charsets.UTF_8)
            val jsonObject = JSONObject(settingsString)
            val server = jsonObject.getJSONObject("server").getString("uri")
            val chainhint = jsonObject.getJSONObject("server").getString("chain_name")
            Log.i(
                "SCHEDULED_TASK_RUN",
                "Opening the wallet file - No App active - server: $server chain: $chainhint"
            )
            rpcModule.loadExistingWalletNative(server, chainhint)
        }
    }

    private fun stopSyncingProcess() {
        var status = RustFFI.execute("syncstatus", "")
        Log.i("SCHEDULED_TASK_RUN", "status response $status")

        var data: ByteArray = status.toByteArray(StandardCharsets.UTF_8)
        var jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
        var inProgressStr: String = jsonResp.optString("in_progress")
        var inProgress: Boolean = inProgressStr.toBoolean()

        Log.i("SCHEDULED_TASK_RUN", "in progress value $inProgress")

        while (inProgress) {
            // interrupt
            val interrupting = RustFFI.execute("interrupt_sync_after_batch", "true")
            Log.i("SCHEDULED_TASK_RUN", "Interrupting sync: $interrupting")

            // blocking the thread for 0.5 seconds.
            Thread.sleep(500)

            status = RustFFI.execute("syncstatus", "")
            Log.i("SCHEDULED_TASK_RUN", "status response $status")

            data = status.toByteArray(StandardCharsets.UTF_8)
            jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
            inProgressStr = jsonResp.optString("in_progress")
            inProgress = inProgressStr.toBoolean()

            Log.i("SCHEDULED_TASK_RUN", "in progress value $inProgress")
        }

        Log.i("SCHEDULED_TASK_RUN", "sync process STOPPED")

    }

    private fun walletExists(): Boolean {
        // Check if a wallet already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.dat")
        return if (file.exists()) {
            Log.i("SCHEDULED_TASK_RUN", "Wallet exists")
            true
        } else {
            Log.i("SCHEDULED_TASK_RUN", "Wallet DOES NOT exist")
            false
        }
    }
}

class BSCompanion {
    companion object {
        private const val taskID = "Zingo_Processing_Task_ID"
        private val SYNC_PERIOD = 24.hours
        private val SYNC_DAY_SHIFT = 1.days // Move to tomorrow
        private val SYNC_START_TIME_HOURS = 3.hours // Start around 3 a.m. at night
        private val SYNC_START_TIME_MINUTES = 60.minutes // Randomize with minutes until 4 a.m.
        @RequiresApi(Build.VERSION_CODES.O)
        fun scheduleBackgroundTask() {
            val reactContext = ReactApplicationContext(MainApplication.getAppContext())

            // zancas requeriment, not plug-in
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.UNMETERED)
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
            WorkManager.getInstance(reactContext)
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

        fun cancelExecutingTask() {
            val reactContext = ReactApplicationContext(MainApplication.getAppContext())

            // run interrupt sync, just in case.
            val interrupting = RustFFI.execute("interrupt_sync_after_batch", "true")
            Log.i("SCHEDULED_TASK_RUN", "Interrupting sync: $interrupting")

            Log.i("SCHEDULING_TASK", "Cancel background Task")
            WorkManager.getInstance(reactContext)
                .cancelUniqueWork(taskID)
        }

    }
}