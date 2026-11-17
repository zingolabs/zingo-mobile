package org.ZingoLabs.Zingo

import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/**
 * The app's own JSON files in its private folder: settings, the address book
 * and the background sync report. Only these names are accepted, so the
 * bridge can never reach a wallet file or a path outside the folder.
 *
 * A write goes to a synced temp file renamed onto the target, so a reader,
 * BackgroundSyncWorker included, sees the old text or the new one and never
 * part of it, even when the process dies mid-write.
 */
object AppFiles {
    val NAMES = setOf("settings.json", "addressbook.json", "background.json")

    private val writeLock = Any()

    private fun fileOf(dir: File, name: String): File {
        if (name !in NAMES) {
            throw IllegalArgumentException("Error: $name is not an app file")
        }
        return File(dir, name)
    }

    fun exists(dir: File, name: String): Boolean = fileOf(dir, name).exists()

    fun read(dir: File, name: String): String = fileOf(dir, name).readText(Charsets.UTF_8)

    fun write(dir: File, name: String, text: String) {
        val target = fileOf(dir, name)
        synchronized(writeLock) {
            val temp = File(dir, "$name.tmp")
            try {
                FileOutputStream(temp).use { out ->
                    out.write(text.toByteArray(Charsets.UTF_8))
                    out.fd.sync()
                }
                if (!temp.renameTo(target)) {
                    throw IOException("Error: could not rename ${temp.name} onto $name")
                }
            } finally {
                temp.delete()
            }
        }
    }
}
