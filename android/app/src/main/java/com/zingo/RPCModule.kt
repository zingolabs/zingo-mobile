package org.ZingoLabs.Zingo

import android.content.Context
import android.util.Log
import android.util.Base64
import androidx.work.PeriodicWorkRequest
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

//import android.util.Log
import java.io.File
import java.io.InputStream
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread


class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    //companion object {
    //    const val TAG = "RPCModule"
    //}

    private external fun initlogging(): String
    private external fun execute(cmd: String, args: String): String
    private external fun initnew(serveruri: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun initfromseed(serveruri: String, seed: String, birthday: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun initfromb64(serveruri: String, datab64: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String
    private external fun save(): String
    private external fun getlatestblock(serveruri: String): String

    override fun getName(): String {
        return "RPCModule"
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.dat")
        if (file.exists()) {
             // Log.w("MAIN", "Wallet exists")
            promise.resolve(true)
        } else {
             // Log.w("MAIN", "Wallet DOES NOT exist")
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.backup.dat")
        if (file.exists()) {
            // Log.w("MAIN", "Wallet backup exists")
            promise.resolve(true)
        } else {
            // Log.w("MAIN", "Wallet backup DOES NOT exist")
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun createNewWallet(server: String, promise: Promise) {
        // Log.w("MAIN", "Creating new wallet")

        val saplingSpendFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)!!
        var saplingSpend = saplingSpendFile.readBytes()
        saplingSpendFile.close()

        val middle0 =        0
        val middle1 =  6000000 // 6_000_000 - 8 pieces
        val middle2 = 12000000
        val middle3 = 18000000
        val middle4 = 24000000
        val middle5 = 30000000
        val middle6 = 36000000
        val middle7 = 42000000
        val middle8: Int = saplingSpend.size
        var saplingSpendEncoded = StringBuilder(Base64.encodeToString(saplingSpend, middle0, middle1 - middle0, Base64.NO_WRAP))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle1,
            middle2 - middle1,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle2,
            middle3 - middle2,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle3,
            middle4 - middle3,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle4,
            middle5 - middle4,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle5,
            middle6 - middle5,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle6,
            middle7 - middle6,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle7,
            middle8 - middle7,
            Base64.NO_WRAP
        ))
        saplingSpend = ByteArray(0)

        val saplingOutputFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)!!
        var saplingOutput = saplingOutputFile.readBytes()
        saplingOutputFile.close()

        val saplingOutputEncoded = StringBuilder(Base64.encodeToString(saplingOutput, Base64.NO_WRAP))

        saplingOutput = ByteArray(0)

        initlogging()

        // Create a seed
        val seed = initnew(server,
            saplingOutputEncoded.toString(),
            saplingSpendEncoded.toString(),
            reactContext.applicationContext.filesDir.absolutePath)
        // Log.w("MAIN-Seed", seed)

        if (!seed.startsWith("Error")) {
            saveWallet()
        }

        promise.resolve(seed)
    }

    @ReactMethod
    fun restoreWallet(seed: String, birthday: String, server: String, promise: Promise) {
        // Log.w("MAIN", "Restoring wallet with seed $seed")

        val saplingSpendFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)!!
        var saplingSpend = saplingSpendFile.readBytes()
        saplingSpendFile.close()

        val middle0 =        0
        val middle1 =  6000000 // 6_000_000 - 8 pieces
        val middle2 = 12000000
        val middle3 = 18000000
        val middle4 = 24000000
        val middle5 = 30000000
        val middle6 = 36000000
        val middle7 = 42000000
        val middle8: Int = saplingSpend.size
        var saplingSpendEncoded = StringBuilder(Base64.encodeToString(saplingSpend, middle0, middle1 - middle0, Base64.NO_WRAP))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle1,
            middle2 - middle1,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle2,
            middle3 - middle2,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle3,
            middle4 - middle3,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle4,
            middle5 - middle4,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle5,
            middle6 - middle5,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle6,
            middle7 - middle6,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle7,
            middle8 - middle7,
            Base64.NO_WRAP
        ))

        saplingSpend = ByteArray(0)

        val saplingOutputFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)!!
        var saplingOutput = saplingOutputFile.readBytes()
        saplingOutputFile.close()

        val saplingOutputEncoded = StringBuilder(Base64.encodeToString(saplingOutput, Base64.NO_WRAP))

        saplingOutput = ByteArray(0)

        initlogging()

        val rseed = initfromseed(server, seed, birthday,
            saplingOutputEncoded.toString(),
            saplingSpendEncoded.toString(),
            reactContext.applicationContext.filesDir.absolutePath)
        // Log.w("MAIN", seed)

        if (!rseed.startsWith("Error")) {
            saveWallet()
        }

        promise.resolve(rseed)
    }

    @ReactMethod
    fun loadExistingWallet(server: String, promise: Promise) {
        val saplingSpendFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)!!
        var saplingSpend = saplingSpendFile.readBytes()
        saplingSpendFile.close()

        val middle0 =        0
        val middle1 =  6000000 // 6_000_000 - 8 pieces
        val middle2 = 12000000
        val middle3 = 18000000
        val middle4 = 24000000
        val middle5 = 30000000
        val middle6 = 36000000
        val middle7 = 42000000
        val middle8: Int = saplingSpend.size
        var saplingSpendEncoded = StringBuilder(Base64.encodeToString(saplingSpend, middle0, middle1 - middle0, Base64.NO_WRAP))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle1,
            middle2 - middle1,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle2,
            middle3 - middle2,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle3,
            middle4 - middle3,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle4,
            middle5 - middle4,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle5,
            middle6 - middle5,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle6,
            middle7 - middle6,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle7,
            middle8 - middle7,
            Base64.NO_WRAP
        ))

        saplingSpend = ByteArray(0)

        val saplingOutputFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)!!
        var saplingOutput = saplingOutputFile.readBytes()
        saplingOutputFile.close()

        val saplingOutputEncoded = StringBuilder(Base64.encodeToString(saplingOutput, Base64.NO_WRAP))

        saplingOutput = ByteArray(0)

        // Read the file
        val file: InputStream = MainApplication.getAppContext()?.openFileInput("wallet.dat")!!
        var fileBytes = file.readBytes()
        file.close()

        val middle0w =        0
        val middle1w =  6000000 // 6_000_000 - 8 pieces
        val middle2w = 12000000
        val middle3w = 18000000
        val middle4w = 24000000
        val middle5w = 30000000
        val middle6w = 36000000
        val middle7w = 42000000
        val middle8w: Int = fileBytes.size

        var fileb64 = StringBuilder("")
        if (middle8w <= middle1w) {
            fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle0w, middle8w - middle0w, Base64.NO_WRAP))
        } else {
            fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle0w, middle1w - middle0w, Base64.NO_WRAP))
            if (middle8w <= middle2w) {
                fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle1w, middle8w - middle1w, Base64.NO_WRAP))
            } else {
                fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle1w, middle2w - middle1w, Base64.NO_WRAP))
                if (middle8w <= middle3w) {
                    fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle2w, middle8w - middle2w, Base64.NO_WRAP))
                } else {
                    fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle2w, middle3w - middle2w, Base64.NO_WRAP))
                    if (middle8w <= middle4w) {
                        fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle3w, middle8w - middle3w, Base64.NO_WRAP))
                    } else {
                        fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle3w, middle4w - middle3w, Base64.NO_WRAP))
                        if (middle8w <= middle5w) {
                            fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle4w, middle8w - middle4w, Base64.NO_WRAP))
                        } else {
                            fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle4w, middle5w - middle4w, Base64.NO_WRAP))
                            if (middle8w <= middle6w) {
                                fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle5w, middle8w - middle5w, Base64.NO_WRAP))
                            } else {
                                fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle5w, middle6w - middle5w, Base64.NO_WRAP))
                                if (middle8w <= middle7w) {
                                    fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle6w, middle8w - middle6w, Base64.NO_WRAP))
                                } else {
                                    fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle6w, middle7w - middle6w, Base64.NO_WRAP))
                                    fileb64 = fileb64.append(Base64.encodeToString(fileBytes, middle7w, middle8w - middle7w, Base64.NO_WRAP))
                                }
                            }
                        }
                    }
                }
            }
        }

        fileBytes = ByteArray(0)

        initlogging()

        val wseed = initfromb64(server,
            fileb64.toString(),
            saplingOutputEncoded.toString(),
            saplingSpendEncoded.toString(),
            reactContext.applicationContext.filesDir.absolutePath)
        // Log.w("MAIN", wseed)

        promise.resolve(wseed)
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
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

            initlogging()

            // Log.w("send", "Trying to send $sendJSON")
            val result = execute("send", sendJSON)
            // Log.w("send", "Send Result: $result")

            promise.resolve(result)
        }
    }

    @ReactMethod
    fun execute(cmd: String, args: String, promise: Promise) {
        thread {

            initlogging()

            // Log.w("execute", "Executing $cmd with $args")
            val resp = execute(cmd, args)
            // Log.w("execute", "Response to $cmd : $resp")

            // And save it if it was a sync
            if (cmd == "sync" && !resp.startsWith("Error")) {
                saveWallet()
            }

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        saveWallet()

        promise.resolve(true)
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        saveWalletBackup()

        promise.resolve(true)
    }

    private fun saveWallet() {
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

    private fun saveWalletBackup() {
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

    @ReactMethod
    fun getLatestBlock(server: String, promise: Promise) {
        // Log.w("MAIN", "Initialize Light Client")

        initlogging()

        // Initialize Light Client
        val resp = getlatestblock(server)

        promise.resolve(resp)
    }

}
