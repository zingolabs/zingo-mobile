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

    // A legitimate plain-binary wallet (pre-encryption format) starts with a
    // u64-LE serialization version. zingolib currently writes 41; we accept
    // up to 1_000 to leave generous headroom for future formats without
    // risking misdetection of an encrypted envelope's header bytes as a
    // version number. The actual encrypted envelope header (Tink) is
    // essentially random from this check's perspective and reliably falls
    // outside the range — observed in the wild as e.g. 11506714174589491496
    // (0x9FA09A1F94EA5E68) on a Tecno AC8 after Keystore key loss.
    private fun looksLikeLegacyPlainWallet(bytes: ByteArray): Boolean {
        if (bytes.size < 8) return false
        var version = 0L
        for (i in 7 downTo 0) {
            version = (version shl 8) or (bytes[i].toLong() and 0xFFL)
        }
        return version in 0..1000
    }

    // Reads a wallet file as a Base64 string.
    //
    // Primary path: EncryptedFile (Jetpack Security) — the format introduced
    // in Zingo Beta 2.0.21 (313). Fallback path covers the legacy plain-
    // binary format (Zingo Beta ≤ 2.0.21 (312); Zingo ≤ 2.0.20 (309) once
    // the next prod release ships and runs this code for the first time),
    // and is also valid mid-migration when the plain `.migrating` backup has
    // been restored: base64-encode the raw bytes so zingolib sees what it
    // expects.
    //
    // The fallback is ONLY safe when the raw bytes actually ARE a plain
    // wallet. If the file is in the encrypted format but the decryption key
    // is gone (Keystore reset/invalidated, or app data restored from a backup
    // of an old wallet — observed on Tecno HiOS and other devices with
    // quirky AndroidKeystore implementations), the raw bytes are the
    // encrypted envelope. Feeding those to zingolib produced the useless
    // "File error. Failed to read wallet version <huge garbage number>"
    // error reported by users. Distinguish the two via the plain-wallet
    // version-header check; if it fails, surface a clear, actionable error
    // instead of returning corrupted bytes.
    //
    // The IOException message is prefixed with "Error:" so callers that
    // forward `e.localizedMessage` to JS (and the JS-side check that strings
    // starting with "error" are errors) keep working without special-casing.
    private fun readFileAsB64(fileName: String): String {
        try {
            return readEncryptedFile(fileName)
        } catch (encryptedReadError: Exception) {
            val rawBytes = try {
                applicationContext.openFileInput(fileName).use { it.readBytes() }
            } catch (binaryReadError: Exception) {
                throw IOException(
                    "Error: could not read $fileName as encrypted nor as binary: $binaryReadError",
                    encryptedReadError
                )
            }
            if (looksLikeLegacyPlainWallet(rawBytes)) {
                Log.w(
                    "MAIN",
                    "[$fileName] encrypted read failed, using legacy plain fallback: $encryptedReadError"
                )
                return Base64.encodeToString(rawBytes, Base64.NO_WRAP)
            }
            Log.e(
                "MAIN",
                "[$fileName] encrypted read failed AND raw bytes are not a plain wallet — Keystore key likely lost: $encryptedReadError"
            )
            throw IOException(
                "Error: wallet decryption failed and the file is not a legacy plain wallet. " +
                "This usually means the device Keystore was reset, a backup of an old " +
                "wallet was restored, or the OEM Keystore lost its keys. Please restore " +
                "the wallet from your seed phrase or from your Viewing Key (UFVK).",
                encryptedReadError
            )
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

    // Audit Issue P (a) — durable wrapper around writeEncryptedFile.
    //
    // The raw `writeEncryptedFile` deletes the target file before writing
    // (forced by EncryptedFile.openFileOutput which won't overwrite). A
    // crash between the delete and the write leaves the user with no
    // file at the target path — the entire wallet is lost.
    //
    // This wrapper preserves a copy of the previous content at
    // "$fileName.write.tmp" (own keyset, written via a separate
    // writeEncryptedFile call) BEFORE the destructive delete. If a crash
    // lands in the racy window of the inner write, `completePendingWrite`
    // at the next launch detects the temp and restores the original.
    //
    // Cost: one extra read + one extra write per save (≈3× I/O vs the
    // raw call). Saves happen on sync milestones, not on the hot path,
    // so the cost is acceptable. iOS doesn't need this — its `writeFile`
    // uses `String.write(toFile: atomically: true)` which is OS-atomic.
    private fun writeEncryptedFileDurably(fileName: String, content: String) {
        val tempName = "$fileName.write.tmp"
        if (fileExists(fileName)) {
            try {
                val previous = readFileAsB64(fileName)
                writeEncryptedFile(tempName, previous)
            } catch (e: Exception) {
                // Original is unreadable already — saving new content over
                // it can't make things worse. Proceed without temp protection
                // for this single write.
                Log.w("MAIN", "[$fileName] could not stash original to temp; durable write degraded to raw: $e")
            }
        }
        writeEncryptedFile(fileName, content)
        // Best-effort cleanup. If we crash before reaching here,
        // completePendingWrite will see the orphan temp and clean it up
        // (the target file is now valid).
        try {
            File(applicationContext.filesDir, tempName).delete()
        } catch (e: Exception) {
            Log.w("MAIN", "[$tempName] orphan temp cleanup failed: $e")
        }
    }

    // Audit Issue P (a) — durable-write recovery.
    //
    // If `writeEncryptedFileDurably` crashed between the inner delete and
    // the inner write, the target file is missing and a temp file with
    // the original content sits at "$fileName.write.tmp". Restore from
    // the temp. If the target file is already valid, the temp is just a
    // post-write cleanup orphan and gets deleted.
    //
    // Idempotent — no-op when no temp files are present.
    fun completePendingWrite() {
        for (fileName in listOf(WalletFileName.value, WalletBackupFileName.value)) {
            val tempName = "$fileName.write.tmp"
            if (!fileExists(tempName)) continue
            try {
                val targetReadable = fileExists(fileName) && try {
                    readFileAsB64(fileName)
                    true
                } catch (_: Exception) {
                    false
                }
                if (!targetReadable) {
                    // Crash during the inner write — restore original from temp.
                    val tempContent = readFileAsB64(tempName)
                    writeEncryptedFile(fileName, tempContent)
                    Log.i("MAIN", "[Native] completePendingWrite: restored $fileName from $tempName")
                }
                deleteFile(tempName)
            } catch (e: Exception) {
                Log.e("MAIN", "Error: [Native] completePendingWrite for $fileName failed: $e", e)
                // Leave temp in place for diagnosis / next attempt.
            }
        }
    }

    // Audit Issue P (b) — wallet ↔ backup swap recovery.
    //
    // `restoreExistingWalletBackup` does its swap as:
    //   (1) write temp(originalMain)   — preserves the wallet that would
    //                                    otherwise only live in memory
    //   (2) write main(originalBackup)
    //   (3) write backup(originalMain)
    //   (4) delete temp
    // Jetpack Security `EncryptedFile` binds its keyset to the file path,
    // so the iOS atomic-rename pattern doesn't apply on Android: we need
    // to re-encrypt at each new path and recover by content comparison.
    //
    // Possible interrupted states (temp exists with originalMain):
    //   between (1)–(2): main == temp  → write main(backup), write backup(temp)
    //   between (2)–(3): main != temp AND backup != temp → write backup(temp)
    //   between (3)–(4): main != temp AND backup == temp → nothing to write
    // Idempotent — no-op when no temp file is present.
    fun completePendingSwap() {
        val tempFile = java.io.File(applicationContext.filesDir, WalletTempSwapFileName.value)
        if (!tempFile.exists()) return
        try {
            val tempContent = readFileAsB64(WalletTempSwapFileName.value)
            if (fileExists(WalletFileName.value)) {
                val mainContent = readFileAsB64(WalletFileName.value)
                if (mainContent == tempContent) {
                    // (1)–(2) window: main not yet overwritten.
                    if (fileExists(WalletBackupFileName.value)) {
                        val backupContent = readFileAsB64(WalletBackupFileName.value)
                        writeEncryptedFile(WalletFileName.value, backupContent)
                    }
                    writeEncryptedFile(WalletBackupFileName.value, tempContent)
                } else {
                    // (2)–(3) or post-(3) window: main already holds the new content.
                    val backupExists = fileExists(WalletBackupFileName.value)
                    val backupContent = if (backupExists) readFileAsB64(WalletBackupFileName.value) else null
                    if (backupContent != tempContent) {
                        // (2)–(3) window or backup missing — write the lost content.
                        writeEncryptedFile(WalletBackupFileName.value, tempContent)
                    }
                    // else: post-(3), backup already correct.
                }
            } else {
                // Main missing — restore from temp.
                writeEncryptedFile(WalletFileName.value, tempContent)
            }
            deleteFile(WalletTempSwapFileName.value)
            Log.i("MAIN", "[Native] completePendingSwap: interrupted swap recovered")
        } catch (e: Exception) {
            // Leave temp in place for diagnosis / the next attempt — deleting
            // it here would lose the only copy of the original main wallet
            // if we couldn't write it back into position.
            Log.e("MAIN", "Error: [Native] completePendingSwap failed: $e", e)
        }
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        // Check if a wallet already exists.
        // Write recovery runs first: a half-written save can leave main
        // missing, which would make a pending swap unable to read main.
        completePendingWrite()
        completePendingSwap()
        promise.resolve(fileExists(WalletFileName.value))
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        // Check if a wallet backup already exists. See walletExists for
        // why write recovery runs before swap recovery.
        completePendingWrite()
        completePendingSwap()
        promise.resolve(fileExists(WalletBackupFileName.value))
    }

    // The FFI contract is structural (zingo-mobile#1151; audit Issue Q):
    // null means no save was needed, bytes are the wallet export, and
    // failure throws. Nothing here classifies content — a malformed export
    // is unrepresentable, so no validator exists to disagree with the file
    // format, which stays base64 and is encoded only at this write site.
    fun saveWalletFile(): Boolean {
        return try {
            uniffi.zingo.initLogging()

            val walletBytes = uniffi.zingo.saveWalletBytes()
            if (walletBytes == null) {
                Log.i("MAIN", "[Native] No need to save the wallet.")
            } else {
                val b64encoded = Base64.encodeToString(walletBytes, Base64.NO_WRAP)
                Log.i("MAIN", "[Native] file size: ${b64encoded.length} chars (Base64)")
                writeEncryptedFileDurably(WalletFileName.value, b64encoded)
            }
            true
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the wallet. $e")
            false
        }
    }

    private fun saveWalletBackupFile(): Boolean {
        return try {
            val content = readFileAsB64(WalletFileName.value)
            writeEncryptedFileDurably(WalletBackupFileName.value, content)
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
    fun createNewWallet(serveruri: String, birthday: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_new") {
            uniffi.zingo.initLogging()

            // Create a seed. initNew throws on failure, so reaching the save
            // implies the wallet exists. Offline (empty serveruri) uses
            // `birthday` in place of the chain tip; online it is ignored
            // (pass "0").
            val resp = uniffi.zingo.initNew(serveruri, birthday.toUInt(), chainhint, performancelevel, minconfirmations.toUInt())
            saveWalletFile()
            resp
        }
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_from_seed") {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initFromSeed(seed, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            saveWalletFile()
            resp
        }
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_from_ufvk") {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initFromUfvk(ufvk, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            saveWalletFile()
            resp
        }
}

    @ReactMethod
    fun loadExistingWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_from_b64") {
            loadExistingWalletNative(serveruri, chainhint, performancelevel, minconfirmations)
        }
    }

    // Throws on failure; callers own the error channel (a rejected promise
    // here, the worker's catch in BackgroundSyncWorker).
    fun loadExistingWalletNative(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String): String {
        // Migrate both files from old binary format to encrypted Base64 if needed.
        // Safe to call even if files don't exist or are already migrated.
        migrateFileIfNeeded(WalletFileName.value)
        migrateFileIfNeeded(WalletBackupFileName.value)

        uniffi.zingo.initLogging()

        val fileb64 = readFileAsB64(WalletFileName.value)
        Log.i("MAIN", "file size: ${fileb64.length} chars (Base64)")

        return uniffi.zingo.initFromB64(fileb64, serveruri, chainhint, performancelevel, minconfirmations.toUInt())
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        try {
            val backup = readFileAsB64(WalletBackupFileName.value)
            // Check the content is correct before swapping it into place.
            // Stored encoded, so the guard is structural (zingo-mobile#1151).
            if (!WalletBackup.isRestorable(backup)) {
                Log.e("MAIN", "Error: [Native] backup restore: content failed validation")
                promise.resolve(false)
                return
            }
            if (fileExists(WalletFileName.value)) {
                // Audit Issue P (b) — durable swap via temp file. The original
                // main wallet only lives in memory while we overwrite main
                // with backup; a crash before step (3) would lose it. By
                // writing it to temp FIRST (step 1), any later crash leaves a
                // recoverable on-disk copy that `completePendingSwap` can
                // restore on the next launch.
                //
                // Belt-and-braces: recover any orphan temp from a prior crash
                // before starting a new swap — deleting the temp blindly
                // would destroy the only copy of that crash's original main.
                completePendingSwap()
                val wallet = readFileAsB64(WalletFileName.value)
                writeEncryptedFile(WalletTempSwapFileName.value, wallet)   // (1) temp = original main
                writeEncryptedFile(WalletFileName.value, backup)            // (2) main = backup
                writeEncryptedFile(WalletBackupFileName.value, wallet)      // (3) backup = original main
                deleteFile(WalletTempSwapFileName.value)                    // (4) cleanup
            } else {
                // No wallet exists: restore backup as wallet, but KEEP the
                // backup file. Deleting it here left the user with no backup
                // right after a restore, so if they then created/restored a
                // different wallet the just-restored one was gone. Keeping a
                // duplicate copy as backup is far safer than none.
                writeEncryptedFile(WalletFileName.value, backup)
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

    // saveWalletFile/saveWalletBackupFile still contain their own failures
    // as a resolved false (the init flows depend on a save failure not
    // failing the whole init), so these shells resolve that boolean
    // verbatim; only an escaping exception rejects. No outcome is ever
    // re-encoded as prose in the success channel (zingo-mobile#1151).
    @ReactMethod
    fun doSave(promise: Promise) {
        FfiOutcome.settling(promise, "save_wallet_bytes") {
            uniffi.zingo.initLogging()
            saveWalletFile()
        }
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        FfiOutcome.settling(promise, "save_wallet_backup") {
            uniffi.zingo.initLogging()
            saveWalletBackupFile()
        }
    }

    @ReactMethod
    fun getLatestBlockServerInfo(serveruri: String, promise: Promise) {
        FfiOutcome.settling(promise, "get_latest_block_server") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getLatestBlockServer(serveruri)
        }
    }

    @ReactMethod
    fun getLatestBlockWalletInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_latest_block_wallet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getLatestBlockWallet()
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
                uniffi.zingo.initLogging()
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
        FfiOutcome.settling(promise, "get_value_transfers") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getValueTransfers()
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
        FfiOutcome.settling(promise, "poll_sync") {
            uniffi.zingo.initLogging()
            uniffi.zingo.pollSync()
        }
    }

    @ReactMethod
    fun runSyncProcess(promise: Promise) {
        FfiOutcome.settling(promise, "run_sync") {
            uniffi.zingo.initLogging()

            // Persistence is owned by JS (SyncCoordinator → doSave when
            // getWalletSaveRequired returns true). Auto-saving here was
            // racing against that doSave on the same wallet.dat — two
            // Dispatchers.IO threads writing in parallel produced the
            // EncryptedFile "output file already exists" crashes in the
            // logs. Single source of truth for save decisions = JS.
            uniffi.zingo.runSync()
        }
    }

    @ReactMethod
    fun pauseSyncProcess(promise: Promise) {
        FfiOutcome.settling(promise, "pause_sync") {
            uniffi.zingo.initLogging()
            uniffi.zingo.pauseSync()
        }
    }

    @ReactMethod
    fun statusSyncInfo(promise: Promise) {
        FfiOutcome.settling(promise, "status_sync") {
            uniffi.zingo.initLogging()
            uniffi.zingo.statusSync()
        }
    }

    @ReactMethod
    fun runRescanProcess(promise: Promise) {
        FfiOutcome.settling(promise, "run_rescan") {
            uniffi.zingo.initLogging()
            uniffi.zingo.runRescan()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
        FfiOutcome.settling(promise, "get_version") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getVersion()
        }
    }

    @ReactMethod
    fun getMessagesInfo(address: String, promise: Promise) {
        FfiOutcome.settling(promise, "get_messages") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getMessages(address)
        }
    }

    @ReactMethod
    fun getBalanceInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_balance") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getBalance()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
    fun zecPriceInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.zecPrice()

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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
        FfiOutcome.settling(promise, "get_spendable_balance_total") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getSpendableBalanceTotal()
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
                uniffi.zingo.initLogging()
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
    fun getUnifiedAddressesInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_unified_addresses") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getUnifiedAddresses()
        }
    }

    @ReactMethod
    fun getTransparentAddressesInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_transparent_addresses") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getTransparentAddresses()
        }
    }

    // Pre-migration ReactMethod shell: resolves the FFI result, or resolves
    // "Error: ..." prose from the catch. Each caller dies into an
    // FfiOutcome rejection as its TS consumer migrates (zingo-mobile#1151);
    // until then the shell lives once instead of once per method.
    private fun resolveProseOnError(promise: Promise, label: String, call: () -> String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = call()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] $label: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createNewUnifiedAddressProcess(receivers: String, promise: Promise) {
        resolveProseOnError(promise, "create new unified address") {
            uniffi.zingo.createNewUnifiedAddress(receivers)
        }
    }

    @ReactMethod
    fun createNewTransparentAddressProcess(promise: Promise) {
        resolveProseOnError(promise, "create new transparent address") {
            uniffi.zingo.createNewTransparentAddress()
        }
    }

    @ReactMethod
    fun checkMyAddressInfo(address: String, promise: Promise) {
        // The label used to say "create new unified address" — copy-paste
        // rot from the method this shell was cloned from.
        resolveProseOnError(promise, "check my address") {
            uniffi.zingo.checkMyAddress(address)
        }
    }

    @ReactMethod
    fun getWalletSaveRequiredInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_wallet_save_required") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getWalletSaveRequired()
        }
    }

    @ReactMethod
    fun setConfigWalletToProdProcess(performancelevel: String, minconfirmations: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
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
        FfiOutcome.settling(promise, "get_config_wallet_performance") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getConfigWalletPerformance()
        }
    }

    @ReactMethod
    fun getWalletVersionInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_wallet_version") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getWalletVersion()
        }
    }

    @ReactMethod
    fun sendProcess(send_json: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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
                uniffi.zingo.initLogging()
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

    @ReactMethod
    fun drainOrchardToIronwoodProcess(promise: Promise) {
        FfiOutcome.settling(promise, "drain_orchard_to_ironwood") {
            uniffi.zingo.initLogging()
            uniffi.zingo.drainOrchardToIronwood()
        }
    }

}
