package org.ZingoLabs.Zingo

import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Reads and atomically replaces the three app JSON files in the private folder, and refuses any other name. */
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
                Files.move(
                    temp.toPath(),
                    target.toPath(),
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING,
                )
            } finally {
                temp.delete()
            }
        }
    }
}
