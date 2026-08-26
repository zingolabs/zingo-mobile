package org.ZingoLabs.Zingo

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.io.IOException

/**
 * The plain wallet-file core behind Step 1 of the storage rework: a write
 * that verifies its temp copy before an atomic rename, a read that accepts
 * only raw zingolib bytes, and the `.migrating` sidecar resolution. Pure
 * java.io, so the 2.0.21-class migration mechanics run under plain JVM
 * unit tests with no Keystore.
 */
class PlainWalletFileTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var dir: File
    private val fileName = "wallet.dat"

    // Version 42 LE followed by filler, enough to look like a plain wallet.
    private fun plainWallet(fill: Int = 7): ByteArray =
        ByteArray(64) { i -> if (i == 0) 42 else if (i < 8) 0 else (i * fill).toByte() }

    // First byte 0x28: a Tink envelope header, never a plain wallet.
    private val envelopeLookalike = ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() }

    @Before
    fun freshDir() {
        dir = tmp.newFolder()
    }

    @Test
    fun writePutsTheExactBytesAtTheFinalName() {
        val bytes = plainWallet()
        PlainWalletFile.write(dir, fileName, bytes)
        assertArrayEquals(bytes, File(dir, fileName).readBytes())
    }

    @Test
    fun writeReplacesAnExistingFile() {
        PlainWalletFile.write(dir, fileName, plainWallet(fill = 3))
        val newer = plainWallet(fill = 11)
        PlainWalletFile.write(dir, fileName, newer)
        assertArrayEquals(newer, File(dir, fileName).readBytes())
    }

    @Test
    fun writeLeavesNoTempBehind() {
        PlainWalletFile.write(dir, fileName, plainWallet())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun writeRefusesBytesThatAreNotAPlainWallet() {
        val existing = plainWallet()
        File(dir, fileName).writeBytes(existing)
        assertThrows(IOException::class.java) {
            PlainWalletFile.write(dir, fileName, envelopeLookalike)
        }
        assertArrayEquals(existing, File(dir, fileName).readBytes())
    }

    @Test
    fun readIfPlainReturnsTheBytesOfAPlainWallet() {
        val bytes = plainWallet()
        File(dir, fileName).writeBytes(bytes)
        assertArrayEquals(bytes, PlainWalletFile.readIfPlain(dir, fileName))
    }

    @Test
    fun readIfPlainRejectsAMissingFile() {
        assertNull(PlainWalletFile.readIfPlain(dir, fileName))
    }

    @Test
    fun readIfPlainRejectsAnEnvelope() {
        File(dir, fileName).writeBytes(envelopeLookalike)
        assertNull(PlainWalletFile.readIfPlain(dir, fileName))
    }

    @Test
    fun aMigratingCopyBecomesMainWhenMainIsMissing() {
        val bytes = plainWallet()
        File(dir, "$fileName.migrating").writeBytes(bytes)
        PlainWalletFile.resolveInterruptedMigration(dir, fileName)
        assertArrayEquals(bytes, File(dir, fileName).readBytes())
        assertFalse(File(dir, "$fileName.migrating").exists())
    }

    @Test
    fun aStaleMigratingCopyIsDroppedWhenMainIsPlain() {
        File(dir, fileName).writeBytes(plainWallet())
        File(dir, "$fileName.migrating").writeBytes(plainWallet(fill = 3))
        PlainWalletFile.resolveInterruptedMigration(dir, fileName)
        assertFalse(File(dir, "$fileName.migrating").exists())
    }

    @Test
    fun theMigratingCopyStaysWhileMainIsNotYetPlain() {
        // Main still encrypted: the sidecar may be the only plain copy.
        File(dir, fileName).writeBytes(envelopeLookalike)
        File(dir, "$fileName.migrating").writeBytes(plainWallet())
        PlainWalletFile.resolveInterruptedMigration(dir, fileName)
        assertTrue(File(dir, "$fileName.migrating").exists())
        assertArrayEquals(envelopeLookalike, File(dir, fileName).readBytes())
    }

    @Test
    fun nothingHappensWithNoFilesAtAll() {
        PlainWalletFile.resolveInterruptedMigration(dir, fileName)
        assertArrayEquals(arrayOf<String>(), dir.list())
    }
}
