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
import java.io.FileNotFoundException
import java.io.IOException
import kotlin.concurrent.thread
import org.ZingoLabs.Zingo.Constants.*


class RPCModule internal constructor(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "RPCModule"
    }

    private fun getDocumentDirectory(): String {
        return reactContext.applicationContext.filesDir.absolutePath
    }

    fun fileExists(fileName: String): Boolean {
        // Check if a file already exists
        val file = File(MainApplication.getAppContext()?.filesDir, fileName)
        return if (file.exists()) {
            Log.i("MAIN", "File $fileName exists")
            true
        } else {
            Log.i("MAIN", "File $fileName DOES NOT exist")
            false
        }
    }

    private fun readFile(fileName: String): ByteArray {
        val file = MainApplication.getAppContext()!!.openFileInput(fileName)
        return file.readBytes()
    }

    private fun writeFile(fileName: String, fileBytes: ByteArray) {
        val file = MainApplication.getAppContext()?.openFileOutput(fileName, Context.MODE_PRIVATE)
        file?.write(fileBytes)
        file?.close()
    }

    private fun deleteFile(fileName: String): Boolean {
        val file = MainApplication.getAppContext()?.getFileStreamPath(fileName)
        return file!!.delete()
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists
        promise.resolve(fileExists(WalletFileName.value))
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists
        promise.resolve(fileExists(WalletBackupFileName.value))
    }

    fun saveWalletFile(): Boolean {
        uniffi.zingo.initLogging()

        // Get the encoded wallet file
        val b64encoded: String = uniffi.zingo.saveToB64()
        if (b64encoded.lowercase().startsWith(ErrorPrefix.value)) {
            // with error don't save the file. Obviously.
            Log.e("MAIN", "Couldn't save the wallet. $b64encoded")
            return false
        }
        // Log.i("MAIN", b64encoded)

        try {
            val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            Log.i("MAIN", "file size: ${fileBytes.size} bytes")

            // Save file to disk
            writeFile(WalletFileName.value, fileBytes)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet")
            return false
        }
        return true
    }

    private fun saveWalletBackupFile(): Boolean {
        // Get the encoded wallet file
        val fileBytes: ByteArray
        try {
            // Intentar leer el archivo
            fileBytes = readFile(WalletFileName.value)
        } catch (e: FileNotFoundException) {
            Log.e("MAIN", "Error: Wallet file not found", e)
            return false
        } catch (e: IOException) {
            Log.e("MAIN", "Error: Couldn't read the wallet file", e)
            return false
        }

        try {
            // Save file to disk
            writeFile(WalletBackupFileName.value, fileBytes)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet backup")
            return false
        }
        return true
    }

    fun saveBackgroundFile(json: String) {
        // Log.i("MAIN", b64encoded)

        try {
            val fileBytes = json.toByteArray()
            Log.i("MAIN", "file background size: ${fileBytes.size} bytes")

            // Save file to disk
            writeFile(BackgroundFileName.value, fileBytes)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the background file")
        }
    }

    @ReactMethod
    fun createNewWallet(server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Creating new wallet")

        uniffi.zingo.initLogging()

        // Create a seed
        val resp = uniffi.zingo.initNew(server, getDocumentDirectory(), chainhint, true)
        // Log.i("MAIN-Seed", resp)

        if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(resp)
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with seed $seed")

        uniffi.zingo.initLogging()

        val resp = uniffi.zingo.initFromSeed(server, seed, birthday.toULong(), getDocumentDirectory(), chainhint, true)
        // Log.i("MAIN", resp)

        if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(resp)
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, server: String, chainhint: String, promise: Promise) {
        // Log.i("MAIN", "Restoring wallet with ufvk $ufvk")

        uniffi.zingo.initLogging()

        val resp = uniffi.zingo.initFromUfvk(server, ufvk, birthday.toULong(), reactContext.applicationContext.filesDir.absolutePath, chainhint, true)
        // Log.i("MAIN", resp)

        if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
            saveWalletFile()
        }

        promise.resolve(resp)
    }

    @ReactMethod
    fun loadExistingWallet(server: String, chainhint: String, promise: Promise) {
        promise.resolve(loadExistingWalletNative(server, chainhint))
    }

    fun loadExistingWalletNative(server: String, chainhint: String): String {
        // Read the file
        val fileBytes = readFile(WalletFileName.value)

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
        val fileBytesBackup: ByteArray
        val fileBytesWallet: ByteArray

        // Read the file backup
        try {
            fileBytesBackup = readFile(WalletBackupFileName.value)
        } catch (e: FileNotFoundException) {
            Log.e("MAIN", "Error: Backup file not found", e)
            promise.resolve(false)
            return
        } catch (e: IOException) {
            Log.e("MAIN", "Error reading the backup file", e)
            promise.resolve(false)
            return
        }

        // Read the file wallet
        try {
            fileBytesWallet = readFile(WalletFileName.value)
        } catch (e: FileNotFoundException) {
            Log.e("MAIN", "Error: Wallet file not found", e)
            promise.resolve(false)
            return
        } catch (e: IOException) {
            Log.e("MAIN", "Error reading the wallet file", e)
            promise.resolve(false)
            return
        }

        try {
            // Save file to disk wallet (with the backup)
            writeFile(WalletFileName.value, fileBytesBackup)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet with the backup")
            promise.resolve(false)
            return
        }

        try {
            // Save file to disk backup (with the wallet)
            writeFile(WalletBackupFileName.value, fileBytesWallet)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the backup with the wallet")
            promise.resolve(false)
            return
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        // check first if the file exists
        if (fileExists(WalletFileName.value)) {
            promise.resolve(deleteFile(WalletFileName.value))
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        // check first if the file exists
        if (fileExists(WalletBackupFileName.value)) {
            promise.resolve(deleteFile((WalletBackupFileName.value)))
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
            if (cmd == "sync" && !resp.lowercase().startsWith(ErrorPrefix.value)) {
                saveWalletFile()
            }

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        promise.resolve(saveWalletFile())
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        promise.resolve(saveWalletBackupFile())
    }

    @ReactMethod
    fun getLatestBlock(server: String, promise: Promise) {
        thread {
            uniffi.zingo.initLogging()
            
            // Initialize Light Client
            val resp = uniffi.zingo.getLatestBlockServer(server)
            promise.resolve(resp)
        }

    }

    @ReactMethod
    fun getDonationAddress(promise: Promise) {
        thread {
            uniffi.zingo.initLogging()

            // Initialize Light Client
            val resp = uniffi.zingo.getDeveloperDonationAddress()

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun getZenniesDonationAddress(promise: Promise) {
        thread {
            uniffi.zingo.initLogging()

            // Initialize Light Client
            val resp = uniffi.zingo.getZenniesForZingoDonationAddress()

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun getValueTransfersList(promise: Promise) {
        thread {
            uniffi.zingo.initLogging()

            // Initialize Light Client
            val resp = uniffi.zingo.getValueTransfers()

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun getTransactionSummariesList(promise: Promise) {
        thread {
            uniffi.zingo.initLogging()

            // Initialize Light Client
            val resp = uniffi.zingo.getTransactionSummaries()

            promise.resolve(resp)
        }
    }

    @ReactMethod
    fun setCryptoDefaultProvider(promise: Promise) {
        thread {
            uniffi.zingo.initLogging()

            // Initialize Light Client
            val resp = uniffi.zingo.setCryptoDefaultProviderToRing()

            promise.resolve(resp)
        }
    }

}
