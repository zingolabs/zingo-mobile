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
import org.json.JSONArray
import org.json.JSONObject
import org.ZingoLabs.Zingo.Constants.*

class RPCModule internal constructor(private val reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    private val applicationContext: Context = reactContext?.applicationContext ?: MainApplication.getAppContext()!!

    override fun getName(): String {
        return "RPCModule"
    }

    private fun getDocumentDirectory(): String {
        return applicationContext.filesDir.absolutePath
    }

    private fun buildEncryptedFile(fileName: String): EncryptedFile =
        buildEncryptedFile(File(applicationContext.filesDir, fileName))

    // The keyset is one per app; the file *name* is the AAD, so a file with
    // the same name in another directory decrypts with the same keyset.
    private fun buildEncryptedFile(file: File): EncryptedFile {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(
            file,
            applicationContext,
            masterKeyAlias,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB,
        ).build()
    }

    // The migration's trial decrypt ("is this file already encrypted?").
    // Injectable so a test can replay a transient Keystore failure
    // (DoubleWrapReproTest).
    internal var migrationTrialDecrypt: (String) -> Unit = { fileName ->
        buildEncryptedFile(fileName).openFileInput().use { it.readBytes() }
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
            migrationTrialDecrypt(fileName)
            true
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] migration: trial decrypt failed: $e")
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

        // A trial decrypt can fail transiently (Keystore unavailable) on a file
        // that is already encrypted. Wrapping that envelope again would bury
        // the wallet under two layers, so only a plain wallet migrates.
        if (!WalletFileEnvelope.looksLikePlainWallet(oldBytes)) {
            Log.e("MAIN", "[$fileName] migration: file is not a plain wallet, refusing to migrate")
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

    private fun looksLikeLegacyPlainWallet(bytes: ByteArray): Boolean =
        WalletFileEnvelope.looksLikePlainWallet(bytes)

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
    // A thrown IOException here is outside the FFI's typed family, so a
    // bridge caller rejects it under the "Unknown" code; the message text
    // is the user-actionable diagnosis.
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
                Log.e("MAIN", "[Native] completePendingWrite for $fileName failed: $e", e)
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
            Log.e("MAIN", "[Native] completePendingSwap failed: $e", e)
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
            Log.e("MAIN", "[Native] Unexpected error. Couldn't save the wallet. $e")
            false
        }
    }

    private fun saveWalletBackupFile(): Boolean {
        return try {
            val content = readFileAsB64(WalletFileName.value)
            writeEncryptedFileDurably(WalletBackupFileName.value, content)
            true
        } catch (e: Exception) {
            Log.e("MAIN", "[Native] Couldn't save the wallet backup: $e")
            false
        }
    }

    // Wallet-file diagnosis and the double-wrap repair. Support tooling for
    // the 2.0.21 incident: `migrateFileIfNeeded` re-wrapped an already
    // encrypted file after a transient Keystore failure, and zingolib then
    // reported "Failed to read wallet version <huge number>".

    private fun walletFileNames(): List<String> =
        listOf(WalletFileName.value, WalletBackupFileName.value).flatMap {
            listOf(it, "$it.write.tmp")
        }

    // The outer layer stored the base64 text of an inner envelope. The inner
    // envelope goes under the same file name in a scratch dir, because the
    // name is the AAD.
    private fun unwrapEnvelope(fileName: String, envelope: ByteArray): ByteArray {
        val scratchDir = File(applicationContext.cacheDir, "wallet-unwrap").apply { mkdirs() }
        val scratch = File(scratchDir, fileName)
        try {
            scratch.delete()
            scratch.writeBytes(envelope)
            val text = buildEncryptedFile(scratch).openFileInput().use { it.readBytes() }
            return Base64.decode(text, Base64.NO_WRAP)
        } finally {
            scratch.delete()
        }
    }

    // Peels nested envelopes until a plain wallet appears, at most
    // MAX_UNWRAP_DEPTH layers. Returns the plain bytes and the layers removed.
    private fun unwrapToPlainWallet(fileName: String, payload: ByteArray): Pair<ByteArray, Int>? {
        var bytes = payload
        for (depth in 0..WalletFileEnvelope.MAX_UNWRAP_DEPTH) {
            when (WalletFileEnvelope.classify(bytes)) {
                WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> return Pair(bytes, depth)
                WalletFileEnvelope.PayloadKind.UNKNOWN -> return null
                WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> bytes = try {
                    unwrapEnvelope(fileName, bytes)
                } catch (e: Exception) {
                    Log.w("MAIN", "[$fileName] unwrap at depth $depth failed: $e")
                    return null
                }
            }
        }
        return null
    }

    internal fun decryptedPayload(fileName: String): ByteArray =
        Base64.decode(readEncryptedFile(fileName), Base64.NO_WRAP)

    // state: missing | plainLegacy | undecryptable | plainWallet | doubleWrapped | unknown
    internal fun diagnoseWalletFile(fileName: String): JSONObject {
        val file = File(applicationContext.filesDir, fileName)
        val report = JSONObject()
            .put("name", fileName)
            .put("size", if (file.exists()) file.length() else 0)
            .put("depth", 0)
            .put("repairable", false)
        if (!file.exists()) return report.put("state", "missing")
        val payload = try {
            decryptedPayload(fileName)
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] diagnosis: encrypted read failed: $e")
            val raw = file.readBytes()
            return report.put("state", if (looksLikeLegacyPlainWallet(raw)) "plainLegacy" else "undecryptable")
        }
        return when (WalletFileEnvelope.classify(payload)) {
            WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> report.put("state", "plainWallet")
            WalletFileEnvelope.PayloadKind.UNKNOWN -> report.put("state", "unknown")
            WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> {
                val unwrapped = unwrapToPlainWallet(fileName, payload)
                report.put("state", "doubleWrapped")
                    .put("repairable", unwrapped != null)
                    .put("depth", unwrapped?.second ?: 0)
            }
        }
    }

    @ReactMethod
    fun walletFileDiagnosisInfo(promise: Promise) {
        FfiOutcome.settling(promise, "wallet_file_diagnosis") {
            val files = JSONArray()
            for (name in walletFileNames()) {
                files.put(
                    try {
                        diagnoseWalletFile(name)
                    } catch (e: Exception) {
                        Log.e("MAIN", "[$name] diagnosis failed: $e")
                        JSONObject().put("name", name).put("state", "unknown")
                            .put("size", 0).put("depth", 0).put("repairable", false)
                    }
                )
            }
            JSONObject().put("files", files).toString()
        }
    }

    // Outcome per file: repaired | skipped | failed. The untouched original
    // stays at "$fileName.prerepair" (raw copy, decryptable only under the
    // original name).
    internal fun repairDoubleWrappedFile(fileName: String): String {
        val file = File(applicationContext.filesDir, fileName)
        if (!file.exists()) return "skipped"
        val payload = try {
            decryptedPayload(fileName)
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] repair: encrypted read failed, nothing to unwrap: $e")
            return "skipped"
        }
        if (WalletFileEnvelope.classify(payload) != WalletFileEnvelope.PayloadKind.TINK_ENVELOPE) return "skipped"
        val unwrapped = unwrapToPlainWallet(fileName, payload) ?: return "failed"
        return try {
            file.copyTo(File(applicationContext.filesDir, "$fileName.prerepair"), overwrite = true)
            writeEncryptedFileDurably(fileName, Base64.encodeToString(unwrapped.first, Base64.NO_WRAP))
            val verified = WalletFileEnvelope.classify(decryptedPayload(fileName)) ==
                WalletFileEnvelope.PayloadKind.PLAIN_WALLET
            Log.i("MAIN", "[$fileName] repair: removed ${unwrapped.second} layer(s), verified=$verified")
            if (verified) "repaired" else "failed"
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] repair: rewrite failed: $e")
            "failed"
        }
    }

    @ReactMethod
    fun repairDoubleWrappedWalletProcess(promise: Promise) {
        FfiOutcome.settling(promise, "repair_double_wrapped_wallet") {
            val outcome = JSONObject()
            for (name in listOf(WalletFileName.value, WalletBackupFileName.value)) {
                outcome.put(name, repairDoubleWrappedFile(name))
            }
            outcome.toString()
        }
    }

    fun saveBackgroundFile(json: String) {
        try {
            val fileBytes = json.toByteArray()
            Log.i("MAIN", "file background size: ${fileBytes.size} bytes")

            // Save file to disk
            writeFile(BackgroundFileName.value, fileBytes)
        } catch (e: Exception) {
            Log.e("MAIN", "[Native] Unexpected error. Couldn't save the background file")
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
                Log.e("MAIN", "[Native] backup restore: content failed validation")
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
            Log.e("MAIN", "[Native] file not found during backup restore", e)
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e("MAIN", "[Native] Unexpected error during backup restore: $e")
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
        FfiOutcome.settling(promise, "get_developer_donation_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getDeveloperDonationAddress()
        }
    }

    @ReactMethod
    fun getZenniesDonationAddress(promise: Promise) {
        FfiOutcome.settling(promise, "get_zennies_for_zingo_donation_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getZenniesForZingoDonationAddress()
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
        FfiOutcome.settling(promise, "set_crypto_default_provider_to_ring") {
            uniffi.zingo.initLogging()
            uniffi.zingo.setCryptoDefaultProviderToRing()
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
        FfiOutcome.settling(promise, "info_server") {
            uniffi.zingo.initLogging()
            uniffi.zingo.infoServer()
        }
    }

    @ReactMethod
    fun getSeedInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_seed") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getSeed()
        }
    }

    @ReactMethod
    fun getUfvkInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_ufvk") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getUfvk()
        }
    }

    @ReactMethod
    fun changeServerProcess(serveruri: String, promise: Promise) {
        FfiOutcome.settling(promise, "change_server") {
            uniffi.zingo.initLogging()
            uniffi.zingo.changeServer(serveruri)
        }
    }

    @ReactMethod
    fun walletKindInfo(promise: Promise) {
        FfiOutcome.settling(promise, "wallet_kind") {
            uniffi.zingo.initLogging()
            uniffi.zingo.walletKind()
        }
    }

    @ReactMethod
    fun parseAddressInfo(address: String, promise: Promise) {
        FfiOutcome.settling(promise, "parse_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.parseAddress(address)
        }
    }

    @ReactMethod
    fun parseUfvkInfo(ufvk: String, promise: Promise) {
        FfiOutcome.settling(promise, "parse_ufvk") {
            uniffi.zingo.initLogging()
            uniffi.zingo.parseUfvk(ufvk)
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
        FfiOutcome.settling(promise, "get_total_memobytes_to_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getTotalMemobytesToAddress()
        }
    }

    @ReactMethod
    fun getTotalValueToAddressInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_total_value_to_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getTotalValueToAddress()
        }
    }

    @ReactMethod
    fun getTotalSpendsToAddressInfo(promise: Promise) {
        FfiOutcome.settling(promise, "get_total_spends_to_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getTotalSpendsToAddress()
        }
    }

    @ReactMethod
    fun zecPriceInfo(promise: Promise) {
        FfiOutcome.settling(promise, "zec_price") {
            uniffi.zingo.initLogging()
            uniffi.zingo.zecPrice()
        }
    }

    @ReactMethod
    fun removeTransactionProcess(txid: String, promise: Promise) {
        FfiOutcome.settling(promise, "remove_transaction") {
            uniffi.zingo.initLogging()
            uniffi.zingo.removeTransaction(txid)
        }
    }

    // Mixnet Mode (send-over-nym). Out-of-band error settlement per
    // FfiOutcome (zingo-mobile#1151, audit Issues Q and R): the resolved
    // value is always data, a typed ZingolibException rejects, and nothing
    // is ever encoded as error prose inside the success channel.

    @ReactMethod
    fun setBroadcastCandidates(candidatesJson: String, promise: Promise) {
        FfiOutcome.settling(promise, "set_broadcast_candidates") {
            uniffi.zingo.setBroadcastCandidates(candidatesJson)
        }
    }

    @ReactMethod
    fun attachMixnet(socks5Addr: String, exitNode: String, promise: Promise) {
        FfiOutcome.settling(promise, "attach_mixnet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.attachMixnet(socks5Addr, exitNode)
        }
    }

    @ReactMethod
    fun enableMixnet(proxyPath: String, promise: Promise) {
        FfiOutcome.settling(promise, "enable_mixnet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.enableMixnet(proxyPath)
        }
    }

    @ReactMethod
    fun disableMixnet(promise: Promise) {
        FfiOutcome.settling(promise, "disable_mixnet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.disableMixnet()
        }
    }

    @ReactMethod
    fun mixnetIndicatorInfo(promise: Promise) {
        FfiOutcome.settling(promise, "mixnet_indicator") {
            uniffi.zingo.initLogging()
            uniffi.zingo.mixnetIndicator()
        }
    }

    @ReactMethod
    fun mixnetBootstrapDetailInfo(promise: Promise) {
        FfiOutcome.settling(promise, "mixnet_bootstrap_detail") {
            uniffi.zingo.initLogging()
            uniffi.zingo.mixnetBootstrapDetail()
        }
    }

    @ReactMethod
    fun getSpendableBalanceWithAddressInfo(address: String, zennies: String, promise: Promise) {
        FfiOutcome.settling(promise, "get_spendable_balance_with_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getSpendableBalanceWithAddress(address, zennies)
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
        FfiOutcome.settling(promise, "get_option_wallet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.getOptionWallet()
        }
    }

    @ReactMethod
    fun setOptionWalletProcess(promise: Promise) {
        FfiOutcome.settling(promise, "set_option_wallet") {
            uniffi.zingo.initLogging()
            uniffi.zingo.setOptionWallet()
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

    @ReactMethod
    fun createNewUnifiedAddressProcess(receivers: String, promise: Promise) {
        FfiOutcome.settling(promise, "create_new_unified_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.createNewUnifiedAddress(receivers)
        }
    }

    @ReactMethod
    fun createNewTransparentAddressProcess(promise: Promise) {
        FfiOutcome.settling(promise, "create_new_transparent_address") {
            uniffi.zingo.initLogging()
            uniffi.zingo.createNewTransparentAddress()
        }
    }

    @ReactMethod
    fun checkMyAddressInfo(address: String, promise: Promise) {
        FfiOutcome.settling(promise, "check_my_address") {
            uniffi.zingo.initLogging()
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
        FfiOutcome.settling(promise, "set_config_wallet_to_prod") {
            uniffi.zingo.initLogging()
            uniffi.zingo.setConfigWalletToProd(performancelevel, minconfirmations.toUInt())
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
        FfiOutcome.settling(promise, "send") {
            uniffi.zingo.initLogging()
            uniffi.zingo.send(send_json)
        }
    }

    @ReactMethod
    fun shieldProcess(promise: Promise) {
        FfiOutcome.settling(promise, "shield") {
            uniffi.zingo.initLogging()
            uniffi.zingo.shield()
        }
    }

    @ReactMethod
    fun confirmProcess(promise: Promise) {
        FfiOutcome.settling(promise, "confirm") {
            uniffi.zingo.initLogging()
            uniffi.zingo.confirm()
        }
    }

    @ReactMethod
    fun planOrchardDrainProcess(promise: Promise) {
        FfiOutcome.settling(promise, "plan_orchard_drain") {
            uniffi.zingo.initLogging()
            uniffi.zingo.planOrchardDrain()
        }
    }

    @ReactMethod
    fun drainOrchardProcess(promise: Promise) {
        FfiOutcome.settling(promise, "drain_orchard_to_ironwood") {
            uniffi.zingo.initLogging()
            uniffi.zingo.drainOrchardToIronwood()
        }
    }

    // Polled concurrently while drainOrchardProcess runs. settling launches on
    // Dispatchers.IO (a thread pool), so it does not queue behind the in-flight
    // drain; the native drainStatus() reads a side channel, never the
    // lightclient lock the drain holds, so the poll returns immediately.
    @ReactMethod
    fun drainStatusProcess(promise: Promise) {
        FfiOutcome.settling(promise, "drain_status") {
            uniffi.zingo.drainStatus()
        }
    }

    @ReactMethod
    fun planIronwoodMigrationProcess(promise: Promise) {
        FfiOutcome.settling(promise, "plan_ironwood_migration") {
            uniffi.zingo.initLogging()
            uniffi.zingo.planIronwoodMigration()
        }
    }

    // `perBucket` crosses the bridge as a string (the module's numeric-arg
    // convention); empty means "keep zingolib's default cadence", and a
    // malformed value rejects as InvalidInput, matching the iOS bridge.
    @ReactMethod
    fun startIronwoodMigrationProcess(planHashHex: String, perBucket: String, promise: Promise) {
        FfiOutcome.settling(promise, "start_ironwood_migration") {
            uniffi.zingo.initLogging()
            uniffi.zingo.startIronwoodMigration(
                planHashHex,
                FfiArgs.optionalU32(perBucket, "per_bucket")
            )
        }
    }

    // Proves and broadcasts one splitting round, so like the drain it runs
    // long and holds the lightclient; settling launches on Dispatchers.IO,
    // which keeps it off the main queue and lets status polls through.
    @ReactMethod
    fun continueNoteSplittingProcess(promise: Promise) {
        FfiOutcome.settling(promise, "continue_note_splitting") {
            uniffi.zingo.initLogging()
            uniffi.zingo.continueNoteSplitting()
        }
    }

    // Phase 1 splitting round (ADR 0016). Proves and broadcasts, so like the
    // drain it runs long and holds the lightclient; settling launches on
    // Dispatchers.IO, which keeps it off the main queue and lets status polls
    // through.
    @ReactMethod
    fun quickSplitProcess(promise: Promise) {
        FfiOutcome.settling(promise, "quick_split") {
            uniffi.zingo.initLogging()
            uniffi.zingo.quickSplit()
        }
    }

    // Polled concurrently while quickSplitProcess runs; the native splitStatus()
    // reads a side channel, never the lightclient lock the round holds, so the
    // poll returns immediately.
    @ReactMethod
    fun splitStatusProcess(promise: Promise) {
        FfiOutcome.settling(promise, "split_status") {
            uniffi.zingo.splitStatus()
        }
    }

    @ReactMethod
    fun reschedulePartsProcess(perBucket: String, promise: Promise) {
        FfiOutcome.settling(promise, "reschedule_parts") {
            uniffi.zingo.initLogging()
            uniffi.zingo.rescheduleParts(FfiArgs.requiredU32(perBucket, "per_bucket"))
        }
    }

    @ReactMethod
    fun migrationStatusProcess(promise: Promise) {
        FfiOutcome.settling(promise, "migration_status") {
            uniffi.zingo.migrationStatus()
        }
    }

    @ReactMethod
    fun windowTimelineProcess(promise: Promise) {
        FfiOutcome.settling(promise, "window_timeline") {
            uniffi.zingo.windowTimeline()
        }
    }

    @ReactMethod
    fun reconcileMigrationProcess(promise: Promise) {
        FfiOutcome.settling(promise, "reconcile_migration") {
            uniffi.zingo.initLogging()
            uniffi.zingo.reconcileMigration()
        }
    }

    // Phase-2 execute tap: sends the scheduled migration's due batch. Long-
    // running (prove + broadcast) like drainOrchardProcess, so settling's
    // Dispatchers.IO launch applies; `spacingMs` crosses as a string (the
    // module's numeric-arg convention) — the delay sequenced between the
    // batch's sends.
    @ReactMethod
    fun executeDuePartsProcess(spacingMs: String, promise: Promise) {
        FfiOutcome.settling(promise, "execute_due_parts") {
            uniffi.zingo.initLogging()
            uniffi.zingo.executeDueParts(FfiArgs.requiredU64(spacingMs, "spacing_ms"))
        }
    }

    // Polled concurrently while executeDuePartsProcess runs; the native
    // executeDuePartsStatus() reads a side channel, never the lightclient lock
    // the batch holds, so the poll returns immediately.
    @ReactMethod
    fun executeDuePartsStatusProcess(promise: Promise) {
        FfiOutcome.settling(promise, "execute_due_parts_status") {
            uniffi.zingo.executeDuePartsStatus()
        }
    }

    @ReactMethod
    fun cancelIronwoodMigrationProcess(promise: Promise) {
        FfiOutcome.settling(promise, "cancel_ironwood_migration") {
            uniffi.zingo.initLogging()
            uniffi.zingo.cancelIronwoodMigration()
        }
    }

}
