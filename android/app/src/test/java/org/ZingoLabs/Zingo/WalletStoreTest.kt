package org.ZingoLabs.Zingo

import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class WalletStoreTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var base: File

    private fun plainWallet(fill: Int = 7): ByteArray =
        ByteArray(64) { i -> if (i == 0) 42 else if (i < 8) 0 else (i * fill).toByte() }

    private fun committed(name: String, fill: Int = 7): String {
        val id = WalletStore.allocate(base)
        PlainWalletFile.write(WalletStore.dir(base, id), WalletStore.WALLET, plainWallet(fill))
        WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, name, "main", "https://zec.example"))
        return id
    }

    private fun walletFile(id: String) = File(WalletStore.dir(base, id), WalletStore.WALLET)

    @Before
    fun freshBase() {
        base = tmp.newFolder()
    }

    @Test
    fun `Tests that a wallet is listed once its meta is written`() {
        val id = WalletStore.allocate(base)
        PlainWalletFile.write(WalletStore.dir(base, id), WalletStore.WALLET, plainWallet())
        assertTrue(WalletStore.list(base).isEmpty())

        WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, "Wallet 1", "main", null))

        assertEquals(listOf(id), WalletStore.list(base).map { it.id })
    }

    @Test
    fun `Tests that the sweep drops a folder whose meta never landed`() {
        val kept = committed("Wallet 1")
        val unfinished = WalletStore.allocate(base)
        PlainWalletFile.write(WalletStore.dir(base, unfinished), WalletStore.WALLET, plainWallet())

        WalletStore.sweep(base, null)

        assertTrue(WalletStore.dir(base, kept).exists())
        assertFalse(WalletStore.dir(base, unfinished).exists())
    }

    @Test
    fun `Tests that the sweep keeps the folder of the wallet being created`() {
        val creating = WalletStore.allocate(base)

        WalletStore.sweep(base, creating)

        assertTrue(WalletStore.dir(base, creating).exists())
    }

    @Test
    fun `Tests that the sweep keeps a meta whose wallet file is missing`() {
        val id = committed("Wallet 1")
        walletFile(id).delete()

        WalletStore.sweep(base, null)

        assertEquals(listOf(id), WalletStore.list(base).map { it.id })
        assertFalse(WalletStore.list(base).single().hasFile)
    }

    @Test
    fun `Tests that the sweep ends a delete a crash interrupted`() {
        val id = committed("Wallet 1")
        WalletStore.dir(base, id).renameTo(File(WalletStore.root(base), "$id.deleting"))

        WalletStore.sweep(base, null)

        assertArrayEquals(arrayOf<String>(), WalletStore.root(base).list())
    }

    @Test
    fun `Tests that deleting the active wallet clears the pointer`() {
        val id = committed("Wallet 1")
        WalletStore.setActive(base, id)

        assertTrue(WalletStore.delete(base, id))

        assertNull(WalletStore.active(base))
        assertFalse(WalletStore.dir(base, id).exists())
    }

    @Test
    fun `Tests that deleting another wallet keeps the active one`() {
        val active = committed("Wallet 1")
        val other = committed("Wallet 2")
        WalletStore.setActive(base, active)

        WalletStore.delete(base, other)

        assertEquals(active, WalletStore.active(base))
    }

    @Test
    fun `Tests that the active pointer reads empty when its folder is gone`() {
        val id = committed("Wallet 1")
        WalletStore.setActive(base, id)
        WalletStore.dir(base, id).deleteRecursively()

        assertNull(WalletStore.active(base))
    }

    @Test
    fun `Tests that wallets list in the order they were added`() {
        val first = committed("B")
        val second = committed("A")

        assertEquals(listOf(first, second), WalletStore.list(base).map { it.id })
        assertEquals(listOf(1, 2), WalletStore.list(base).map { it.meta.getInt("order") })
    }

    @Test
    fun `Tests that the default name takes the lowest free number`() {
        committed("Wallet 1")
        committed("Wallet 3")

        assertEquals("Wallet 2", WalletStore.defaultName(base))
    }

    @Test
    fun `Tests that a legacy wallet moves into an active folder with its meta`() {
        File(base, "wallet.dat").writeBytes(plainWallet())

        val id = WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", "https://zec.example")!!

        assertFalse(File(base, "wallet.dat").exists())
        assertArrayEquals(plainWallet(), walletFile(id).readBytes())
        assertEquals(id, WalletStore.active(base))
        val meta = WalletStore.list(base).single().meta
        assertEquals("Wallet 1", meta.getString("name"))
        assertEquals("main", meta.getString("chain"))
        assertEquals("https://zec.example", meta.getJSONObject("server").getString("uri"))
    }

    @Test
    fun `Tests that a legacy backup moves in without becoming active`() {
        File(base, "wallet.dat").writeBytes(plainWallet(3))
        File(base, "wallet.backup.dat").writeBytes(plainWallet(11))

        val main = WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", null)
        val backup = WalletStore.adoptLegacy(base, "wallet.backup.dat", "Wallet Backup", false, "main", null)

        assertEquals(main, WalletStore.active(base))
        assertEquals(listOf("Wallet 1", "Wallet Backup"), WalletStore.list(base).map { it.meta.getString("name") })
        assertArrayEquals(plainWallet(11), walletFile(backup!!).readBytes())
    }

    @Test
    fun `Tests that a legacy wallet takes the lowest free name when its own is in use`() {
        val open = committed("Wallet 1")
        WalletStore.setActive(base, open)
        File(base, "wallet.dat").writeBytes(plainWallet(3))

        val id = WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", null)!!

        assertEquals("Wallet 2", WalletStore.list(base).single { it.id == id }.meta.getString("name"))
        assertEquals(open, WalletStore.active(base))
    }

    @Test
    fun `Tests that a migration resumes into the same folder when a crash left the file behind`() {
        File(base, "wallet.dat").writeBytes(plainWallet())
        val digest = PlainWalletFile.digest(base, "wallet.dat").joinToString("") { "%02x".format(it) }
        val id = WalletStore.allocate(base)
        WalletStore.writeMeta(
            base, id, WalletStore.newMeta(base, id, "Wallet 1", "main", null).put("migratedFrom", digest),
        )
        WalletStore.setActive(base, id)

        val resumed = WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", null)

        assertEquals(id, resumed)
        assertEquals(1, WalletStore.list(base).size)
        assertArrayEquals(plainWallet(), walletFile(id).readBytes())
    }

    @Test
    fun `Tests that the migrating copy moves in beside the wallet it belongs to`() {
        File(base, "wallet.dat").writeBytes(plainWallet(3))
        File(base, "wallet.dat.migrating").writeBytes(plainWallet(11))

        val id = WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", null)!!

        assertFalse(File(base, "wallet.dat.migrating").exists())
        assertArrayEquals(plainWallet(11), File(WalletStore.dir(base, id), "wallet.dat.migrating").readBytes())
    }

    @Test
    fun `Tests that nothing moves when no legacy file exists`() {
        assertNull(WalletStore.adoptLegacy(base, "wallet.dat", "Wallet 1", true, "main", null))
        assertFalse(WalletStore.root(base).exists())
    }

    @Test
    fun `Tests that a meta that does not parse still lists its wallet`() {
        val id = committed("Wallet 1")
        File(WalletStore.dir(base, id), WalletStore.META).writeText("{")

        assertEquals(JSONObject().toString(), WalletStore.list(base).single().meta.toString())
    }

    @Test
    fun `Tests that a patch sets and removes fields but never the store's own`() {
        val id = committed("Wallet 1")
        val meta = WalletStore.list(base).single().meta.put("migratedFrom", "abc").put("category", 2)
        val patch = JSONObject()
            .put("name", "Savings")
            .put("category", JSONObject.NULL)
            .put("id", "other")
            .put("v", 9)
            .put("migratedFrom", "def")

        val patched = WalletStore.patchMeta(meta, patch)

        assertEquals("Savings", patched.getString("name"))
        assertFalse(patched.has("category"))
        assertEquals(id, patched.getString("id"))
        assertEquals(1, patched.getInt("v"))
        assertEquals("abc", patched.getString("migratedFrom"))
        assertEquals(2, meta.getInt("category"))
    }

    @Test
    fun `Tests that a new wallet's meta carries its kind when given`() {
        val id = WalletStore.allocate(base)

        assertEquals("ufvk", WalletStore.newMeta(base, id, "Wallet 1", "main", null, "ufvk").getString("kind"))
        assertFalse(WalletStore.newMeta(base, id, "Wallet 1", "main", null).has("kind"))
    }

    @Test
    fun `Tests that the info lists the wallets in order with the active one`() {
        val first = committed("Wallet 1")
        val second = committed("Wallet 2")
        WalletStore.setActive(base, second)

        val info = WalletStore.info(base)

        assertEquals(second, info.getString("active"))
        val wallets = info.getJSONArray("wallets")
        assertEquals(first, wallets.getJSONObject(0).getString("id"))
        assertEquals("Wallet 2", wallets.getJSONObject(1).getJSONObject("meta").getString("name"))
        assertTrue(wallets.getJSONObject(1).getBoolean("hasFile"))
    }

    @Test
    fun `Tests that the info reports no active wallet as null when there is none`() {
        assertTrue(WalletStore.info(base).isNull("active"))
    }

    @Test
    fun `Tests that the first wallet is the active one when the pointer names none`() {
        val first = committed("Wallet 1")
        val second = committed("Wallet 2")
        WalletStore.setActive(base, second)

        WalletStore.delete(base, second)

        assertEquals(first, WalletStore.active(base))
    }

    @Test
    fun `Tests that the largest wallet is the biggest file on disk`() {
        val small = committed("Wallet 1")
        val big = committed("Wallet 2")
        walletFile(big).writeBytes(ByteArray(500))

        assertEquals(500L, WalletStore.largestWallet(base))
        assertEquals(64L, walletFile(small).length())
    }

    @Test
    fun `Tests that a full storage is told apart from other write failures`() {
        val errno = RuntimeException("write failed: ENOSPC (No space left on device)")

        assertTrue(WalletStore.isDiskFull(java.io.IOException("wrapped", errno)))
        assertTrue(WalletStore.isDiskFull(java.io.IOException("No space left on device")))
        assertFalse(WalletStore.isDiskFull(java.io.IOException("Permission denied")))
    }
}
