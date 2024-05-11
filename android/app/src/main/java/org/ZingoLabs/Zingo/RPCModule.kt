package org.ZingoLabs.Zingo

import android.content.Context
import android.util.Log
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

//import android.util.Log
import java.io.File
import java.io.InputStream
import kotlin.concurrent.thread
import org.ZingoLabs.Zingo.Constants.*

class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "RPCModule"
    }

    private fun getFile(file: String): File {
        return File(MainApplication.getAppContext()?.filesDir, file)
    }

    fun fileExists(fileName: String): Boolean {
        // Check if a wallet already exists
        val file = getFile(fileName)
        return if (file.exists()) {
            Log.i("SCHEDULED_TASK_RUN", "Wallet exists")
            true
        } else {
            Log.i("SCHEDULED_TASK_RUN", "Wallet DOES NOT exist")
            false
        }
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        promise.resolve(fileExists(walletFileName.value))
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists
        promise.resolve(fileExists(walletBackupFileName.value))
    }

    fun saveWalletFile() {
        // Get the encoded wallet file
        val b64encoded: String = uniffi.zingo.saveToB64()
        if (b64encoded.lowercase().startsWith("error")) {
            // with error don't save the file. Obviously.
            Log.e("MAIN", "Couldn't save the wallet. $b64encoded")
            return
        }
        // Log.i("MAIN", b64encoded)

        try {
            val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            Log.i("MAIN", "file size: ${fileBytes.size} bytes")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput(walletFileName.value, Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet")
        }
    }

    private fun saveWalletBackupFile() {
        // Get the encoded wallet file
        // Read the file
        val fileRead = MainApplication.getAppContext()!!.openFileInput(walletFileName.value)
        val fileBytes = fileRead.readBytes()
        // Log.i("MAIN", b64encoded)

        try {
            // Log.i("MAIN", "file size${fileBytes.size}")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput(walletBackupFileName.value, Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet backup")
        }
    }

    fun saveBackgroundFile(json: String) {
        // Log.i("MAIN", b64encoded)

        try {
            val fileBytes: ByteArray = json.toByteArray()
            Log.i("MAIN", "file background size: ${fileBytes.size} bytes")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput(backgroundFileName.value, Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the background file")
        }
    }

    @ReactMethod
    fun createNewWallet(server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Creating new wallet")

        uniffi.zingo.initLogging()

        // Create a seed
        val seed = uniffi.zingo.initNew(server, reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN-Seed", seed)

        if (!seed.lowercase().startsWith(errorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(seed)
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with seed $seed")

        uniffi.zingo.initLogging()

        val rseed = uniffi.zingo.initFromSeed(server, seed, birthday.toULong(), reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN", rseed)

        if (!rseed.lowercase().startsWith(errorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(rseed)
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with ufvk $ufvk")

        uniffi.zingo.initLogging()

        val rufvk = uniffi.zingo.initFromUfvk(server, ufvk, birthday.toULong(), reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN", rufvk)

        if (!rufvk.lowercase().startsWith(errorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(rufvk)
    }

    @ReactMethod
    fun loadExistingWallet(server: String, chainhint: String, promise: Promise) {
        promise.resolve(loadExistingWalletNative(server, chainhint))
    }

    fun loadExistingWalletNative(server: String, chainhint: String): String {
        // Read the file
        val file: InputStream = MainApplication.getAppContext()?.openFileInput(walletFileName.value)!!
        val fileBytes = file.readBytes()
        file.close()

        val middle0w = 0
        val middle1w = 6000000 // 6_000_000 - 8 pieces
        val middle2w = 12000000
        val middle3w = 18000000
        val middle4w = 24000000
        val middle5w = 30000000
        val middle6w = 36000000
        val middle7w = 42000000
        val middle8w: Int = fileBytes.size

        var fileb64 = StringBuilder("")
        if (middle8w <= middle1w) {
            fileb64 = fileb64.append(
                Base64.encodeToString(
                    fileBytes,
                    middle0w,
                    middle8w - middle0w,
                    Base64.NO_WRAP
                )
            )
        } else {
            fileb64 = fileb64.append(
                Base64.encodeToString(
                    fileBytes,
                    middle0w,
                    middle1w - middle0w,
                    Base64.NO_WRAP
                )
            )
            if (middle8w <= middle2w) {
                fileb64 = fileb64.append(
                    Base64.encodeToString(
                        fileBytes,
                        middle1w,
                        middle8w - middle1w,
                        Base64.NO_WRAP
                    )
                )
            } else {
                fileb64 = fileb64.append(
                    Base64.encodeToString(
                        fileBytes,
                        middle1w,
                        middle2w - middle1w,
                        Base64.NO_WRAP
                    )
                )
                if (middle8w <= middle3w) {
                    fileb64 = fileb64.append(
                        Base64.encodeToString(
                            fileBytes,
                            middle2w,
                            middle8w - middle2w,
                            Base64.NO_WRAP
                        )
                    )
                } else {
                    fileb64 = fileb64.append(
                        Base64.encodeToString(
                            fileBytes,
                            middle2w,
                            middle3w - middle2w,
                            Base64.NO_WRAP
                        )
                    )
                    if (middle8w <= middle4w) {
                        fileb64 = fileb64.append(
                            Base64.encodeToString(
                                fileBytes,
                                middle3w,
                                middle8w - middle3w,
                                Base64.NO_WRAP
                            )
                        )
                    } else {
                        fileb64 = fileb64.append(
                            Base64.encodeToString(
                                fileBytes,
                                middle3w,
                                middle4w - middle3w,
                                Base64.NO_WRAP
                            )
                        )
                        if (middle8w <= middle5w) {
                            fileb64 = fileb64.append(
                                Base64.encodeToString(
                                    fileBytes,
                                    middle4w,
                                    middle8w - middle4w,
                                    Base64.NO_WRAP
                                )
                            )
                        } else {
                            fileb64 = fileb64.append(
                                Base64.encodeToString(
                                    fileBytes,
                                    middle4w,
                                    middle5w - middle4w,
                                    Base64.NO_WRAP
                                )
                            )
                            if (middle8w <= middle6w) {
                                fileb64 = fileb64.append(
                                    Base64.encodeToString(
                                        fileBytes,
                                        middle5w,
                                        middle8w - middle5w,
                                        Base64.NO_WRAP
                                    )
                                )
                            } else {
                                fileb64 = fileb64.append(
                                    Base64.encodeToString(
                                        fileBytes,
                                        middle5w,
                                        middle6w - middle5w,
                                        Base64.NO_WRAP
                                    )
                                )
                                if (middle8w <= middle7w) {
                                    fileb64 = fileb64.append(
                                        Base64.encodeToString(
                                            fileBytes,
                                            middle6w,
                                            middle8w - middle6w,
                                            Base64.NO_WRAP
                                        )
                                    )
                                } else {
                                    fileb64 = fileb64.append(
                                        Base64.encodeToString(
                                            fileBytes,
                                            middle6w,
                                            middle7w - middle6w,
                                            Base64.NO_WRAP
                                        )
                                    )
                                    fileb64 = fileb64.append(
                                        Base64.encodeToString(
                                            fileBytes,
                                            middle7w,
                                            middle8w - middle7w,
                                            Base64.NO_WRAP
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        uniffi.zingo.initLogging()

        Log.i("MAIN", "file size: $middle8w")

        return uniffi.zingo.initFromB64(
            server,
            fileb64.toString(),
            reactContext.applicationContext.filesDir.absolutePath,
            chainhint, true
        )
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        // Read the file backup
        val fileBackup = MainApplication.getAppContext()!!.openFileInput(walletBackupFileName.value)
        val fileBytesBackup = fileBackup.readBytes()

        // Read the file wallet
        val fileWallet = MainApplication.getAppContext()!!.openFileInput(walletFileName.value)
        val fileBytesWallet = fileWallet.readBytes()

        try {
            // Save file to disk wallet (with the backup)
            val fileWallet2 = MainApplication.getAppContext()?.openFileOutput(walletFileName.value, Context.MODE_PRIVATE)
            fileWallet2?.write(fileBytesBackup)
            fileWallet2?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet with the backup")
        }

        try {
            // Save file to disk backup (with the wallet)
            val fileBackup2 = MainApplication.getAppContext()?.openFileOutput(walletBackupFileName.value, Context.MODE_PRIVATE)
            fileBackup2?.write(fileBytesWallet)
            fileBackup2?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the backup with the wallet")
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        val file = MainApplication.getAppContext()?.getFileStreamPath(walletFileName.value)
        if (file!!.delete()) {
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        val file = MainApplication.getAppContext()?.getFileStreamPath(walletBackupFileName.value)
        if (file!!.delete()) {
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun execute(cmd: String, args: String, promise: Promise) {
        thread {

            uniffi.zingo.initLogging()

            // Log.i("execute", "Executing $cmd with $args")
            val resp = uniffi.zingo.executeCommand(cmd, args)
            // Log.i("execute", "Response to $cmd : $resp")

            // And save it if it was a sync
            if (cmd == "sync" && !resp.lowercase().startsWith(errorPrefix.value)) {
                saveWalletFile()
            }

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        saveWalletFile()

        promise.resolve(true)
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        saveWalletBackupFile()

        promise.resolve(true)
    }

    @ReactMethod
    fun getLatestBlock(server: String, promise: Promise) {
        // Log.i("MAIN", "Initialize Light Client")

        uniffi.zingo.initLogging()

        // Initialize Light Client
        val resp = uniffi.zingo.getLatestBlockServer(server)

        promise.resolve(resp)
    }

    @ReactMethod
    fun getDonationAddress(promise: Promise) {
        // Log.i("MAIN", "Initialize Light Client")

        uniffi.zingo.initLogging()

        // Initialize Light Client
        val resp = uniffi.zingo.getDeveloperDonationAddress()

        promise.resolve(resp)
    }

}
