package org.ZingoLabs.Zingo

import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.security.MessageDigest

/**
 * Owns the plain wallet-file format (raw zingolib bytes under OS
 * protection): a verified temp-then-rename write, a raw read, and the
 * `.migrating` sidecar resolution, in pure java.io for plain JVM unit
 * tests.
 */
object PlainWalletFile {
    // One writer at a time: the JS bridge, BackgroundSyncWorker, and the
    // load-path migration share the process and the temp file name.
    private val writeLock = Any()

    private const val BUFFER_SIZE = 8 * 1024
    private const val HEADER_SIZE = 8

    // Writes to "$fileName.plain.tmp", verifies the synced read-back, then
    // renames onto the final path, which keeps its old content until then.
    fun write(dir: File, fileName: String, bytes: ByteArray) {
        if (!WalletFileEnvelope.looksLikePlainWallet(bytes)) {
            throw IOException("Error: refusing to write $fileName, the bytes are not a plain wallet")
        }
        synchronized(writeLock) {
            val temp = File(dir, "$fileName.plain.tmp")
            try {
                FileOutputStream(temp).use { out ->
                    out.write(bytes)
                    out.fd.sync()
                }
                if (!matchesFile(temp, bytes)) {
                    throw IOException("Error: read-back of ${temp.name} does not match the wallet bytes")
                }
                if (!temp.renameTo(File(dir, fileName))) {
                    throw IOException("Error: could not rename ${temp.name} onto $fileName")
                }
            } finally {
                temp.delete()
            }
        }
    }

    // The migration's write: under the lock, a file that already reads
    // plain is left untouched.
    fun migrateIfStillLegacy(dir: File, fileName: String, bytes: ByteArray): Boolean =
        synchronized(writeLock) {
            if (readIfPlain(dir, fileName) != null) {
                false
            } else {
                write(dir, fileName, bytes)
                true
            }
        }

    // Compares a file against bytes one buffer at a time, so verifying a
    // write never holds a second copy of the wallet.
    private fun matchesFile(file: File, bytes: ByteArray): Boolean {
        if (file.length() != bytes.size.toLong()) return false
        val buffer = ByteArray(BUFFER_SIZE)
        FileInputStream(file).use { input ->
            var offset = 0
            while (offset < bytes.size) {
                val read = input.read(buffer)
                if (read <= 0) return false
                for (i in 0 until read) {
                    if (buffer[i] != bytes[offset + i]) return false
                }
                offset += read
            }
            return input.read() == -1
        }
    }

    // Whether the file starts with a plain wallet header. Reads 8 bytes,
    // never the whole file.
    fun readsPlain(dir: File, fileName: String): Boolean {
        val file = File(dir, fileName)
        if (!file.exists()) return false
        val header = ByteArray(HEADER_SIZE)
        val read = FileInputStream(file).use { it.read(header) }
        return read == HEADER_SIZE && WalletFileEnvelope.looksLikePlainWallet(header)
    }

    // A content digest of a plain wallet file, streamed.
    fun digest(dir: File, fileName: String): ByteArray {
        val md = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(BUFFER_SIZE)
        FileInputStream(File(dir, fileName)).use { input ->
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) break
                md.update(buffer, 0, read)
            }
        }
        return md.digest()
    }

    // The digest of bytes already in memory, for the legacy files that
    // only exist as decrypted bytes.
    fun digest(bytes: ByteArray): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(bytes)

    // Runs file work under the writer lock.
    fun <T> locked(block: () -> T): T = synchronized(writeLock) { block() }

    // The bytes when the file exists and is a plain wallet.
    fun readIfPlain(dir: File, fileName: String): ByteArray? {
        val file = File(dir, fileName)
        if (!file.exists()) return null
        val bytes = file.readBytes()
        return if (WalletFileEnvelope.looksLikePlainWallet(bytes)) bytes else null
    }

    // Renames a `.migrating` sidecar to main when main is missing, deletes
    // it once main passes the intact-wallet check, and keeps it in every
    // other state.
    fun resolveInterruptedMigration(dir: File, fileName: String, isIntactWallet: (ByteArray) -> Boolean) {
        val sidecar = File(dir, "$fileName.migrating")
        if (!sidecar.exists()) return
        if (!File(dir, fileName).exists()) {
            sidecar.renameTo(File(dir, fileName))
            return
        }
        val main = readIfPlain(dir, fileName)
        if (main != null && isIntactWallet(main)) {
            sidecar.delete()
        }
    }
}
