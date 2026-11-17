package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class AppFilesTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var dir: File

    @Before
    fun freshDir() {
        dir = tmp.newFolder()
    }

    @Test
    fun `Tests that a written file reads back the same text when it is read`() {
        AppFiles.write(dir, "settings.json", """{"language":"es"}""")

        assertTrue(AppFiles.exists(dir, "settings.json"))
        assertEquals("""{"language":"es"}""", AppFiles.read(dir, "settings.json"))
    }

    @Test
    fun `Tests that a write replaces the whole file and leaves no temp file when it lands`() {
        AppFiles.write(dir, "addressbook.json", "[1,2,3,4,5,6,7,8,9]")
        AppFiles.write(dir, "addressbook.json", "[]")

        assertEquals("[]", AppFiles.read(dir, "addressbook.json"))
        assertFalse(File(dir, "addressbook.json.tmp").exists())
    }

    @Test
    fun `Tests that a missing file does not exist when nothing wrote it`() {
        assertFalse(AppFiles.exists(dir, "background.json"))
    }

    @Test
    fun `Tests that a wallet file or a path is refused when it is not an app file`() {
        listOf("wallet.dat", "../settings.json", "sub/settings.json").forEach { name ->
            assertThrows(IllegalArgumentException::class.java) { AppFiles.write(dir, name, "x") }
            assertThrows(IllegalArgumentException::class.java) { AppFiles.read(dir, name) }
            assertThrows(IllegalArgumentException::class.java) { AppFiles.exists(dir, name) }
        }
        assertFalse(File(dir, "wallet.dat").exists())
    }
}
