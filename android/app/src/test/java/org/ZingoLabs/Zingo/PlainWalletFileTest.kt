package org.ZingoLabs.Zingo

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.io.IOException

/**
 * The plain wallet-file path discipline: a write that fills a temp file,
 * confirms its header, and renames it into place, a header read that
 * accepts only raw zingolib bytes, and the `.migrating` sidecar
 * resolution. Pure java.io, so the mechanics run under plain JVM unit
 * tests with no Keystore and no Rust.
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

    // A fill that streams `bytes` into the temp file.
    private fun filling(bytes: ByteArray): (File) -> Boolean = { temp ->
        temp.writeBytes(bytes)
        true
    }

    @Before
    fun freshDir() {
        dir = tmp.newFolder()
    }

    @Test
    fun writePutsTheFilledBytesAtTheFinalName() {
        val bytes = plainWallet()
        assertTrue(PlainWalletFile.write(dir, fileName, fill = filling(bytes)))
        assertArrayEquals(bytes, File(dir, fileName).readBytes())
    }

    @Test
    fun writeReplacesAnExistingFile() {
        PlainWalletFile.write(dir, fileName, fill = filling(plainWallet(fill = 3)))
        val newer = plainWallet(fill = 11)
        PlainWalletFile.write(dir, fileName, fill = filling(newer))
        assertArrayEquals(newer, File(dir, fileName).readBytes())
    }

    @Test
    fun writeLeavesNoTempBehind() {
        PlainWalletFile.write(dir, fileName, fill = filling(plainWallet()))
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun writeHandsTheFillAFreshTempBesideTheFinalName() {
        val temps = mutableListOf<File>()
        repeat(2) {
            PlainWalletFile.write(dir, fileName) { temp ->
                temps.add(temp)
                assertTrue(temp.name.startsWith("$fileName.plain.tmp"))
                assertArrayEquals(arrayOf(dir.path), arrayOf(temp.parentFile?.path))
                temp.writeBytes(plainWallet())
                true
            }
        }
        assertTrue(File(dir, fileName).exists())
        assertTrue(temps[0] != temps[1])
    }

    @Test
    fun aCommitThatDeclinesLeavesTheFinalPathAloneAndDropsTheTemp() {
        val existing = plainWallet()
        File(dir, fileName).writeBytes(existing)
        assertFalse(PlainWalletFile.write(dir, fileName, commit = { false }, fill = filling(plainWallet(fill = 3))))
        assertArrayEquals(existing, File(dir, fileName).readBytes())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun anInstallSweepsStaleTempsOfAKilledWriter() {
        File(dir, "$fileName.plain.tmp").writeBytes(plainWallet(fill = 3).copyOf(20))
        val staleDir = File(dir, "$fileName.plain.tmp.1.1").apply { mkdir() }
        File(staleDir, "occupied").writeBytes(ByteArray(1))
        File(dir, "other.dat.plain.tmp").writeBytes(ByteArray(3))

        assertTrue(PlainWalletFile.write(dir, fileName, fill = filling(plainWallet())))

        assertArrayEquals(arrayOf("other.dat.plain.tmp", fileName), dir.list()?.sorted()?.toTypedArray())
    }

    @Test
    fun deleteTempsRemovesEveryTempOfTheName() {
        File(dir, "$fileName.plain.tmp").writeBytes(ByteArray(3))
        File(dir, "$fileName.plain.tmp.7.7").writeBytes(ByteArray(3))
        File(dir, fileName).writeBytes(plainWallet())
        PlainWalletFile.deleteTemps(dir, fileName)
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun writeRefusesATempThatIsNotAPlainWallet() {
        val existing = plainWallet()
        File(dir, fileName).writeBytes(existing)
        assertThrows(IOException::class.java) {
            PlainWalletFile.write(dir, fileName, fill = filling(envelopeLookalike))
        }
        assertArrayEquals(existing, File(dir, fileName).readBytes())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun anAbandonedWriteLeavesTheFinalPathAlone() {
        val existing = plainWallet()
        File(dir, fileName).writeBytes(existing)
        assertFalse(PlainWalletFile.write(dir, fileName) { false })
        assertArrayEquals(existing, File(dir, fileName).readBytes())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun aFillThatThrowsLeavesTheFinalPathAloneAndDropsTheTemp() {
        val existing = plainWallet()
        File(dir, fileName).writeBytes(existing)
        assertThrows(IOException::class.java) {
            PlainWalletFile.write(dir, fileName) { temp ->
                temp.writeBytes(plainWallet(fill = 3).copyOf(20))
                throw IOException("disk full")
            }
        }
        assertArrayEquals(existing, File(dir, fileName).readBytes())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }

    @Test
    fun isPlainAcceptsAPlainWallet() {
        File(dir, fileName).writeBytes(plainWallet())
        assertTrue(PlainWalletFile.isPlain(dir, fileName))
    }

    @Test
    fun isPlainRejectsAMissingFile() {
        assertFalse(PlainWalletFile.isPlain(dir, fileName))
    }

    @Test
    fun isPlainRejectsAnEnvelope() {
        File(dir, fileName).writeBytes(envelopeLookalike)
        assertFalse(PlainWalletFile.isPlain(dir, fileName))
    }

    @Test
    fun headerReadsAtMostSixteenBytes() {
        File(dir, fileName).writeBytes(plainWallet())
        assertArrayEquals(plainWallet().copyOf(16), PlainWalletFile.header(File(dir, fileName)))
        File(dir, fileName).writeBytes(ByteArray(3) { 1 })
        assertArrayEquals(ByteArray(3) { 1 }, PlainWalletFile.header(File(dir, fileName)))
        File(dir, fileName).writeBytes(ByteArray(0))
        assertArrayEquals(ByteArray(0), PlainWalletFile.header(File(dir, fileName)))
    }

    @Test
    fun aMigratingCopyBecomesMainWhenMainIsMissing() {
        val bytes = plainWallet()
        File(dir, "$fileName.migrating").writeBytes(bytes)
        PlainWalletFile.resolveInterruptedMigration(dir, fileName) { true }
        assertArrayEquals(bytes, File(dir, fileName).readBytes())
        assertFalse(File(dir, "$fileName.migrating").exists())
    }

    @Test
    fun aStaleMigratingCopyIsDroppedWhenMainIsIntact() {
        File(dir, fileName).writeBytes(plainWallet())
        File(dir, "$fileName.migrating").writeBytes(plainWallet(fill = 3))
        PlainWalletFile.resolveInterruptedMigration(dir, fileName) { true }
        assertFalse(File(dir, "$fileName.migrating").exists())
    }

    @Test
    fun theMigratingCopyStaysWhileMainIsNotYetPlain() {
        File(dir, fileName).writeBytes(envelopeLookalike)
        File(dir, "$fileName.migrating").writeBytes(plainWallet())
        PlainWalletFile.resolveInterruptedMigration(dir, fileName) { true }
        assertTrue(File(dir, "$fileName.migrating").exists())
        assertArrayEquals(envelopeLookalike, File(dir, fileName).readBytes())
    }

    @Test
    fun theMigratingCopyStaysWhileMainFailsTheFullParse() {
        val truncated = plainWallet().copyOf(20)
        File(dir, fileName).writeBytes(truncated)
        File(dir, "$fileName.migrating").writeBytes(plainWallet())
        PlainWalletFile.resolveInterruptedMigration(dir, fileName) { false }
        assertTrue(File(dir, "$fileName.migrating").exists())
        assertArrayEquals(truncated, File(dir, fileName).readBytes())
    }

    @Test
    fun nothingHappensWithNoFilesAtAll() {
        PlainWalletFile.resolveInterruptedMigration(dir, fileName) { true }
        assertArrayEquals(arrayOf<String>(), dir.list())
    }

    @Test
    fun aMigrationSkipsWhenTheFileTurnedPlainAlready() {
        val fresh = plainWallet(fill = 11)
        File(dir, fileName).writeBytes(fresh)
        var filled = false
        val migrated = PlainWalletFile.migrateIfStillLegacy(dir, fileName) { temp ->
            filled = true
            temp.writeBytes(plainWallet(fill = 3))
            true
        }
        assertFalse(migrated)
        assertFalse(filled)
        assertArrayEquals(fresh, File(dir, fileName).readBytes())
    }

    @Test
    fun aMigrationWritesWhenTheFileIsStillLegacy() {
        File(dir, fileName).writeBytes(envelopeLookalike)
        val bytes = plainWallet()
        assertTrue(PlainWalletFile.migrateIfStillLegacy(dir, fileName, fill = filling(bytes)))
        assertArrayEquals(bytes, File(dir, fileName).readBytes())
    }

    @Test
    fun concurrentWritersNeverLeaveAPartialFileAndNeverFail() {
        val a = plainWallet(fill = 3)
        val b = plainWallet(fill = 11)
        val failures = java.util.concurrent.CopyOnWriteArrayList<Throwable>()
        repeat(50) {
            val threads = listOf(a, b).map { bytes ->
                Thread { PlainWalletFile.write(dir, fileName, fill = filling(bytes)) }.apply {
                    setUncaughtExceptionHandler { _, e -> failures.add(e) }
                }
            }
            threads.forEach(Thread::start)
            threads.forEach(Thread::join)
            val survivor = File(dir, fileName).readBytes()
            assertTrue(survivor.contentEquals(a) || survivor.contentEquals(b))
        }
        assertTrue(failures.toString(), failures.isEmpty())
    }

    @Test
    fun anInstallDoesNotSweepATempAnotherWriterIsStillFilling() {
        val failures = java.util.concurrent.CopyOnWriteArrayList<Throwable>()
        val slow = Thread {
            PlainWalletFile.write(dir, fileName) { temp ->
                temp.writeBytes(plainWallet(fill = 3))
                Thread.sleep(300)
                true
            }
        }.apply { setUncaughtExceptionHandler { _, e -> failures.add(e) } }
        slow.start()
        Thread.sleep(100)
        PlainWalletFile.write(dir, fileName, fill = filling(plainWallet(fill = 11)))
        slow.join()
        assertTrue(failures.toString(), failures.isEmpty())
        assertArrayEquals(plainWallet(fill = 3), File(dir, fileName).readBytes())
        assertArrayEquals(arrayOf(fileName), dir.list())
    }
}
