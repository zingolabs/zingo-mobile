package com.zingo


import android.content.Context
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise;

import android.util.Log
import java.io.File
import kotlin.concurrent.thread


class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val TAG = "RPCModule"
    }

    private external fun initlogging(): String
    private external fun execute(cmd: String, args: String): String
    private external fun initnew(serveruri: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun initfromseed(serveruri: String, seed: String, birthday: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun initfromb64(serveruri: String, datab64: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun save(): String

    override fun getName(): String {
        return "RPCModule"
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.dat")
        if (file.exists()) {
            // Log.w("MAIN", "Wallet exists")
            promise.resolve(true);
        } else {
            // Log.w("MAIN", "Wallet DOES NOT exist")
            promise.resolve(false);
        }
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.backup.dat")
        if (file.exists()) {
            // Log.w("MAIN", "Wallet backup exists")
            promise.resolve(true);
        } else {
            // Log.w("MAIN", "Wallet backup DOES NOT exist")
            promise.resolve(false);
        }
    }

    @ReactMethod
    fun createNewWallet(server: String, promise: Promise) {
        // Log.w("MAIN", "Creating new wallet")

        val saplingOutputFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)
        val saplingOutput = saplingOutputFile?.readBytes()
        saplingOutputFile?.close()

        val saplingSpendFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)
        val saplingSpend = saplingSpendFile?.readBytes()
        saplingSpendFile?.close()

        initlogging()

        // Create a seed
        val seed = initnew(server,
            Base64.encodeToString(saplingOutput, Base64.NO_WRAP),
            Base64.encodeToString(saplingSpend, Base64.NO_WRAP),
            reactContext.applicationContext.filesDir.absolutePath)
        // Log.w("MAIN-Seed", seed)

        if (!seed.startsWith("Error")) {
            saveWallet()
        }

        promise.resolve(seed);
    }

    @ReactMethod
    fun restoreWallet(seed: String, birthday: String, server: String, promise: Promise) {
        // Log.w("MAIN", "Restoring wallet with seed $seed")

        val saplingOutputFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)
        val saplingOutput = saplingOutputFile?.readBytes()
        saplingOutputFile?.close()

        val saplingSpendFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)
        val saplingSpend = saplingSpendFile?.readBytes()
        saplingSpendFile?.close()

        val rseed = initfromseed(server, seed, birthday,
            Base64.encodeToString(saplingOutput, Base64.NO_WRAP),
            Base64.encodeToString(saplingSpend, Base64.NO_WRAP),
            reactContext.applicationContext.filesDir.absolutePath)
        // Log.w("MAIN", seed)

        if (!rseed.startsWith("Error")) {
            saveWallet()
        }

        promise.resolve(rseed)
    }

    @ReactMethod
    fun loadExistingWallet(server: String, promise: Promise) {
        // Read the file
        val file = MainApplication.getAppContext()!!.openFileInput("wallet.dat")
        val fileBytes = file.readBytes()
        val fileb64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP)

        val saplingOutputFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)
        val saplingOutput = saplingOutputFile?.readBytes()
        saplingOutputFile?.close()

        val saplingSpendFile = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)
        val saplingSpend = saplingSpendFile?.readBytes()
        saplingSpendFile?.close()

        val seed = initfromb64(server, fileb64,
            Base64.encodeToString(saplingOutput, Base64.NO_WRAP),
            Base64.encodeToString(saplingSpend, Base64.NO_WRAP),
            reactContext.applicationContext.filesDir.absolutePath)

        // Log.w("MAIN", seed)
        initlogging()

        file.close()

        promise.resolve(seed)
    }

    @ReactMethod
    fun RestoreExistingWalletBackup(promise: Promise) {
        // Read the file backup
        val fileBackup = MainApplication.getAppContext()!!.openFileInput("wallet.backup.dat")
        val fileBytesBackup = fileBackup.readBytes()

        // Read the file wallet
        val fileWallet = MainApplication.getAppContext()!!.openFileInput("wallet.dat")
        val fileBytesWallet = fileWallet.readBytes()

        try {
            // Save file to disk wallet (with the backup)
            val fileWallet2 = MainApplication.getAppContext()?.openFileOutput("wallet.dat", Context.MODE_PRIVATE)
            fileWallet2?.write(fileBytesBackup)
            fileWallet2?.close()
        } catch (e: IllegalArgumentException) {
            // Log.e("MAIN", "Couldn't save the wallet with the backup")
        }

        try {
            // Save file to disk backup (with the wallet)
            val fileBackup2 = MainApplication.getAppContext()?.openFileOutput("wallet.backup.dat", Context.MODE_PRIVATE)
            fileBackup2?.write(fileBytesWallet)
            fileBackup2?.close()
        } catch (e: IllegalArgumentException) {
            // Log.e("MAIN", "Couldn't save the backup with the wallet")
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        MainApplication.getAppContext()!!.deleteFile("wallet.dat")
        promise.resolve(true)
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        MainApplication.getAppContext()!!.deleteFile("wallet.backup.dat")
        promise.resolve(true)
    }


    @ReactMethod
    fun doSend(sendJSON: String, promise: Promise) {
        // Run on a new thread so as to not block the UI
        thread {
            // Log.w(TAG, "Trying to send $sendJSON")
            val result = execute("send", sendJSON)
            // Log.w(TAG,"Send Result: $result")

            promise.resolve(result)
        }
    }

    @ReactMethod
    fun execute(cmd: String, args: String, promise: Promise) {
        thread {
            // Log.w(TAG, "Executing ${cmd} with ${args}")
            val resp = execute(cmd, args)
            // Log.w(TAG, "Response to ${cmd}: ${resp}")

            // And save it if it was a sync
            if (cmd == "sync" && !resp.startsWith("Error")) {
                saveWallet()
            }

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        saveWallet();

        promise.resolve(true);
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        saveWalletBackup();

        promise.resolve(true);
    }

    fun saveWallet() {
        // Get the encoded wallet file
        val b64encoded = save()
        // Log.w("MAIN", b64encoded)

        try {
            val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            // Log.w("MAIN", "file size${fileBytes.size}")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput("wallet.dat", Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            // Log.e("MAIN", "Couldn't save the wallet")
        }
    }

    fun saveWalletBackup() {
        // Get the encoded wallet file
        // val b64encoded = save()
        // Read the file
        val fileRead = MainApplication.getAppContext()!!.openFileInput("wallet.dat")
        val fileBytes = fileRead.readBytes()
        // val fileb64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
        // Log.w("MAIN", b64encoded)

        try {
            // val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            // Log.w("MAIN", "file size${fileBytes.size}")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput("wallet.backup.dat", Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            // Log.e("MAIN", "Couldn't save the wallet backup")
        }
    }

}
