package com.zecwalletmobile


import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise;

import android.util.Log
import java.io.File
import java.util.*
import kotlin.concurrent.thread


class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val TAG = "RPCModule"
    }

    private val LIGHTWALLETD_URL = "https://lightwalletd.zecwallet.co:1443";

    private external fun initlogging(): String
    private external fun execute(cmd: String, args: String): String
    private external fun initnew(serveruri: String, saplingOutputb64: String, saplingSpendb64: String): String
    private external fun initfromseed(serveruri: String, seed: String, birthday: String, saplingOutputb64: String, saplingSpendb64: String): String
    private external fun initfromb64(serveruri: String, datab64: String, saplingOutputb64: String, saplingSpendb64: String): String
    private external fun save(): String

    override fun getName(): String {
        return "RPCModule"
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        if (File(MainApplication.getAppContext()?.filesDir, "wallet.dat").exists()) {
            Log.w("MAIN", "Wallet exists")
            promise.resolve(true);
        } else {
            Log.w("MAIN", "Wallet DOES NOT exist")
            promise.resolve(false);
        }
    }

    @ReactMethod
    fun createNewWallet(promise: Promise) {
        Log.w("MAIN", "Creating new wallet")

        val saplingOutput = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)?.readBytes()
        val saplingSpend = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)?.readBytes()

        // Create a seed
        val seed = initnew(LIGHTWALLETD_URL, Base64.getEncoder().encodeToString(saplingOutput), Base64.getEncoder().encodeToString((saplingSpend)))
        Log.w("MAIN-Seed", seed)

        if (!seed.startsWith("Error")) {
            saveWallet()
        }

        promise.resolve(seed);
    }

    @ReactMethod
    fun restoreWallet(seed: String, birthday: Int, promise: Promise) {
        Log.w("MAIN", "Restoring wallet with seed $seed")

        val saplingOutput = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)?.readBytes()
        val saplingSpend = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)?.readBytes()

        val rseed = initfromseed(LIGHTWALLETD_URL, seed, birthday.toString(),
                        Base64.getEncoder().encodeToString(saplingOutput),
                        Base64.getEncoder().encodeToString((saplingSpend)))
        Log.w("MAIN", seed)

        saveWallet()

        promise.resolve(rseed)
    }

    @ReactMethod
    fun loadExistingWallet(promise: Promise) {
        // Read the file
        val fileBytes = MainApplication.getAppContext()!!.openFileInput("wallet.dat").readBytes()
        val fileb64 = Base64.getEncoder().encodeToString(fileBytes)

        val saplingOutput = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)?.readBytes()
        val saplingSpend = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)?.readBytes()

        val seed = initfromb64(LIGHTWALLETD_URL, fileb64,
                    Base64.getEncoder().encodeToString(saplingOutput),
                    Base64.getEncoder().encodeToString((saplingSpend)))

        Log.w("MAIN", seed)
        initlogging()

        promise.resolve(seed)
    }
    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        MainApplication.getAppContext()!!.deleteFile("wallet.dat")
        promise.resolve(true)
    }


    @ReactMethod
    fun doSend(sendJSON: String, promise: Promise) {
        // Run on a new thread so as to not block the UI
        thread {
            Log.w(TAG, "Trying to send $sendJSON")
            val result = execute("send", sendJSON)
            Log.w(TAG,"Send Result: $result")

            promise.resolve(result)
        }
    }

    @ReactMethod
    fun doSync(promise: Promise) {
        // We run the sync on a different thread, so that we don't block the UI for syncing
        thread {
            val syncresult = execute("sync", "")
            Log.w(TAG, "Sync:$syncresult");

            // And save it
            saveWallet()

            promise.resolve(syncresult)
        }
    }


    @ReactMethod
    fun execute(cmd: String, args: String, promise: Promise) {
        thread {
            Log.w(TAG, "Executing ${cmd} with ${args}")
            val resp = execute(cmd, args)
            Log.w(TAG, "Response to ${cmd}: ${resp}")

            promise.resolve(resp)
        }
    }

    fun saveWallet() {
        // Get the encoded wallet file
        val b64encoded = save()
        Log.w("MAIN", b64encoded)

        try {
            val fileBytes = Base64.getDecoder().decode(b64encoded)
            Log.w("MAIN", "file size${fileBytes.size}")

            // Save file to disk
            MainApplication.getAppContext()?.openFileOutput("wallet.dat", Context.MODE_PRIVATE).use { it?.write(fileBytes) }
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet")
        }
    }

}