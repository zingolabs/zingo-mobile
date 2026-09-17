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
import uniffi.zingo.Connection
import uniffi.zingo.Wallet
import uniffi.zingo.currentWallet
import uniffi.zingo.validateWalletBytes
import uniffi.zingo.walletRecoveryInfo

class RPCModule internal constructor(private val reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    private val applicationContext: Context = reactContext?.applicationContext ?: MainApplication.getAppContext()!!

    override fun getName(): String {
        return "RPCModule"
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

    companion object {
        // Set by delete and restore, cleared by the next successful wallet
        // init: a stray save of the in-memory wallet must not resurrect a
        // file the user replaced.
        @Volatile
        internal var walletFileClosed = false
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

    // The full zingolib parse behind every destructive file decision.
    private fun isIntactWallet(bytes: ByteArray): Boolean = try {
        validateWalletBytes(bytes)
        true
    } catch (e: Exception) {
        Log.w("MAIN", "[Native] wallet bytes failed validation: $e")
        false
    }

    // Writes validated plain wallet bytes.
    private fun writeWalletBytes(fileName: String, bytes: ByteArray) {
        validateWalletBytes(bytes)
        PlainWalletFile.write(applicationContext.filesDir, fileName, bytes)
    }

    // Reads a wallet file as raw bytes: the plain format first (the
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
    // bridge caller rejects it under the "Host" code; the message text
    // is the user-actionable diagnosis.
    private fun readWalletBytes(fileName: String): ByteArray {
        val filesDir = applicationContext.filesDir
        PlainWalletFile.resolveInterruptedMigration(filesDir, fileName, ::isIntactWallet)
        PlainWalletFile.readIfPlain(filesDir, fileName)?.let {
            return it
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
            validateWalletBytes(plain)
            if (PlainWalletFile.migrateIfStillLegacy(filesDir, fileName, plain)) {
                Log.i("MAIN", "[$fileName] migrated to plain wallet bytes")
            }
        } catch (writeError: Exception) {
            Log.e("MAIN", "[$fileName] migration to plain skipped: $writeError")
        }
        return plain
    }

    // The content digest of a wallet file, streamed when the file is
    // plain and decrypted when it is legacy.
    private fun walletDigest(fileName: String): ByteArray =
        if (PlainWalletFile.readsPlain(applicationContext.filesDir, fileName)) {
            PlainWalletFile.digest(applicationContext.filesDir, fileName)
        } else {
            PlainWalletFile.digest(readWalletBytes(fileName))
        }

    // Restores a wallet file from its legacy "$fileName.write.tmp" stash
    // when the file fails the full parse, and drops the orphan once the
    // file passes.
    fun completePendingWrite() {
        for (fileName in listOf(WalletFileName.value, WalletBackupFileName.value)) {
            val tempName = "$fileName.write.tmp"
            if (!fileExists(tempName)) continue
            try {
                val targetIntact = fileExists(fileName) && try {
                    isIntactWallet(readWalletBytes(fileName))
                } catch (_: Exception) {
                    false
                }
                if (!targetIntact) {
                    writeWalletBytes(fileName, readWalletBytes(tempName))
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
    // Recovery goes by content digest, and `walletDigest` levels the
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
            val tempDigest = walletDigest(WalletTempSwapFileName.value)
            if (fileExists(WalletFileName.value)) {
                if (walletDigest(WalletFileName.value).contentEquals(tempDigest)) {
                    // (1)–(2) window: main not yet overwritten.
                    if (fileExists(WalletBackupFileName.value)) {
                        writeWalletBytes(WalletFileName.value, readWalletBytes(WalletBackupFileName.value))
                    }
                    writeWalletBytes(WalletBackupFileName.value, readWalletBytes(WalletTempSwapFileName.value))
                } else {
                    // (2)–(3) or post-(3) window: main already holds the new content.
                    val backupMatches = fileExists(WalletBackupFileName.value) &&
                        walletDigest(WalletBackupFileName.value).contentEquals(tempDigest)
                    if (!backupMatches) {
                        // (2)–(3) window or backup missing: write the lost content.
                        writeWalletBytes(WalletBackupFileName.value, readWalletBytes(WalletTempSwapFileName.value))
                    }
                    // else: post-(3), backup already correct.
                }
            } else {
                // Main missing: restore from temp.
                writeWalletBytes(WalletFileName.value, readWalletBytes(WalletTempSwapFileName.value))
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
            PlainWalletFile.resolveInterruptedMigration(applicationContext.filesDir, fileName, ::isIntactWallet)
        }
        completePendingWrite()
        completePendingSwap()
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        settling(promise) {
            resolvePendingWalletFiles()
            fileExists(WalletFileName.value)
        }
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        settling(promise) {
            resolvePendingWalletFiles()
            fileExists(WalletBackupFileName.value)
        }
    }

    @ReactMethod
    fun loadExistingWallet(serverUri: String, chain: String, performanceLevel: String, minConfirmations: Double, promise: Promise) {
        settling(promise) {
            openWalletFile(walletConnection(serverUri, chain, performanceLevel, minConfirmations.toUInt()))
            Unit
        }
    }

    /** Reads and recovers the wallet file, opens it as the current wallet, and migrates the retained wallet. */
    internal suspend fun openWalletFile(connection: Connection): Wallet {
        val walletBytes = readWalletBytes(WalletFileName.value)
        Log.i("MAIN", "file size: ${walletBytes.size} bytes")
        val wallet = Wallet.openFromBytes(connection, walletBytes)
        walletFileClosed = false
        migrateRetainedWallet()
        return wallet
    }

    // Best-effort after a successful load: reading the retained wallet
    // migrates a legacy encrypted file to plain.
    private fun migrateRetainedWallet() {
        if (!fileExists(WalletBackupFileName.value)) return
        if (PlainWalletFile.readsPlain(applicationContext.filesDir, WalletBackupFileName.value)) return
        try {
            readWalletBytes(WalletBackupFileName.value)
        } catch (e: Exception) {
            Log.w("MAIN", "[Native] retained wallet migration failed: $e")
        }
    }

    @ReactMethod
    fun saveWallet(promise: Promise) {
        settling(promise) {
            saveWalletFile()
            Unit
        }
    }

    /** Writes the current wallet's export to the wallet file and reports false when the closed file refused it. */
    internal suspend fun saveWalletFile(): Boolean {
        val wallet = currentWallet() ?: throw IllegalStateException("no open wallet to save")
        val walletBytes = wallet.saveWalletBytes()
        return PlainWalletFile.locked {
            when {
                walletFileClosed -> {
                    Log.w("MAIN", "[Native] wallet file closed, save refused")
                    false
                }
                walletBytes == null -> {
                    Log.i("MAIN", "[Native] No need to save the wallet.")
                    true
                }
                else -> {
                    Log.i("MAIN", "[Native] file size: ${walletBytes.size} bytes")
                    PlainWalletFile.write(applicationContext.filesDir, WalletFileName.value, walletBytes)
                    true
                }
            }
        }
    }

    @ReactMethod
    fun saveWalletBackup(promise: Promise) {
        settling(promise) { saveWalletBackupFile() }
    }

    private fun saveWalletBackupFile() {
        if (walletFileClosed) {
            Log.w("MAIN", "[Native] wallet file closed, backup save refused")
            return
        }
        writeWalletBytes(WalletBackupFileName.value, readWalletBytes(WalletFileName.value))
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
        settling(promise) {
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
            validateWalletBytes(unwrapped.first)
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
        val salvaged = walletRecoveryInfo(file.readBytes())
        file.copyTo(File(applicationContext.filesDir, "${WalletFileName.value}.broken"), overwrite = true)
        return JSONObject()
            .put("seed_phrase", salvaged.seedPhrase)
            .put("birthday", salvaged.birthday.toLong())
            .put("no_of_accounts", salvaged.noOfAccounts.toLong())
            .toString()
    }

    @ReactMethod
    fun walletFileRecoveryInfo(promise: Promise) {
        settling(promise) { walletFileRecoveryInfoNative() }
    }

    @ReactMethod
    fun repairDoubleWrappedWalletProcess(promise: Promise) {
        settling(promise) {
            val outcome = JSONObject()
            for (name in listOf(WalletFileName.value, WalletBackupFileName.value)) {
                outcome.put(name, repairDoubleWrappedFile(name))
            }
            outcome.toString()
        }
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        settling(promise) { restoreWalletBackup() }
    }

    /** Swaps the retained wallet into the wallet slot and keeps the previous wallet as the retained one. */
    internal fun restoreWalletBackup() {
        val backup = readWalletBytes(WalletBackupFileName.value)
        validateWalletBytes(backup)
        // Closed across the swap; the reload after a successful restore
        // clears it.
        walletFileClosed = true
        if (!fileExists(WalletFileName.value)) {
            // No wallet exists: restore backup as wallet, but KEEP the
            // backup file. Deleting it here left the user with no backup
            // right after a restore, so if they then created/restored a
            // different wallet the just-restored one was gone. Keeping a
            // duplicate copy as backup is far safer than none.
            writeWalletBytes(WalletFileName.value, backup)
            return
        }
        // Durable swap via temp file (audit Issue P (b)): the temp
        // copy written at step (1) is what `completePendingSwap`
        // restores after a crash before step (3).
        //
        // Recover any orphan temp from a prior crash before starting
        // a new swap: it can hold the only copy of that crash's
        // original main.
        completePendingSwap()
        val wallet = try {
            readWalletBytes(WalletFileName.value)
        } catch (e: Exception) {
            // Keep the unreadable main's raw bytes aside and restore the backup into both slots.
            Log.w("MAIN", "[Native] backup restore: main unreadable, preserving raw and restoring backup: $e")
            File(applicationContext.filesDir, WalletFileName.value)
                .copyTo(File(applicationContext.filesDir, "${WalletFileName.value}.broken"), overwrite = true)
            writeWalletBytes(WalletFileName.value, backup)
            return
        }
        writeWalletBytes(WalletTempSwapFileName.value, wallet)
        writeWalletBytes(WalletFileName.value, backup)
        writeWalletBytes(WalletBackupFileName.value, wallet)
        deleteFile(WalletTempSwapFileName.value)
    }

    // Deletes every sidecar the recovery paths could rename or copy back
    // onto the wallet path.
    private fun deleteWalletSidecars(fileName: String) {
        for (suffix in listOf(".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")) {
            File(applicationContext.filesDir, "$fileName$suffix").delete()
        }
    }

    // A swap temp that `completePendingSwap` could not consume can hold
    // the only copy of a wallet, and it survives both delete methods.
    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        settling(promise) {
            completePendingSwap()
            PlainWalletFile.locked {
                val gone = fileExists(WalletFileName.value) && deleteFile(WalletFileName.value)
                if (!fileExists(WalletFileName.value)) {
                    walletFileClosed = true
                    deleteWalletSidecars(WalletFileName.value)
                    File(applicationContext.filesDir, "${WalletTempSwapFileName.value}.plain.tmp").delete()
                }
                gone
            }
        }
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        settling(promise) {
            completePendingSwap()
            PlainWalletFile.locked {
                val gone = fileExists(WalletBackupFileName.value) && deleteFile(WalletBackupFileName.value)
                if (!fileExists(WalletBackupFileName.value)) {
                    deleteWalletSidecars(WalletBackupFileName.value)
                }
                gone
            }
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
}
