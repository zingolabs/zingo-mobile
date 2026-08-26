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

    // The legacy decrypt used only as load recovery. Injectable so a test
    // can replay a transient Keystore failure (DoubleWrapReproTest).
    internal var legacyDecrypt: (String) -> String = { readEncryptedFile(it) }

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

    // Base64 of the plain wallet bytes when the file is decrypted plain.
    private fun writePlainFromB64(fileName: String, contentB64: String) {
        PlainWalletFile.write(
            applicationContext.filesDir,
            fileName,
            Base64.decode(contentB64, Base64.NO_WRAP),
        )
    }

    // Reads a wallet file as a Base64 string: raw plain bytes first (the
    // format every save writes since the encryption removal, and the
    // legacy plain format of Zingo ≤ 2.0.20), then the legacy encrypted
    // formats as recovery only. A successful legacy read migrates the file
    // to plain in the same call; the legacy bytes stay at their path until
    // the verified temp copy renames over them, and a double wrap
    // additionally keeps its original at "$fileName.prerepair".
    //
    // Classification uses the raw bytes, never a trial decrypt (#965), so
    // a transient Keystore failure can only fail this read and the next
    // launch retries from unchanged bytes.
    //
    // A thrown IOException here is outside the FFI's typed family, so a
    // bridge caller rejects it under the "Unknown" code; the message text
    // is the user-actionable diagnosis.
    private fun readFileAsB64(fileName: String): String {
        val filesDir = applicationContext.filesDir
        PlainWalletFile.resolveInterruptedMigration(filesDir, fileName)
        PlainWalletFile.readIfPlain(filesDir, fileName)?.let {
            return Base64.encodeToString(it, Base64.NO_WRAP)
        }
        val file = File(filesDir, fileName)
        if (!file.exists()) {
            throw FileNotFoundException("Error: $fileName does not exist")
        }
        val payload = try {
            Base64.decode(legacyDecrypt(fileName), Base64.NO_WRAP)
        } catch (decryptError: Exception) {
            Log.e(
                "MAIN",
                "[$fileName] not a plain wallet and decryption failed, Keystore key likely lost: $decryptError"
            )
            throw IOException(
                "Error: wallet decryption failed and the file is not a plain wallet. " +
                "This usually means the device Keystore was reset, a backup of an old " +
                "wallet was restored, or the OEM Keystore lost its keys. Please restore " +
                "the wallet from your seed phrase or from your Viewing Key (UFVK).",
                decryptError
            )
        }
        val plain = when (WalletFileEnvelope.classify(payload)) {
            WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> payload
            WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> {
                val unwrapErrors = mutableListOf<String>()
                val unwrapped = unwrapToPlainWallet(fileName, payload, unwrapErrors)
                    ?: throw IOException(
                        "Error: $fileName is wrapped in envelopes that could not be " +
                        "removed ($unwrapErrors). Please restore the wallet from your " +
                        "seed phrase or from your Viewing Key (UFVK)."
                    )
                file.copyTo(File(filesDir, "$fileName.prerepair"), overwrite = true)
                Log.i("MAIN", "[$fileName] removed ${unwrapped.second} extra envelope layer(s)")
                unwrapped.first
            }
            WalletFileEnvelope.PayloadKind.UNKNOWN ->
                throw IOException(
                    "Error: the decrypted content of $fileName is not a wallet. Please " +
                    "restore the wallet from your seed phrase or from your Viewing Key (UFVK)."
                )
        }
        try {
            PlainWalletFile.write(filesDir, fileName, plain)
            Log.i("MAIN", "[$fileName] migrated to plain wallet bytes")
        } catch (writeError: Exception) {
            Log.e("MAIN", "[$fileName] migration to plain failed, retrying at the next load: $writeError")
        }
        return Base64.encodeToString(plain, Base64.NO_WRAP)
    }

    // Recovery for the legacy durable write (audit Issue P (a)): its
    // delete-then-write could crash with the wallet only at
    // "$fileName.write.tmp", so an unreadable target restores from the
    // temp (as plain bytes now) and a readable one drops the orphan.
    // Idempotent, a no-op when no temp files are present.
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
                    val tempContent = readFileAsB64(tempName)
                    writePlainFromB64(fileName, tempContent)
                    Log.i("MAIN", "[Native] completePendingWrite: restored $fileName from $tempName")
                }
                deleteFile(tempName)
            } catch (e: Exception) {
                Log.e("MAIN", "[Native] completePendingWrite for $fileName failed: $e", e)
                // Leave temp in place for diagnosis / next attempt.
            }
        }
    }

    // Wallet and retained-wallet swap recovery (audit Issue P (b)). The
    // swap in `restoreExistingWalletBackup` runs as:
    //   (1) write temp(originalMain)
    //   (2) write main(originalBackup)
    //   (3) write backup(originalMain)
    //   (4) delete temp
    // Recovery goes by content comparison, and `readFileAsB64` levels the
    // formats: the temp may be a legacy encrypted file from an old release
    // or plain bytes from the current one.
    //
    // Possible interrupted states (temp exists with originalMain):
    //   between (1)–(2): main == temp  → write main(backup), write backup(temp)
    //   between (2)–(3): main != temp AND backup != temp → write backup(temp)
    //   between (3)–(4): main != temp AND backup == temp → nothing to write
    // Idempotent, a no-op when no temp file is present.
    fun completePendingSwap() {
        val tempFile = File(applicationContext.filesDir, WalletTempSwapFileName.value)
        if (!tempFile.exists()) return
        try {
            val tempContent = readFileAsB64(WalletTempSwapFileName.value)
            if (fileExists(WalletFileName.value)) {
                val mainContent = readFileAsB64(WalletFileName.value)
                if (mainContent == tempContent) {
                    // (1)–(2) window: main not yet overwritten.
                    if (fileExists(WalletBackupFileName.value)) {
                        val backupContent = readFileAsB64(WalletBackupFileName.value)
                        writePlainFromB64(WalletFileName.value, backupContent)
                    }
                    writePlainFromB64(WalletBackupFileName.value, tempContent)
                } else {
                    // (2)–(3) or post-(3) window: main already holds the new content.
                    val backupExists = fileExists(WalletBackupFileName.value)
                    val backupContent = if (backupExists) readFileAsB64(WalletBackupFileName.value) else null
                    if (backupContent != tempContent) {
                        // (2)–(3) window or backup missing: write the lost content.
                        writePlainFromB64(WalletBackupFileName.value, tempContent)
                    }
                    // else: post-(3), backup already correct.
                }
            } else {
                // Main missing: restore from temp.
                writePlainFromB64(WalletFileName.value, tempContent)
            }
            deleteFile(WalletTempSwapFileName.value)
            Log.i("MAIN", "[Native] completePendingSwap: interrupted swap recovered")
        } catch (e: Exception) {
            // The temp can hold the only copy of the original main wallet,
            // so it stays in place for diagnosis and the next attempt.
            Log.e("MAIN", "[Native] completePendingSwap failed: $e", e)
        }
    }

    private fun resolvePendingWalletFiles() {
        // Migration resolution runs first so a device stalled with only a
        // `.migrating` copy answers "exists". Write recovery runs before
        // swap recovery: a half-written save can leave main missing, which
        // would make a pending swap unable to read main.
        for (fileName in listOf(WalletFileName.value, WalletBackupFileName.value)) {
            PlainWalletFile.resolveInterruptedMigration(applicationContext.filesDir, fileName)
        }
        completePendingWrite()
        completePendingSwap()
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        resolvePendingWalletFiles()
        promise.resolve(fileExists(WalletFileName.value))
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        resolvePendingWalletFiles()
        promise.resolve(fileExists(WalletBackupFileName.value))
    }

    // The FFI contract is structural (zingo-mobile#1151; audit Issue Q):
    // null means no save was needed, bytes are the wallet export, and
    // failure throws. The export lands on disk verbatim, so the file is
    // byte-identical to a desktop zingolib wallet.
    fun saveWalletFile(): Boolean {
        return try {
            uniffi.zingo.initLogging()

            val walletBytes = uniffi.zingo.saveWalletBytes()
            if (walletBytes == null) {
                Log.i("MAIN", "[Native] No need to save the wallet.")
            } else {
                Log.i("MAIN", "[Native] file size: ${walletBytes.size} bytes")
                PlainWalletFile.write(applicationContext.filesDir, WalletFileName.value, walletBytes)
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
            writePlainFromB64(WalletBackupFileName.value, content)
            true
        } catch (e: Exception) {
            Log.e("MAIN", "[Native] Couldn't save the wallet backup: $e")
            false
        }
    }

    // Wallet-file diagnosis and the double-wrap repair. Support tooling for
    // the 2.0.21 incident: the migration of that release re-wrapped an
    // already encrypted file after a transient Keystore failure, and
    // zingolib then reported "Failed to read wallet version <huge number>".

    // Includes each .migrating twin, a plain copy that flags an interrupted migration, but not the encrypted .prerepair/.broken copies that would only read as undecryptable.
    private fun walletFileNames(): List<String> =
        listOf(WalletFileName.value, WalletBackupFileName.value).flatMap {
            listOf(it, "$it.write.tmp", "$it.migrating")
        } + WalletTempSwapFileName.value

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
    private fun unwrapToPlainWallet(
        fileName: String,
        payload: ByteArray,
        errors: MutableList<String>? = null,
    ): Pair<ByteArray, Int>? {
        var bytes = payload
        for (depth in 0..WalletFileEnvelope.MAX_UNWRAP_DEPTH) {
            when (WalletFileEnvelope.classify(bytes)) {
                WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> return Pair(bytes, depth)
                WalletFileEnvelope.PayloadKind.UNKNOWN -> {
                    errors?.add("depth $depth: payload is neither a wallet nor a Tink envelope")
                    return null
                }
                WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> {
                    if (depth == WalletFileEnvelope.MAX_UNWRAP_DEPTH) {
                        errors?.add("still an envelope after ${WalletFileEnvelope.MAX_UNWRAP_DEPTH} layers")
                        return null
                    }
                    bytes = try {
                        unwrapEnvelope(fileName, bytes)
                    } catch (e: Exception) {
                        Log.w("MAIN", "[$fileName] unwrap at depth $depth failed: $e")
                        errors?.add("depth $depth: $e")
                        return null
                    }
                }
            }
        }
        return null
    }

    internal fun decryptedPayload(fileName: String): ByteArray =
        Base64.decode(legacyDecrypt(fileName), Base64.NO_WRAP)

    private fun fileHeadHex(file: File): String =
        file.inputStream().use { input ->
            val head = ByteArray(16)
            val n = input.read(head)
            (0 until maxOf(n, 0)).joinToString("") { "%02x".format(head[it]) }
        }

    // state: missing | plainWallet | encryptedLegacy | doubleWrapped | undecryptable | unknown
    internal fun diagnoseWalletFile(fileName: String): JSONObject {
        val file = File(applicationContext.filesDir, fileName)
        val report = JSONObject()
            .put("name", fileName)
            .put("size", if (file.exists()) file.length() else 0)
            .put("mtime", if (file.exists()) file.lastModified() else 0)
            .put("depth", 0)
            .put("repairable", false)
        if (!file.exists()) return report.put("state", "missing")
        report.put("head", fileHeadHex(file))
        if (PlainWalletFile.readIfPlain(applicationContext.filesDir, fileName) != null) {
            return report.put("state", "plainWallet")
        }
        val payload = try {
            decryptedPayload(fileName)
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] diagnosis: encrypted read failed: $e")
            return report.put("readError", e.toString()).put("state", "undecryptable")
        }
        return when (WalletFileEnvelope.classify(payload)) {
            WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> report.put("state", "encryptedLegacy")
            WalletFileEnvelope.PayloadKind.UNKNOWN -> report.put("state", "unknown")
            WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> {
                val unwrapErrors = mutableListOf<String>()
                val unwrapped = unwrapToPlainWallet(fileName, payload, unwrapErrors)
                report.put("state", "doubleWrapped")
                    .put("repairable", unwrapped != null)
                    .put("depth", unwrapped?.second ?: 0)
                    .put("unwrapErrors", JSONArray(unwrapErrors))
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
    // original name), and the repaired file holds plain wallet bytes.
    internal fun repairDoubleWrappedFile(fileName: String): String {
        val filesDir = applicationContext.filesDir
        val file = File(filesDir, fileName)
        if (!file.exists()) return "skipped"
        if (PlainWalletFile.readIfPlain(filesDir, fileName) != null) return "skipped"
        val payload = try {
            decryptedPayload(fileName)
        } catch (e: Exception) {
            Log.w("MAIN", "[$fileName] repair: encrypted read failed, nothing to unwrap: $e")
            return "skipped"
        }
        if (WalletFileEnvelope.classify(payload) != WalletFileEnvelope.PayloadKind.TINK_ENVELOPE) return "skipped"
        val unwrapped = unwrapToPlainWallet(fileName, payload) ?: return "failed"
        return try {
            file.copyTo(File(filesDir, "$fileName.prerepair"), overwrite = true)
            PlainWalletFile.write(filesDir, fileName, unwrapped.first)
            val verified = PlainWalletFile.readIfPlain(filesDir, fileName) != null
            Log.i("MAIN", "[$fileName] repair: removed ${unwrapped.second} layer(s), verified=$verified")
            if (verified) "repaired" else "failed"
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] repair: rewrite failed: $e")
            "failed"
        }
    }

    // Salvages seed and birthday from the raw bytes of the closed wallet
    // file and keeps the damaged bytes at "$fileName.broken".
    internal fun walletFileRecoveryInfoNative(): String {
        val file = File(applicationContext.filesDir, WalletFileName.value)
        val salvaged = uniffi.zingo.readWalletRecoveryInfo(file.readBytes())
        file.copyTo(File(applicationContext.filesDir, "${WalletFileName.value}.broken"), overwrite = true)
        return salvaged
    }

    @ReactMethod
    fun walletFileRecoveryInfo(promise: Promise) {
        FfiOutcome.settling(promise, "read_wallet_recovery_info") {
            uniffi.zingo.initLogging()
            walletFileRecoveryInfoNative()
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
                // Durable swap via temp file (audit Issue P (b)): the temp
                // copy written at step (1) is what `completePendingSwap`
                // restores after a crash before step (3).
                //
                // Recover any orphan temp from a prior crash before starting
                // a new swap: it can hold the only copy of that crash's
                // original main.
                completePendingSwap()
                val wallet = try {
                    readFileAsB64(WalletFileName.value)
                } catch (e: Exception) {
                    // Keep the unreadable main's raw bytes aside and restore the backup into both slots.
                    Log.w("MAIN", "[Native] backup restore: main unreadable, preserving raw and restoring backup: $e")
                    File(applicationContext.filesDir, WalletFileName.value)
                        .copyTo(File(applicationContext.filesDir, "${WalletFileName.value}.broken"), overwrite = true)
                    writePlainFromB64(WalletFileName.value, backup)
                    promise.resolve(true)
                    return
                }
                writePlainFromB64(WalletTempSwapFileName.value, wallet)   // (1) temp = original main
                writePlainFromB64(WalletFileName.value, backup)           // (2) main = backup
                writePlainFromB64(WalletBackupFileName.value, wallet)     // (3) backup = original main
                deleteFile(WalletTempSwapFileName.value)                  // (4) cleanup
            } else {
                // No wallet exists: restore backup as wallet, but KEEP the
                // backup file. Deleting it here left the user with no backup
                // right after a restore, so if they then created/restored a
                // different wallet the just-restored one was gone. Keeping a
                // duplicate copy as backup is far safer than none.
                writePlainFromB64(WalletFileName.value, backup)
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
