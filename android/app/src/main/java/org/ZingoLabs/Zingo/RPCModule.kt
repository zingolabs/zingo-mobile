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


class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "RPCModule"
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.dat")
        if (file.exists()) {
             // Log.i("MAIN", "Wallet exists")
            promise.resolve(true)
        } else {
             // Log.i("MAIN", "Wallet DOES NOT exist")
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists
        val file = File(MainApplication.getAppContext()?.filesDir, "wallet.backup.dat")
        if (file.exists()) {
            // Log.i("MAIN", "Wallet backup exists")
            promise.resolve(true)
        } else {
            // Log.i("MAIN", "Wallet backup DOES NOT exist")
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun createNewWallet(server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Creating new wallet")

        uniffi.rustlib.initLogging()

        // Create a seed
        val seed = uniffi.rustlib.initNew(server, reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN-Seed", seed)

        if (!seed.lowercase().startsWith("error")) {
            saveWallet()
        }

        promise.resolve(seed)
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with seed $seed")

        uniffi.rustlib.initLogging()

        val rseed = uniffi.rustlib.initFromSeed(server, seed, birthday.toULong(), reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN", rseed)

        if (!rseed.lowercase().startsWith("error")) {
            saveWallet()
        }

        promise.resolve(rseed)
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with ufvk $ufvk")

        uniffi.rustlib.initLogging()

        val rufvk = uniffi.rustlib.initFromUfvk(server, ufvk, birthday.toULong(), reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN", rufvk)

        if (!rufvk.lowercase().startsWith("error")) {
            saveWallet()
        }

        promise.resolve(rufvk)
    }

    @ReactMethod
    fun loadExistingWallet(server: String, chainhint: String, promise: Promise) {
        promise.resolve(loadExistingWalletNative(server, chainhint))
    }

    fun loadExistingWalletNative(server: String, chainhint: String): String {
        // Read the file
        val file: InputStream = MainApplication.getAppContext()?.openFileInput("wallet.dat")!!
        var fileBytes = file.readBytes()
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

        uniffi.rustlib.initLogging()

        // Log.i("MAIN", wseed)

        return uniffi.rustlib.initFromB64(
            server,
            fileb64.toString(),
            reactContext.applicationContext.filesDir.absolutePath,
            chainhint, true
        )
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
            Log.e("MAIN", "Couldn't save the wallet with the backup")
        }

        try {
            // Save file to disk backup (with the wallet)
            val fileBackup2 = MainApplication.getAppContext()?.openFileOutput("wallet.backup.dat", Context.MODE_PRIVATE)
            fileBackup2?.write(fileBytesWallet)
            fileBackup2?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the backup with the wallet")
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        val file = MainApplication.getAppContext()?.getFileStreamPath("wallet.dat")
        if (file!!.delete()) {
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        val file = MainApplication.getAppContext()?.getFileStreamPath("wallet.backup.dat")
        if (file!!.delete()) {
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun execute(cmd: String, args: String, promise: Promise) {
        thread {

            uniffi.rustlib.initLogging()

            // Log.i("execute", "Executing $cmd with $args")
            val resp = uniffi.rustlib.executeCommand(cmd, args)
            // Log.i("execute", "Response to $cmd : $resp")

            // And save it if it was a sync
            if (cmd == "sync" && !resp.lowercase().startsWith("error")) {
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

    fun saveWallet() {
        // Get the encoded wallet file
        val b64encoded = uniffi.rustlib.saveToB64()
        // Log.i("MAIN", b64encoded)

        try {
            val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            Log.i("MAIN", "file size: ${fileBytes.size} bytes")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput("wallet.dat", Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet")
        }
    }

    private fun saveWalletBackup() {
        // Get the encoded wallet file
        // val b64encoded = save()
        // Read the file
        val fileRead = MainApplication.getAppContext()!!.openFileInput("wallet.dat")
        val fileBytes = fileRead.readBytes()
        // val fileb64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
        // Log.i("MAIN", b64encoded)

        try {
            // val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            // Log.i("MAIN", "file size${fileBytes.size}")

            // Save file to disk
            val file = MainApplication.getAppContext()?.openFileOutput("wallet.backup.dat", Context.MODE_PRIVATE)
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
            val file = MainApplication.getAppContext()?.openFileOutput("background.json", Context.MODE_PRIVATE)
            file?.write(fileBytes)
            file?.close()
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the background file")
        }
    }

    @ReactMethod
    fun getLatestBlock(server: String, promise: Promise) {
        // Log.i("MAIN", "Initialize Light Client")

        uniffi.rustlib.initLogging()

        // Initialize Light Client
        val resp = uniffi.rustlib.getLatestBlockServer(server)

        promise.resolve(resp)
    }

}
