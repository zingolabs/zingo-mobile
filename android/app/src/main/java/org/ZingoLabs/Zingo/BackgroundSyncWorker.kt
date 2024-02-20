package org.ZingoLabs.Zingo

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.util.Log
import java.io.File
import java.util.*
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import com.facebook.react.bridge.ReactApplicationContext

class BackgroundSyncWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    override fun doWork(): Result {
        val reactContext = ReactApplicationContext(MainApplication.getAppContext())
        val rpcModule = RPCModule(reactContext)

        Log.i("SCHEDULED_TASK_RUN", "Task running")

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
                BSCompanion.stopSyncingProcess()
            }

            // interrupt sync to false, just in case it is true.
            val resp = RustFFI.execute("interrupt_sync_after_batch", "false")
            Log.i("SCHEDULED_TASK_RUN", "Not interrupting sync: $resp")

            // the task is running here blocking this execution until this process finished:
            // 1. finished the syncing.

            Log.i("SCHEDULED_TASK_RUN", "sync BEGIN")
            val resp2 = RustFFI.execute("sync", "")
            Log.i("SCHEDULED_TASK_RUN", "sync END: $resp2")

        } else {
            Log.i("SCHEDULED_TASK_RUN", "No exists wallet file END")
            return Result.failure()

        }

        // save the wallet file with the new data from the sync process
        rpcModule.saveWallet()
        Log.i("SCHEDULED_TASK_RUN", "wallet file SAVED")

        // save the background JSON file
        val timeStamp = Date().time / 1000
        val timeStampStr = timeStamp.toString()
        val jsonBackground = "{\"batches\": \"0\", \"date\": \"$timeStampStr\"}"
        rpcModule.saveBackgroundFile(jsonBackground)
        Log.i("SCHEDULED_TASK_RUN", "background json file SAVED")

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
        fun stopSyncingProcess() {
            val resp = RustFFI.execute("syncstatus", "")
            Log.i("SCHEDULED_TASK_RUN", "status response $resp")

            if (resp.lowercase().startsWith("error")) {
                Log.i("SCHEDULED_TASK_RUN", "sync process STOPPED - no lightwalletd likely")
                return
            }

            var data: ByteArray = resp.toByteArray(StandardCharsets.UTF_8)
            var jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
            var inProgressStr: String = jsonResp.optString("in_progress")
            var inProgress: Boolean = inProgressStr.toBoolean()

            Log.i("SCHEDULED_TASK_RUN", "in progress value $inProgress")

            while (inProgress) {
                // interrupt
                val resp2 = RustFFI.execute("interrupt_sync_after_batch", "true")
                Log.i("SCHEDULED_TASK_RUN", "Interrupting sync: $resp2")

                // blocking the thread for 0.5 seconds.
                Thread.sleep(500)

                val resp3 = RustFFI.execute("syncstatus", "")
                Log.i("SCHEDULED_TASK_RUN", "status response $resp3")

                data = resp.toByteArray(StandardCharsets.UTF_8)
                jsonResp = JSONObject(String(data, StandardCharsets.UTF_8))
                inProgressStr = jsonResp.optString("in_progress")
                inProgress = inProgressStr.toBoolean()

                Log.i("SCHEDULED_TASK_RUN", "in progress value $inProgress")
            }

            Log.i("SCHEDULED_TASK_RUN", "sync process STOPPED")

        }
    }
}