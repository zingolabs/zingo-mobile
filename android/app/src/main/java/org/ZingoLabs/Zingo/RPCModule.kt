package org.ZingoLabs.Zingo

import android.content.Context
import android.util.Log
import android.util.Base64
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileNotFoundException
import org.ZingoLabs.Zingo.Constants.*
import kotlinx.coroutines.*

class RPCModule internal constructor(private val reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    private val applicationContext: Context = reactContext?.applicationContext ?: MainApplication.getAppContext()!!

    companion object {
        @JvmStatic
        external fun initRustlsPlatformVerifier(context: Context)
    }

    init {
        initRustlsPlatformVerifier(applicationContext)
    }

    override fun getName(): String {
        return "RPCModule"
    }

    private fun getDocumentDirectory(): String {
        return applicationContext.filesDir.absolutePath
    }

    private fun buildEncryptedFile(fileName: String): EncryptedFile {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(
            File(applicationContext.filesDir, fileName),
            applicationContext,
            masterKeyAlias,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB,
        ).build()
    }

    // Migrates a wallet file from the old format (raw binary) to the new format
    // (encrypted Base64 text). Safe to call even if the file does not exist or
    // is already in the new format.
    //
    // EncryptedFile stores its keyset in SharedPreferences keyed by file path, so
    // we cannot use a temp-file-then-rename approach (the renamed file would be
    // decrypted with the wrong keyset). Instead we keep a plain binary .migrating
    // backup until the encrypted write is confirmed, then delete it.
    fun migrateFileIfNeeded(fileName: String) {
        val file = File(applicationContext.filesDir, fileName)
        val backupFile = File(applicationContext.filesDir, "$fileName.migrating")

        // Resume an interrupted migration: the original was deleted but the plain
        // binary backup still exists — restore it so the normal path can retry.
        if (!file.exists() && backupFile.exists()) {
            Log.i("MAIN", "[$fileName] resuming interrupted migration: restoring binary backup")
            if (!backupFile.renameTo(file)) {
                Log.e("MAIN", "[$fileName] migration: could not restore backup, giving up")
                return
            }
        }

        if (!file.exists()) return

        // Check if already encrypted — try reading it as EncryptedFile.
        val alreadyEncrypted = try {
            buildEncryptedFile(fileName).openFileInput().use { it.readBytes() }
            true
        } catch (_: Exception) {
            false
        }

        if (alreadyEncrypted) {
            Log.i("MAIN", "[$fileName] already encrypted, skipping migration")
            backupFile.delete() // clean up any stale backup from a previous run
            return
        }

        Log.i("MAIN", "[$fileName] not yet encrypted, starting migration")

        // Read the old binary content.
        val oldBytes = try {
            applicationContext.openFileInput(fileName).use { it.readBytes() }
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] migration: could not read old file, aborting: $e")
            return
        }

        val base64Content = Base64.encodeToString(oldBytes, Base64.NO_WRAP)

        // Save a plain binary backup before touching the original.
        // If the process dies after we delete the original, the next startup
        // will find this backup and restore it before retrying.
        try {
            file.copyTo(backupFile, overwrite = true)
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] migration: could not create backup, aborting: $e")
            return
        }

        // Delete original and write encrypted version using the correct file name.
        // EncryptedFile keys its keyset by file path, so writing with the final
        // name here ensures readEncryptedFile() later uses the matching keyset.
        file.delete()
        try {
            buildEncryptedFile(fileName).openFileOutput().use { out ->
                out.write(base64Content.toByteArray(Charsets.UTF_8))
            }
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] migration: encrypted write failed, restoring backup: $e")
            backupFile.renameTo(file)
            return
        }

        // Verify the encrypted file is readable before discarding the backup.
        try {
            buildEncryptedFile(fileName).openFileInput().use { it.readBytes() }
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] migration: verification failed, restoring backup: $e")
            file.delete()
            backupFile.renameTo(file)
            return
        }

        backupFile.delete()
        Log.i("MAIN", "[$fileName] migration complete")
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

    private fun readEncryptedFile(fileName: String): String {
        return buildEncryptedFile(fileName).openFileInput().use { input ->
            input.bufferedReader(Charsets.UTF_8).readText()
        }
    }

    // Reads a wallet file as a Base64 string. First tries the new encrypted format;
    // if that fails (migration not yet complete or interrupted), falls back to reading
    // the old raw binary and encoding it — the format zingolib has always expected.
    // This makes migration failures invisible to the user on startup and during backup.
    private fun readFileAsB64(fileName: String): String {
        return try {
            readEncryptedFile(fileName)
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] encrypted read failed, trying binary fallback: $e")
            applicationContext.openFileInput(fileName).use { input ->
                Base64.encodeToString(input.readBytes(), Base64.NO_WRAP)
            }
        }
    }

    private fun writeEncryptedFile(fileName: String, content: String) {
        // EncryptedFile keys its keyset in SharedPreferences by file path, so
        // temp-file-then-rename would decrypt with the wrong key. We delete the
        // existing file first (required by openFileOutput) and write directly to
        // the final name — the same keyset is reused on every write to that path.
        val file = File(applicationContext.filesDir, fileName)
        file.delete()
        buildEncryptedFile(fileName).openFileOutput().use { out ->
            out.write(content.toByteArray(Charsets.UTF_8))
        }
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
        try {

            val b64encoded: String = uniffi.zingo.saveToB64()
            if (b64encoded.lowercase().startsWith(ErrorPrefix.value)) {
                Log.e("MAIN", "Error: [Native] Couldn't save the wallet. $b64encoded")
                return false
            }

            val correct = uniffi.zingo.checkB64(b64encoded)
            if (correct == "false") {
                Log.e("MAIN", "Error: [Native] Couldn't save the wallet. The Encoded content is incorrect.")
                return false
            }

            if (b64encoded.isEmpty()) {
                Log.e("MAIN", "[Native] No need to save the wallet.")
                return true
            }

            Log.i("MAIN", "[Native] file size: ${b64encoded.length} chars (Base64)")
            writeEncryptedFile(WalletFileName.value, b64encoded)
            return true
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the wallet. $e")
            return false
        }
    }

    private fun saveWalletBackupFile(): Boolean {
        return try {
            val content = readFileAsB64(WalletFileName.value)
            writeEncryptedFile(WalletBackupFileName.value, content)
            true
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Couldn't save the wallet backup: $e")
            false
        }
    }

    fun saveBackgroundFile(json: String) {
        try {
            val fileBytes = json.toByteArray()
            Log.i("MAIN", "file background size: ${fileBytes.size} bytes")

            // Save file to disk
            writeFile(BackgroundFileName.value, fileBytes)
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the background file")
        }
    }

    @ReactMethod
    fun createNewWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        try {

            // Create a seed
            val resp = uniffi.zingo.initNew(serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            // Log.i("MAIN-Seed", resp)

            if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                saveWalletFile()
            }

            promise.resolve(resp)
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] create new wallet: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            promise.resolve(errorMessage)
        }
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        try {

            val resp = uniffi.zingo.initFromSeed(seed, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            // Log.i("MAIN", resp)

            if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                saveWalletFile()
            }

            promise.resolve(resp)
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] restore wallet from seed: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            promise.resolve(errorMessage)
        }
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        try {

            val resp = uniffi.zingo.initFromUfvk(ufvk, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            // Log.i("MAIN", resp)

            if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                saveWalletFile()
            }

            promise.resolve(resp)
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] restore wallet from ufvk: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            promise.resolve(errorMessage)
        }
}

    @ReactMethod
    fun loadExistingWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        promise.resolve(loadExistingWalletNative(serveruri, chainhint, performancelevel, minconfirmations))
    }

    fun loadExistingWalletNative(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String): String {
        try {
            // Migrate both files from old binary format to encrypted Base64 if needed.
            // Safe to call even if files don't exist or are already migrated.
            migrateFileIfNeeded(WalletFileName.value)
            migrateFileIfNeeded(WalletBackupFileName.value)


            val fileb64 = readFileAsB64(WalletFileName.value)
            Log.i("MAIN", "file size: ${fileb64.length} chars (Base64)")

            val resp = uniffi.zingo.initFromB64(fileb64, serveruri, chainhint, performancelevel, minconfirmations.toUInt())

            return resp
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] load existing wallet: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            return errorMessage
        }
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        try {
            val backup = readFileAsB64(WalletBackupFileName.value)
            if (fileExists(WalletFileName.value)) {
                // Both files exist: swap wallet ↔ backup
                val wallet = readFileAsB64(WalletFileName.value)
                writeEncryptedFile(WalletFileName.value, backup)
                writeEncryptedFile(WalletBackupFileName.value, wallet)
            } else {
                // No wallet exists: restore backup as wallet and delete backup
                writeEncryptedFile(WalletFileName.value, backup)
                deleteFile(WalletBackupFileName.value)
            }
            promise.resolve(true)
        } catch (e: FileNotFoundException) {
            Log.e("MAIN", "Error: [Native] file not found during backup restore", e)
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error during backup restore: $e")
            promise.resolve(false)
        }
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
    fun doSave(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = saveWalletFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] saving wallet: ${e.localizedMessage}"
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
                val resp = saveWalletBackupFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] saving wallet backup: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getLatestBlockServerInfo(serveruri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.getLatestBlockServer(serveruri)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get latest block serveruri: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getLatestBlockWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get latest block wallet: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getDeveloperDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get donation address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getZenniesForZingoDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get Zennies donation address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getValueTransfers()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get value transfers list: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.setCryptoDefaultProviderToRing()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] setting crypto default provider: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.pollSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync poll info: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.runSync()

                if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                    val save = saveWalletFile()
                    if (!save) {
                        val errorMessage = "Error: [Native] sync run process: Couldn't save the wallet."
                        Log.e("MAIN", errorMessage)

                        withContext(Dispatchers.Main) {
                            promise.resolve(errorMessage)
                        }
                    }
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync run process: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.pauseSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync pause process: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.statusSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync status info: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.runRescan()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] rescan run process: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.infoServer()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] server info: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getSeed()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] seed: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getUfvk()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] ufvk: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun changeServerProcess(serveruri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.changeServer(serveruri)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] change serveruri: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.walletKind()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] wallet kind: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.parseAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] parse address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.parseUfvk(ufvk)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] parse ufvk: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getVersion()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] version: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getMessages(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] messages: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getBalance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] balance: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getTotalMemobytesToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] memobyes to address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getTotalValueToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] value to address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getTotalSpendsToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spends to address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.zecPrice(tor)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] zec price: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.removeTransaction(txid)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] remove transaction: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getSpendableBalanceWithAddress(address, zennies)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spendable balance with address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getSpendableBalanceTotal()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spendable balance total: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getOptionWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get option wallet: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.setOptionWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] set option wallet: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.createTorClient(getDocumentDirectory())

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create tor client: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.removeTorClient()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] remove tor client: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getUnifiedAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] unified addresses: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getTransparentAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] transparent addresses: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.createNewUnifiedAddress(receivers)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new unified address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.createNewTransparentAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new transparent address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.checkMyAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new unified address: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getWalletSaveRequired()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet save required: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setConfigWalletToProdProcess(performancelevel: String, minconfirmations: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.setConfigWalletToProd(performancelevel, minconfirmations.toUInt())

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] set wallet config prod: ${e.localizedMessage}"
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
                val resp = uniffi.zingo.getConfigWalletPerformance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet config performance level: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getWalletVersionInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.getWalletVersion()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet version: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun sendProcess(send_json: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.send(send_json)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] send: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun shieldProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.shield()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] shield: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun confirmProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = uniffi.zingo.confirm()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] confirm: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

}
