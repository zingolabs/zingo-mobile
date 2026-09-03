package org.ZingoLabs.Zingo

import java.io.File
import java.io.IOException
import java.nio.channels.FileChannel
import java.nio.file.StandardOpenOption
import java.util.concurrent.atomic.AtomicLong

/**
 * Owns the plain wallet-file path discipline: a temp that is filled
 * outside the writer lock and installed under it by an atomic rename, the
 * header routing, and the `.migrating` sidecar resolution, in pure
 * java.io for plain JVM unit tests. The bytes never pass through here:
 * whatever fills the temp file streams them, Rust for a save and a
 * stream copy for a migration.
 */
object PlainWalletFile {
    // One installer at a time: the JS bridge, BackgroundSyncWorker, and
    // the load-path migration share the process and the final names.
    private val writeLock = Any()
    private val tempSerial = AtomicLong()

    // The temps a writer of this process is filling right now, kept out
    // of every sweep.
    private val liveTemps = mutableSetOf<File>()

    const val TEMP_SUFFIX: String = ".plain.tmp"

    // A temp beside the final path, unique per write so two fills never
    // share a file, and registered as live until its writer is done.
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

    // Every temp of `fileName` beside it that no live writer of this
    // process owns: the leftovers of a killed process.
    fun staleTemps(dir: File, fileName: String): List<File> = synchronized(writeLock) {
        dir.listFiles()?.filter { isTempOf(fileName, it) && it !in liveTemps } ?: emptyList()
    }

    fun deleteTemps(dir: File, fileName: String) {
        for (temp in staleTemps(dir, fileName)) temp.deleteRecursively()
    }

    // Fills a fresh temp through `fill` outside the lock, then under the
    // lock asks `commit`, confirms the header, and renames the temp onto
    // the final path, which keeps its old content until then. `fill` or
    // `commit` answering false abandons the write. Returns whether the
    // final path changed.
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
                // The file is installed from here on: a sync or sweep failure
                // is logged by the caller's platform, never reported as a
                // failed install.
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

    // The migration's write: under the lock, a file that already reads
    // plain is left untouched.
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
