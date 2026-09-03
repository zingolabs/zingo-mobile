package org.ZingoLabs.Zingo

import android.content.Context
import android.util.Log
import android.util.Base64
import android.util.Base64InputStream
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.FilterOutputStream
import java.io.OutputStream
import java.io.IOException
import java.security.MessageDigest
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

    // The legacy decrypt, used only to recover a 2.0.21 file: streams the
    // envelope's base64 payload into `sink` as raw bytes. A test can replace it.
    internal var legacyDecrypt: (File, OutputStream) -> Unit = { envelope, sink -> decryptLegacyInto(envelope, sink) }

    // Records the first failure of the wrapped stream.
    private class SinkStream(out: OutputStream) : FilterOutputStream(out) {
        var failure: IOException? = null

        override fun write(b: Int) = guarded { out.write(b) }
        override fun write(b: ByteArray, off: Int, len: Int) = guarded { out.write(b, off, len) }
        override fun flush() = guarded { out.flush() }

        private inline fun guarded(op: () -> Unit) {
            try {
                op()
            } catch (e: IOException) {
                failure = failure ?: e
                throw e
            }
        }
    }

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

    private fun decryptLegacyInto(envelope: File, sink: OutputStream) {
        buildEncryptedFile(envelope).openFileInput().use { input ->
            Base64InputStream(input, Base64.NO_WRAP).use { decoded ->
                decoded.copyTo(sink)
                sink.flush()
            }
        }
    }

    // The full zingolib parse behind every destructive file decision.
    private fun isIntactWallet(file: File): Boolean = try {
        uniffi.zingo.validateWalletFile(file.path)
        true
    } catch (e: Exception) {
        Log.w("MAIN", "[Native] ${file.name} failed validation: $e")
        false
    }

    // Streams `source` into `sink` and syncs it.
    private fun copyInto(source: File, sink: File) {
        source.inputStream().use { input ->
            FileOutputStream(sink).use { out ->
                input.copyTo(out)
                out.fd.sync()
            }
        }
    }

    // Installs a validated copy of `source` under `fileName`, compared by
    // digest, under the writer lock.
    private fun writePlainCopy(fileName: String, source: File) {
        PlainWalletFile.locked {
            uniffi.zingo.validateWalletFile(source.path)
            PlainWalletFile.write(applicationContext.filesDir, fileName) { temp ->
                copyInto(source, temp)
                if (!sameContent(source, temp)) {
                    throw IOException("Error: the copy of ${source.name} for $fileName differs from its source")
                }
                true
            }
        }
    }

    private fun fileDigest(file: File): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest()
    }

    private fun sameContent(a: File, b: File): Boolean =
        a.length() == b.length() && fileDigest(a).contentEquals(fileDigest(b))

    private val recoveryAdvice =
        "Please restore the wallet from your seed phrase or from your Viewing Key (UFVK)."

    // The outcome of streaming a legacy file's envelopes into a sink.
    private class Peel(
        // The payload kind under the outer envelope, absent when it did not decrypt.
        val outerPayload: WalletFileEnvelope.PayloadKind?,
        val readError: Exception?,
        // The sink's own failure, when the bytes could not land.
        val writeError: IOException?,
        // Extra layers removed before the sink held plain bytes, absent when none did.
        val plainDepth: Int?,
        val unwrapErrors: List<String>,
    )

    // Streams one envelope into `sink` and returns the sink's failure, if any.
    private fun decryptLayer(source: File, sink: File): IOException? {
        val file = try {
            FileOutputStream(sink)
        } catch (e: IOException) {
            return e
        }
        val out = SinkStream(file)
        try {
            legacyDecrypt(source, out)
        } catch (e: Exception) {
            try {
                out.close()
            } catch (_: IOException) {
            }
            if (out.failure != null) return out.failure
            throw e
        }
        return try {
            out.flush()
            file.fd.sync()
            null
        } catch (e: IOException) {
            e
        } finally {
            try {
                out.close()
            } catch (_: IOException) {
            }
        }
    }

    // Test seam: runs before each numbered step of the restore swap.
    internal var restoreStepHook: (Int) -> Unit = {}

    // Streams the envelopes of `fileName` into `sink` one layer at a time, at
    // most MAX_UNWRAP_DEPTH extra layers. An inner envelope goes under the
    // same file name in a scratch dir, since the name is the AAD.
    private fun peelLegacy(fileName: String, sink: File): Peel {
        val scratchDir = File(applicationContext.cacheDir, "wallet-unwrap").apply { mkdirs() }
        val scratch = File(scratchDir, fileName)
        val errors = mutableListOf<String>()
        var source = File(applicationContext.filesDir, fileName)
        var outerPayload: WalletFileEnvelope.PayloadKind? = null
        try {
            for (depth in 0..WalletFileEnvelope.MAX_UNWRAP_DEPTH) {
                val sinkFailure = try {
                    decryptLayer(source, sink)
                } catch (e: Exception) {
                    if (depth == 0) return Peel(null, e, null, null, errors)
                    Log.w("MAIN", "[$fileName] unwrap at depth $depth failed: $e")
                    errors.add("depth $depth: $e")
                    return Peel(outerPayload, null, null, null, errors)
                }
                if (sinkFailure != null) return Peel(outerPayload, null, sinkFailure, null, errors)
                val kind = WalletFileEnvelope.classify(PlainWalletFile.header(sink))
                if (depth == 0) outerPayload = kind
                when (kind) {
                    WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> return Peel(outerPayload, null, null, depth, errors)
                    WalletFileEnvelope.PayloadKind.UNKNOWN -> {
                        errors.add("depth $depth: payload is neither a wallet nor a Tink envelope")
                        return Peel(outerPayload, null, null, null, errors)
                    }
                    WalletFileEnvelope.PayloadKind.TINK_ENVELOPE -> {
                        if (depth == WalletFileEnvelope.MAX_UNWRAP_DEPTH) {
                            errors.add("still an envelope after ${WalletFileEnvelope.MAX_UNWRAP_DEPTH} layers")
                            return Peel(outerPayload, null, null, null, errors)
                        }
                        sink.copyTo(scratch, overwrite = true)
                        source = scratch
                    }
                }
            }
            return Peel(outerPayload, null, null, null, errors)
        } finally {
            scratch.delete()
        }
    }

    // The user-actionable diagnosis of a legacy file that yields no plain
    // wallet.
    private fun legacyFailure(fileName: String, peel: Peel): IOException = when {
        peel.writeError != null -> {
            Log.e("MAIN", "[$fileName] the plain copy could not be written: ${peel.writeError}")
            IOException(
                "Error: the plain copy of $fileName could not be written (${peel.writeError.message}). " +
                "Free some storage space and open the app again. The wallet file is unchanged.",
                peel.writeError
            )
        }
        peel.readError != null -> {
            Log.e(
                "MAIN",
                "[$fileName] not a plain wallet and decryption failed, Keystore key likely lost: ${peel.readError}"
            )
            IOException(
                "Error: wallet decryption failed and the file is not a plain wallet. " +
                "This usually means the device Keystore was reset, a backup of an old " +
                "wallet was restored, or the OEM Keystore lost its keys. $recoveryAdvice",
                peel.readError
            )
        }
        peel.outerPayload == WalletFileEnvelope.PayloadKind.TINK_ENVELOPE ->
            IOException(
                "Error: $fileName is wrapped in envelopes that could not be " +
                "removed (${peel.unwrapErrors}). $recoveryAdvice"
            )
        else -> IOException("Error: the decrypted content of $fileName is not a wallet. $recoveryAdvice")
    }

    // Resolves a wallet file to its plain-format path. Plain bytes answer
    // directly. A legacy encrypted file migrates in the same call: its
    // envelopes stream into the plain temp, the temp runs the full parse,
    // and the rename is the only step that touches the legacy path. A
    // double wrap keeps its original at "$fileName.prerepair". The header
    // decides the format, never a trial decrypt (#965).
    private fun resolveWalletFile(fileName: String): File {
        val filesDir = applicationContext.filesDir
        PlainWalletFile.resolveInterruptedMigration(filesDir, fileName, ::isIntactWallet)
        val file = File(filesDir, fileName)
        if (PlainWalletFile.isPlain(file)) return file
        if (!file.exists()) {
            throw FileNotFoundException("Error: $fileName does not exist")
        }
        val migrated = PlainWalletFile.migrateIfStillLegacy(filesDir, fileName) { temp ->
            val peel = peelLegacy(fileName, temp)
            val layers = peel.plainDepth ?: throw legacyFailure(fileName, peel)
            try {
                uniffi.zingo.validateWalletFile(temp.path)
            } catch (e: Exception) {
                throw IOException("Error: the decrypted content of $fileName fails to parse as a wallet. $recoveryAdvice", e)
            }
            if (layers > 0) {
                file.copyTo(File(filesDir, "$fileName.prerepair"), overwrite = true)
                Log.i("MAIN", "[$fileName] removed $layers extra envelope layer(s)")
            }
            true
        }
        if (migrated) Log.i("MAIN", "[$fileName] migrated to plain wallet bytes")
        return file
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
                    isIntactWallet(resolveWalletFile(fileName))
                } catch (_: Exception) {
                    false
                }
                if (!targetIntact) {
                    writePlainCopy(fileName, resolveWalletFile(tempName))
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
    // Recovery compares content by digest after `resolveWalletFile` levels the formats.
    //
    // Possible interrupted states (temp exists with originalMain):
    //   between (1)–(2): main == temp  → write main(backup), write backup(temp)
    //   between (2)–(3): main != temp AND backup != temp → write backup(temp)
    //   between (3)–(4): main != temp AND backup == temp → nothing to write
    // Idempotent, a no-op when no temp file is present.
    fun completePendingSwap() {
        val tempFile = File(applicationContext.filesDir, WalletTempSwapFileName.value)
        if (!tempFile.exists()) return
        PlainWalletFile.locked { completePendingSwapLocked(tempFile) }
    }

    private fun completePendingSwapLocked(tempFile: File) {
        try {
            val temp = resolveWalletFile(WalletTempSwapFileName.value)
            if (fileExists(WalletFileName.value)) {
                val main = resolveWalletFile(WalletFileName.value)
                if (sameContent(main, temp)) {
                    if (fileExists(WalletBackupFileName.value)) {
                        writePlainCopy(WalletFileName.value, resolveWalletFile(WalletBackupFileName.value))
                    }
                    writePlainCopy(WalletBackupFileName.value, temp)
                } else {
                    val backup = if (fileExists(WalletBackupFileName.value)) resolveWalletFile(WalletBackupFileName.value) else null
                    if (backup == null || sameContent(main, backup)) {
                        writePlainCopy(WalletBackupFileName.value, temp)
                    } else if (!sameContent(backup, temp)) {
                        val orphan = File(applicationContext.filesDir, "${WalletTempSwapFileName.value}.orphan.${System.currentTimeMillis()}")
                        if (!temp.renameTo(orphan)) {
                            throw IOException("Error: could not set the swap temp aside as ${orphan.name}")
                        }
                        Log.w("MAIN", "[Native] completePendingSwap: three distinct wallet files, swap temp kept as ${orphan.name}")
                        return
                    }
                }
            } else {
                writePlainCopy(WalletFileName.value, temp)
            }
            deleteFile(WalletTempSwapFileName.value)
            Log.i("MAIN", "[Native] completePendingSwap: interrupted swap recovered")
        } catch (e: Exception) {
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
        resolvePendingWalletFiles()
        promise.resolve(fileExists(WalletFileName.value))
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        resolvePendingWalletFiles()
        promise.resolve(fileExists(WalletBackupFileName.value))
    }

    // Rust streams the wallet into the temp it is handed, verifies it by
    // digest, and answers whether a save was needed. The fill runs outside
    // the writer lock, and the rename under it re-checks that the wallet
    // file is still open.
    fun saveWalletFile(): Boolean {
        return try {
            uniffi.zingo.initLogging()
            if (walletFileClosed) {
                Log.w("MAIN", "[Native] wallet file closed, save refused")
                return false
            }
            val filesDir = applicationContext.filesDir
            var refused = false
            val written = PlainWalletFile.write(
                filesDir,
                WalletFileName.value,
                commit = {
                    refused = walletFileClosed
                    !refused
                },
            ) { temp ->
                uniffi.zingo.saveWalletFile(temp.path)
            }
            when {
                refused -> {
                    Log.w("MAIN", "[Native] wallet file closed during the save, install refused")
                    false
                }
                written -> {
                    Log.i("MAIN", "[Native] file size: ${File(filesDir, WalletFileName.value).length()} bytes")
                    true
                }
                else -> {
                    Log.i("MAIN", "[Native] No need to save the wallet.")
                    true
                }
            }
        } catch (e: Exception) {
            if (walletFileClosed) {
                Log.w("MAIN", "[Native] wallet file closed during the save, save abandoned: $e")
            } else {
                Log.e("MAIN", "[Native] Unexpected error. Couldn't save the wallet. $e")
            }
            false
        }
    }

    private fun saveWalletBackupFile(): Boolean {
        return try {
            if (walletFileClosed) {
                Log.w("MAIN", "[Native] wallet file closed, backup save refused")
                return false
            }
            writePlainCopy(WalletBackupFileName.value, resolveWalletFile(WalletFileName.value))
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
        report.put("head", PlainWalletFile.header(file).joinToString("") { "%02x".format(it) })
        if (PlainWalletFile.isPlain(file)) {
            return report.put("state", "plainWallet")
        }
        val scratchDir = File(applicationContext.cacheDir, "wallet-unwrap").apply { mkdirs() }
        val sink = File(scratchDir, "$fileName.peeled")
        val peel = try {
            peelLegacy(fileName, sink)
        } finally {
            sink.delete()
        }
        peel.readError?.let {
            Log.w("MAIN", "[$fileName] diagnosis: encrypted read failed: $it")
            return report.put("readError", it.toString()).put("state", "undecryptable")
        }
        return when (peel.outerPayload) {
            WalletFileEnvelope.PayloadKind.PLAIN_WALLET -> report.put("state", "encryptedLegacy")
            WalletFileEnvelope.PayloadKind.UNKNOWN, null -> report.put("state", "unknown")
            WalletFileEnvelope.PayloadKind.TINK_ENVELOPE ->
                report.put("state", "doubleWrapped")
                    .put("repairable", peel.plainDepth != null)
                    .put("depth", peel.plainDepth ?: 0)
                    .put("unwrapErrors", JSONArray(peel.unwrapErrors))
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
        if (!file.exists() || PlainWalletFile.isPlain(file)) return "skipped"
        var outcome = "failed"
        try {
            PlainWalletFile.write(filesDir, fileName) { temp ->
                val peel = peelLegacy(fileName, temp)
                if (peel.readError != null) {
                    Log.w("MAIN", "[$fileName] repair: encrypted read failed, nothing to unwrap: ${peel.readError}")
                    outcome = "skipped"
                    return@write false
                }
                if (peel.outerPayload != WalletFileEnvelope.PayloadKind.TINK_ENVELOPE) {
                    outcome = "skipped"
                    return@write false
                }
                val layers = peel.plainDepth ?: return@write false
                uniffi.zingo.validateWalletFile(temp.path)
                file.copyTo(File(filesDir, "$fileName.prerepair"), overwrite = true)
                Log.i("MAIN", "[$fileName] repair: removed $layers layer(s)")
                outcome = "repaired"
                true
            }
        } catch (e: Exception) {
            Log.e("MAIN", "[$fileName] repair: rewrite failed: $e")
            outcome = "failed"
        }
        return outcome
    }

    // Salvages seed and birthday from the stable prefix of the closed
    // wallet file and keeps the damaged bytes at "$fileName.broken".
    internal fun walletFileRecoveryInfoNative(): String {
        val file = File(applicationContext.filesDir, WalletFileName.value)
        val salvaged = uniffi.zingo.readWalletRecoveryInfoFile(file.path)
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
            walletFileClosed = false
            saveWalletFile()
            resp
        }
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_from_seed") {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initFromSeed(seed, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            walletFileClosed = false
            saveWalletFile()
            resp
        }
    }

    @ReactMethod
    fun restoreWalletFromUfvk(ufvk: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "init_from_ufvk") {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initFromUfvk(ufvk, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
            walletFileClosed = false
            saveWalletFile()
            resp
        }
}

    @ReactMethod
    fun loadExistingWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        FfiOutcome.settling(promise, "load_wallet_file") {
            loadExistingWalletNative(serveruri, chainhint, performancelevel, minconfirmations)
        }
    }

    // Throws on failure; callers own the error channel (a rejected promise
    // here, the worker's catch in BackgroundSyncWorker).
    fun loadExistingWalletNative(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String): String {
        uniffi.zingo.initLogging()

        val wallet = resolveWalletFile(WalletFileName.value)
        Log.i("MAIN", "file size: ${wallet.length()} bytes")

        val resp = uniffi.zingo.loadWalletFile(wallet.path, serveruri, chainhint, performancelevel, minconfirmations.toUInt())
        walletFileClosed = false
        migrateRetainedWallet()
        return resp
    }

    // Best-effort after a successful load: resolving the retained wallet
    // migrates a legacy encrypted file to plain.
    private fun migrateRetainedWallet() {
        if (!fileExists(WalletBackupFileName.value)) return
        try {
            resolveWalletFile(WalletBackupFileName.value)
        } catch (e: Exception) {
            Log.w("MAIN", "[Native] retained wallet migration failed: $e")
        }
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        try {
            completePendingSwap()
            orphanLeftoverSwapTemp()
            val backup = resolveWalletFile(WalletBackupFileName.value)
            try {
                uniffi.zingo.validateWalletFile(backup.path)
            } catch (e: Exception) {
                Log.e("MAIN", "[Native] backup restore: content failed validation: $e")
                promise.resolve(false)
                return
            }
            val wasClosed = walletFileClosed
            walletFileClosed = true
            var mainChanged = false
            try {
                PlainWalletFile.locked {
                if (fileExists(WalletFileName.value)) {
                    val wallet = try {
                        resolveWalletFile(WalletFileName.value)
                    } catch (e: Exception) {
                        Log.w("MAIN", "[Native] backup restore: main unreadable, preserving raw and restoring backup: $e")
                        File(applicationContext.filesDir, WalletFileName.value)
                            .copyTo(File(applicationContext.filesDir, "${WalletFileName.value}.broken"), overwrite = true)
                        writePlainCopy(WalletFileName.value, backup)
                        mainChanged = true
                        return@locked
                    }
                    val swap = File(applicationContext.filesDir, WalletTempSwapFileName.value)
                    try {
                        restoreStepHook(1)
                        writePlainCopy(WalletTempSwapFileName.value, wallet)
                        restoreStepHook(2)
                        writePlainCopy(WalletFileName.value, backup)
                    } catch (e: Exception) {
                        swap.delete()
                        throw e
                    }
                    mainChanged = true
                    try {
                        restoreStepHook(3)
                        writePlainCopy(WalletBackupFileName.value, swap)
                        deleteFile(WalletTempSwapFileName.value)
                    } catch (e: Exception) {
                        Log.w("MAIN", "[Native] backup restore: retained copy pending, the startup recovery completes it: $e")
                    }
                } else {
                    writePlainCopy(WalletFileName.value, backup)
                    mainChanged = true
                }
                }
            } finally {
                if (!mainChanged) walletFileClosed = wasClosed
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

    // Deletes every sidecar the recovery paths could rename or copy back
    // onto the wallet path.
    private fun deleteWalletSidecars(fileName: String) {
        for (suffix in listOf(".migrating", ".write.tmp", ".prerepair", ".broken")) {
            File(applicationContext.filesDir, "$fileName$suffix").delete()
        }
        PlainWalletFile.deleteTemps(applicationContext.filesDir, fileName)
    }

    // Sets a swap temp the recovery could not place aside as an orphan.
    private fun orphanLeftoverSwapTemp() {
        val temp = File(applicationContext.filesDir, WalletTempSwapFileName.value)
        if (!temp.isFile) return
        val orphan = File(applicationContext.filesDir, "${WalletTempSwapFileName.value}.orphan.${System.currentTimeMillis()}")
        if (!temp.renameTo(orphan)) {
            throw IOException("Error: could not set the swap temp aside as ${orphan.name}")
        }
        Log.w("MAIN", "[Native] backup restore: leftover swap temp kept as ${orphan.name}")
    }

    // Whether the swap temp holds a copy of `slot`, false when it cannot be read.
    private fun swapHoldsCopyOf(slot: File): Boolean {
        val swap = File(applicationContext.filesDir, WalletTempSwapFileName.value)
        if (!swap.isFile || !slot.isFile) return false
        return try {
            sameContent(resolveWalletFile(WalletTempSwapFileName.value), slot)
        } catch (e: Exception) {
            false
        }
    }

    // Deletes the wallet, its sidecars, and a swap temp that is a copy of it.
    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        val filesDir = applicationContext.filesDir
        val deleted = PlainWalletFile.locked {
            val main = File(filesDir, WalletFileName.value)
            if (swapHoldsCopyOf(main)) deleteFile(WalletTempSwapFileName.value) else completePendingSwap()
            val gone = fileExists(WalletFileName.value) && deleteFile(WalletFileName.value)
            if (!fileExists(WalletFileName.value)) {
                walletFileClosed = true
                deleteWalletSidecars(WalletFileName.value)
                PlainWalletFile.deleteTemps(filesDir, WalletTempSwapFileName.value)
            }
            gone
        }
        promise.resolve(deleted)
    }

    @ReactMethod
    fun deleteExistingWalletBackup(promise: Promise) {
        val filesDir = applicationContext.filesDir
        val deleted = PlainWalletFile.locked {
            val backup = File(filesDir, WalletBackupFileName.value)
            if (swapHoldsCopyOf(backup)) deleteFile(WalletTempSwapFileName.value) else completePendingSwap()
            val gone = fileExists(WalletBackupFileName.value) && deleteFile(WalletBackupFileName.value)
            if (!fileExists(WalletBackupFileName.value)) {
                deleteWalletSidecars(WalletBackupFileName.value)
            }
            gone
        }
        promise.resolve(deleted)
    }

    // saveWalletFile/saveWalletBackupFile still contain their own failures
    // as a resolved false (the init flows depend on a save failure not
    // failing the whole init), so these shells resolve that boolean
    // verbatim; only an escaping exception rejects. No outcome is ever
    // re-encoded as prose in the success channel (zingo-mobile#1151).
    @ReactMethod
    fun doSave(promise: Promise) {
        FfiOutcome.settling(promise, "save_wallet_file") {
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
