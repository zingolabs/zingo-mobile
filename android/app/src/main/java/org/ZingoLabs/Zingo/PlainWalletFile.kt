package org.ZingoLabs.Zingo

import java.io.File
import java.io.IOException
import java.nio.channels.FileChannel
import java.nio.file.StandardOpenOption
import java.util.concurrent.atomic.AtomicLong

/**
 * Owns the wallet file path rules: a temp file filled outside the writer
 * lock and renamed into place under it, the header check, and the
 * `.migrating` sidecar. Pure java.io, so plain JVM tests cover it. The
 * wallet bytes stream through whatever fills the temp, never through here.
 */
object PlainWalletFile {
    // One install at a time across the bridge, the sync worker, and the load-path migration.
    private val writeLock = Any()
    private val tempSerial = AtomicLong()

    // Temps that a writer of this process is still filling.
    private val liveTemps = mutableSetOf<File>()

    const val TEMP_SUFFIX: String = ".plain.tmp"

    // A new temp beside the final file, unique per write and live until its writer is done.
    fun newTemp(dir: File, fileName: String): File {
        val temp = File(dir, "$fileName$TEMP_SUFFIX.${System.nanoTime()}.${tempSerial.incrementAndGet()}")
        synchronized(writeLock) { liveTemps.add(temp) }
        return temp
    }

    private fun release(temp: File) {
        synchronized(writeLock) { liveTemps.remove(temp) }
        temp.delete()
    }

    fun isTempOf(fileName: String, candidate: File): Boolean =
        candidate.name.startsWith("$fileName$TEMP_SUFFIX")

    // Temps of `fileName` that no live writer of this process owns.
    fun staleTemps(dir: File, fileName: String): List<File> = synchronized(writeLock) {
        dir.listFiles()?.filter { isTempOf(fileName, it) && it !in liveTemps } ?: emptyList()
    }

    fun deleteTemps(dir: File, fileName: String) {
        for (temp in staleTemps(dir, fileName)) temp.deleteRecursively()
    }

    // Fills a new temp outside the lock, then under the lock asks `commit`,
    // checks the header, and renames the temp onto the final file. Returns
    // whether the final file changed.
    fun write(dir: File, fileName: String, commit: () -> Boolean = { true }, fill: (File) -> Boolean): Boolean {
        val temp = newTemp(dir, fileName)
        try {
            if (!fill(temp)) return false
            if (!isPlain(temp)) {
                throw IOException("Error: refusing to install ${temp.name} as $fileName, the file is not a plain wallet")
            }
            synchronized(writeLock) {
                if (!commit()) return false
                if (!temp.renameTo(File(dir, fileName))) {
                    throw IOException("Error: could not rename ${temp.name} onto $fileName")
                }
                try {
                    syncDirectory(dir)
                    deleteTemps(dir, fileName)
                } catch (_: IOException) {
                }
            }
            return true
        } finally {
            release(temp)
        }
    }

    // The migration's write, under the lock, skipped when the file already reads plain.
    fun migrateIfStillLegacy(dir: File, fileName: String, fill: (File) -> Boolean): Boolean =
        synchronized(writeLock) {
            if (isPlain(dir, fileName)) false else write(dir, fileName, fill = fill)
        }

    // Runs file work under the writer lock.
    fun <T> locked(block: () -> T): T = synchronized(writeLock) { block() }

    // Makes a rename in `dir` durable.
    fun syncDirectory(dir: File) {
        FileChannel.open(dir.toPath(), StandardOpenOption.READ).use { it.force(true) }
    }

    // The first 16 bytes of the file, fewer when the file is shorter.
    fun header(file: File): ByteArray = file.inputStream().use { input ->
        val head = ByteArray(16)
        val read = input.read(head)
        if (read <= 0) ByteArray(0) else head.copyOf(read)
    }

    // Whether the file exists and its header reads as a plain wallet.
    fun isPlain(file: File): Boolean =
        file.isFile && WalletFileEnvelope.looksLikePlainWallet(header(file))

    fun isPlain(dir: File, fileName: String): Boolean = isPlain(File(dir, fileName))

    // Renames a `.migrating` sidecar to main when main is missing, deletes
    // it once main passes the intact-wallet check, and keeps it in every
    // other state.
    fun resolveInterruptedMigration(dir: File, fileName: String, isIntactWallet: (File) -> Boolean) {
        val sidecar = File(dir, "$fileName.migrating")
        if (!sidecar.isFile) return
        val main = File(dir, fileName)
        if (!main.exists()) {
            sidecar.renameTo(main)
            return
        }
        if (isPlain(main) && isIntactWallet(main)) {
            sidecar.delete()
        }
    }
}
