package org.ZingoLabs.Zingo

import android.content.Context
import android.util.Log
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import org.ZingoLabs.Zingo.Constants.*
import kotlinx.coroutines.*

class RPCModule internal constructor(private val reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    private val applicationContext: Context = reactContext?.applicationContext ?: MainApplication.getAppContext()!!

    override fun getName(): String {
        return "RPCModule"
    }

    private fun getDocumentDirectory(): String {
        return applicationContext.filesDir.absolutePath
    }

    fun fileExists(fileName: String): Boolean {
        // Check if a file already exists
        val file = File(applicationContext.filesDir, fileName)
        return if (file.exists()) {
            Log.i("MAIN", "File $fileName exists")
            true
        } else {
            Log.i("MAIN", "File $fileName DOES NOT exist")
            false
        }
    }

    private fun readFile(fileName: String): ByteArray {
        val file = applicationContext.openFileInput(fileName)
        return file.readBytes()
    }

    private fun writeFile(fileName: String, fileBytes: ByteArray) {
        val file = applicationContext.openFileOutput(fileName, Context.MODE_PRIVATE)
        file?.write(fileBytes)
        file?.close()
    }

    private fun deleteFile(fileName: String): Boolean {
        val file = applicationContext.getFileStreamPath(fileName)
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

        try {
            // Get the encoded wallet file
            val b64encoded: String = uniffi.zingo.saveToB64()
            if (b64encoded.lowercase().startsWith(ErrorPrefix.value)) {
                // with error don't save the file. Obviously.
                Log.e("MAIN", "Couldn't save the wallet. $b64encoded")
                return false
            }
            // Log.i("MAIN", b64encoded)

            val fileBytes = Base64.decode(b64encoded, Base64.NO_WRAP)
            Log.i("MAIN", "file size: ${fileBytes.size} bytes")

            // Save file to disk
            writeFile(WalletFileName.value, fileBytes)
        } catch (e: IllegalArgumentException) {
            Log.e("MAIN", "Couldn't save the wallet. Read/Write issue.")
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
        val resp = uniffi.zingo.initNew(server, chainhint)
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

        val resp = uniffi.zingo.initFromSeed(server, seed, birthday.toULong(), chainhint)
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

        val resp = uniffi.zingo.initFromUfvk(server, ufvk, birthday.toULong(), chainhint)
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
            chainhint
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
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.executeCommand(cmd, args)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: executing command '$cmd': ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = saveWalletFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: saving wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = saveWalletBackupFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: saving wallet backup: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getLatestBlockServerInfo(server: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getLatestBlockServer(server)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: getting latest block server: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getLatestBlockWalletInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getLatestBlockWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: getting latest block wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getDonationAddress(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getDeveloperDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: getting donation address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getZenniesDonationAddress(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getZenniesForZingoDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: getting Zennies donation address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getValueTransfersList(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getValueTransfers()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: getting value transfers list: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setCryptoDefaultProvider(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.setCryptoDefaultProviderToRing()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: setting crypto default provider: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun pollSyncInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.pollSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: sync poll info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun runSyncProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.runSync()

                if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                    saveWalletFile()
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: sync run process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun pauseSyncProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.pauseSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: sync pause process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun stopSyncProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.stopSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: sync stop process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun statusSyncInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.statusSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: sync status info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun runRescanProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.runRescan()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: rescan run process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun infoServerInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.infoServer()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: info server: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSeedInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSeed()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: seed: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getUfvkInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getUfvk()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: ufvk: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun changeServerProcess(server: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.changeServer(server)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: change server: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun walletKindInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.walletKind()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: wallet kind: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun parseAddressInfo(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.parseAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: parse address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun parseUfvkInfo(ufvk: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.parseUfvk(ufvk)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: parse ufvk: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getVersionInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getVersion()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: version: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getMessagesInfo(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getMessages(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: messages: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getBalanceInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getBalance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: balance: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalMemobytesToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalMemobytesToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: memobyes to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalValueToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalValueToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: value to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalSpendsToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalSpendsToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: spends to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun zecPriceInfo(tor: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.zecPrice(tor)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: zec price: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun resendTransactionProcess(txid: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.resendTransaction(txid)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: resend transaction: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun removeTransactionProcess(txid: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.removeTransaction(txid)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: remove transaction: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSpendableBalanceWithAddressInfo(address: String, zennies: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSpendableBalanceWithAddress(address, zennies)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: spendable balance with address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSpendableBalanceTotalInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSpendableBalanceTotal()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: spendable balance total: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getOptionWalletInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getOptionWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: get option wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setOptionWalletProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.setOptionWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: set option wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createTorClientProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createTorClient(getDocumentDirectory())

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: create tor client: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun removeTorClientProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.removeTorClient()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: remove tor client: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getUnifiedAddressesInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getUnifiedAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: unified addresses: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTransparentAddressesInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTransparentAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: transparent addresses: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createNewUnifiedAddressProcess(receivers: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createNewUnifiedAddress(receivers)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: create new unified address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createNewTransparentAddressProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createNewTransparentAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: create new transparent address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun checkMyAddressInfo(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.checkMyAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: create new unified address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getWalletSaveRequiredInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getWalletSaveRequired()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: get wallet save required: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setConfigWalletToProdProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.setConfigWalletToProd()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: set wallet config prod: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }
    
    @ReactMethod
    fun getConfigWalletPerformanceInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getConfigWalletPerformance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: get wallet config performance level: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

}
