package org.ZingoLabs.Zingo

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.util.Log
import java.io.File
import java.util.*
import org.json.JSONObject
import java.nio.charset.StandardCharsets

class BackgroundSyncWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    override fun doWork(): Result {
        Log.w("SCHEDULED_TASK_RUN", "Task running")

        // checking if the wallet file exists
        val exits: Boolean = walletExists()

        if (exits) {
            // stop syncing first, just in case.
            stopSyncingProcess()

            // interrupt
            val resp = RustFFI.execute("interrupt_sync_after_batch", "false")
            Log.w("SCHEDULED_TASK_RUN", "Not interrupting sync: $resp")

            // the task is running here blocking this execution until this process finished:
            // 1. finished the syncing.
            // 2. interrupted by a flag then it finished the current batch.

            Log.w("SCHEDULED_TASK_RUN", "sync BEGIN")
            val resp2 = RustFFI.execute("sync", "")
            Log.w("SCHEDULED_TASK_RUN", "sync END: $resp2")

        } else {
            Log.w("SCHEDULED_TASK_RUN", "No exists wallet file END")
            return Result.failure()

        }

        // save the wallet file
        RPCModule.saveWallet()

        // save the background JSON file
        val timeStamp = Date().time
        val timeStampStr = timeStamp.toString()
        val jsonBackground = "{\"batches\": \"0\", \"date\": \"$timeStampStr\"}"
        RPCModule.saveBackgroundFile(jsonBackground)

        return Result.success()
    }

    private fun stopSyncingProcess() {
        val resp = RustFFI.execute("syncstatus", "")
        Log.d("TAG", "BGTask stopSyncingProcess - status response $resp")

        val data: ByteArray = resp.toByteArray(StandardCharsets.UTF_8)
        val jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
        val inProgressStr: String = jsonResp.optString("in_progress")
        var inProgress: Boolean = inProgressStr.toBoolean()

        while (inProgress) {
            // interrupt
            val resp2 = RustFFI.execute("interrupt_sync_after_batch", "true")
            Log.w("SCHEDULED_TASK_RUN", "Interrupting sync: $resp2")

            Thread.sleep(500)

            val resp3 = RustFFI.execute("syncstatus", "")
            Log.d("TAG", "BGTask stopSyncingProcess - status response $resp3")

            val data: ByteArray = resp.toByteArray(StandardCharsets.UTF_8)
            val jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
            val inProgressStr: String = jsonResp.optString("in_progress")
            inProgress = inProgressStr.toBoolean()
        }

        Log.w("SCHEDULED_TASK_RUN", "sync process STOPPED")

    }

    private fun walletExists() : Boolean {
        // Check if a wallet already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.dat")
        return if (file.exists()) {
            Log.w("SCHEDULED_TASK_RUN", "Wallet exists")
            true
        } else {
            Log.w("SCHEDULED_TASK_RUN", "Wallet DOES NOT exist")
            false
        }
    }
}