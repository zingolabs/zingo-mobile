package org.ZingoLabs.Zingo

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.util.Log

class BackgroundSyncWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    override fun doWork(): Result {
        val logMessage = inputData.getString("log_message")
        Log.w("SCHEDULED_TASK_RUN", logMessage ?: "No message provided")

        // checking if the wallet file exists




        return Result.success()
    }
}