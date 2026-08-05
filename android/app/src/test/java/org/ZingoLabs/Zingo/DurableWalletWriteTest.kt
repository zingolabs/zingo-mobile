package org.ZingoLabs.Zingo

import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DurableWalletWriteTest {
    @Test
    fun recoveryWaitsForAnInFlightReplacementFromAnotherWriter() {
        val store = Store(files = mutableMapOf("wallet.dat" to "old"))
        val replacementStarted = CountDownLatch(1)
        val allowReplacement = CountDownLatch(1)
        val saveError = AtomicReference<Throwable>()
        val savingWriter = writer(store) { fileName, content ->
            if (fileName == "wallet.dat") {
                replacementStarted.countDown()
                if (!allowReplacement.await(5, TimeUnit.SECONDS)) {
                    throw IOException("timed out waiting to replace $fileName")
                }
                store.files.remove(fileName)
                throw IOException("write failed $fileName")
            }
            store.write(fileName, content)
        }
        val recoveringWriter = writer(store)

        val saveThread = thread(start = true, name = "wallet-save") {
            try {
                savingWriter.save("wallet.dat", "new")
            } catch (error: Throwable) {
                saveError.set(error)
            }
        }
        assertTrue(replacementStarted.await(5, TimeUnit.SECONDS))

        val recoveryThread = thread(start = true, name = "wallet-recovery") {
            recoveringWriter.complete(listOf("wallet.dat"))
        }
        assertThreadBlocked(recoveryThread)

        allowReplacement.countDown()
        saveThread.join(5_000)
        recoveryThread.join(5_000)

        assertFalse(saveThread.isAlive)
        assertFalse(recoveryThread.isAlive)
        assertTrue(saveError.get() is IOException)
        assertEquals("old", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
    }

    @Test
    fun deleteRemovesTheRecoveryCopyBeforeTheTarget() {
        val store = Store(
            files = mutableMapOf(
                "wallet.dat" to "new",
                "wallet.dat.write.tmp" to "old",
            ),
        )

        assertTrue(writer(store).discard("wallet.dat"))

        assertFalse(store.files.containsKey("wallet.dat"))
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
        assertTrue(store.events.indexOf("delete:wallet.dat.write.tmp") < store.events.indexOf("delete:wallet.dat"))
    }

    @Test
    fun failedRecoveryCleanupKeepsTheTarget() {
        val store = Store(
            files = mutableMapOf(
                "wallet.dat" to "new",
                "wallet.dat.write.tmp" to "old",
            ),
        )
        store.deleteFailures += "wallet.dat.write.tmp"

        assertFalse(writer(store).discard("wallet.dat"))

        assertEquals("new", store.files["wallet.dat"])
        assertEquals("old", store.files["wallet.dat.write.tmp"])
    }

    @Test
    fun saveStashesPreviousContentBeforeReplacement() {
        val store = Store(files = mutableMapOf("wallet.dat" to "old"))

        writer(store).save("wallet.dat", "new")

        assertEquals("new", store.files["wallet.dat"])
        assertEquals("old", store.files["wallet.dat.write.tmp"])
        assertEquals(
            listOf(
                "exists:wallet.dat",
                "read:wallet.dat",
                "write:wallet.dat.write.tmp:old",
                "write:wallet.dat:new",
            ),
            store.events,
        )
    }

    @Test
    fun failedStashLeavesPreviousTargetUntouched() {
        val store = Store(files = mutableMapOf("wallet.dat" to "old"))
        store.writeFailures += "wallet.dat.write.tmp"

        val error = try {
            writer(store).save("wallet.dat", "new")
            null
        } catch (e: IOException) {
            e
        }

        assertNotNull(error)
        assertEquals("old", store.files["wallet.dat"])
        assertFalse(store.events.any { it == "write:wallet.dat:new" })
    }

    @Test
    fun saveReplacesAnUnreadableTargetWithoutARecoveryCopy() {
        val store = Store(files = mutableMapOf("wallet.dat" to "torn"))
        store.unreadable += "wallet.dat"
        val stashReadErrors = mutableListOf<Pair<String, Exception>>()

        writer(store, stashReadErrors = stashReadErrors).save("wallet.dat", "new")

        assertEquals("new", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
        assertEquals(1, stashReadErrors.size)
        assertEquals("wallet.dat", stashReadErrors.single().first)
    }

    @Test
    fun failedReplacementLeavesTheStashedCopy() {
        val store = Store(files = mutableMapOf("wallet.dat" to "old"))
        val durableWrite = writer(store) { fileName, content ->
            if (fileName == "wallet.dat") {
                store.files.remove(fileName)
                throw IOException("write failed $fileName")
            }
            store.write(fileName, content)
        }

        val error = try {
            durableWrite.save("wallet.dat", "new")
            null
        } catch (e: IOException) {
            e
        }

        assertNotNull(error)
        assertFalse(store.files.containsKey("wallet.dat"))
        assertEquals("old", store.files["wallet.dat.write.tmp"])

        writer(store).complete(listOf("wallet.dat"))

        assertEquals("old", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
    }

    @Test
    fun recoveryRestoresUnreadableTargetAndCleansTemp() {
        val store = Store(files = mutableMapOf("wallet.dat" to "torn", "wallet.dat.write.tmp" to "old"))
        store.unreadable += "wallet.dat"
        val errors = mutableListOf<Exception>()
        val recovered = mutableListOf<Pair<String, String>>()

        writer(store, errors, recovered).complete(listOf("wallet.dat"))

        assertEquals("old", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
        assertTrue(errors.isEmpty())
        assertEquals(listOf("wallet.dat" to "wallet.dat.write.tmp"), recovered)
        assertTrue(store.events.indexOf("write:wallet.dat:old") < store.events.indexOf("delete:wallet.dat.write.tmp"))
    }

    @Test
    fun recoveryKeepsValidTargetAndIsIdempotent() {
        val store = Store(files = mutableMapOf("wallet.dat" to "new", "wallet.dat.write.tmp" to "old"))
        val recovery = writer(store)

        recovery.complete(listOf("wallet.dat"))
        recovery.complete(listOf("wallet.dat"))

        assertEquals("new", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
        assertEquals(1, store.events.count { it == "delete:wallet.dat.write.tmp" })
        assertTrue(store.events.indexOf("durable:wallet.dat") < store.events.indexOf("delete:wallet.dat.write.tmp"))
    }

    @Test
    fun failedRestoreRetainsTempForTheNextLaunch() {
        val store = Store(files = mutableMapOf("wallet.dat.write.tmp" to "old"))
        store.writeFailures += "wallet.dat"
        val errors = mutableListOf<Exception>()
        val recovery = writer(store, errors)

        recovery.complete(listOf("wallet.dat"))

        assertTrue(store.files.containsKey("wallet.dat.write.tmp"))
        assertEquals(1, errors.size)

        store.writeFailures.clear()
        recovery.complete(listOf("wallet.dat"))

        assertEquals("old", store.files["wallet.dat"])
        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
    }

    @Test
    fun failedCleanupRetainsTempUntilCleanupSucceeds() {
        val store = Store(files = mutableMapOf("wallet.dat" to "new", "wallet.dat.write.tmp" to "old"))
        store.deleteFailures += "wallet.dat.write.tmp"
        val recovery = writer(store)

        recovery.complete(listOf("wallet.dat"))

        assertTrue(store.files.containsKey("wallet.dat.write.tmp"))
        assertEquals("new", store.files["wallet.dat"])

        store.deleteFailures.clear()
        recovery.complete(listOf("wallet.dat"))

        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
    }

    @Test
    fun failedDurabilityCheckRetainsTempUntilTheTargetIsSafe() {
        val store = Store(files = mutableMapOf("wallet.dat" to "new", "wallet.dat.write.tmp" to "old"))
        store.durabilityFailures += "wallet.dat"
        val errors = mutableListOf<Exception>()
        val recovery = writer(store, errors)

        recovery.complete(listOf("wallet.dat"))

        assertTrue(store.files.containsKey("wallet.dat.write.tmp"))
        assertEquals(1, errors.size)

        store.durabilityFailures.clear()
        recovery.complete(listOf("wallet.dat"))

        assertFalse(store.files.containsKey("wallet.dat.write.tmp"))
    }

    private fun writer(
        store: Store,
        errors: MutableList<Exception> = mutableListOf(),
        recovered: MutableList<Pair<String, String>> = mutableListOf(),
        stashReadErrors: MutableList<Pair<String, Exception>> = mutableListOf(),
        write: (String, String) -> Unit = store::write,
    ) = DurableWalletWrite(
        exists = store::exists,
        read = store::read,
        write = write,
        delete = store::delete,
        ensureDurable = store::ensureDurable,
        onStashReadError = { fileName, error -> stashReadErrors += fileName to error },
        onRecovered = { fileName, tempName -> recovered += fileName to tempName },
        onRecoveryError = { _, error -> errors += error },
    )

    private fun assertThreadBlocked(thread: Thread) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
        while (thread.isAlive && thread.state != Thread.State.BLOCKED && System.nanoTime() < deadline) {
            Thread.yield()
        }
        assertEquals(Thread.State.BLOCKED, thread.state)
    }

    private class Store(
        val files: MutableMap<String, String> = mutableMapOf(),
    ) {
        val events = mutableListOf<String>()
        val unreadable = mutableSetOf<String>()
        val writeFailures = mutableSetOf<String>()
        val deleteFailures = mutableSetOf<String>()
        val durabilityFailures = mutableSetOf<String>()

        fun exists(fileName: String): Boolean {
            events += "exists:$fileName"
            return files.containsKey(fileName)
        }

        fun read(fileName: String): String {
            events += "read:$fileName"
            if (fileName in unreadable) throw IOException("unreadable $fileName")
            return files[fileName] ?: throw IOException("missing $fileName")
        }

        fun write(fileName: String, content: String) {
            events += "write:$fileName:$content"
            if (fileName in writeFailures) throw IOException("write failed $fileName")
            files[fileName] = content
        }

        fun delete(fileName: String): Boolean {
            events += "delete:$fileName"
            if (fileName in deleteFailures) return false
            return files.remove(fileName) != null
        }

        fun ensureDurable(fileName: String) {
            events += "durable:$fileName"
            if (fileName in durabilityFailures) throw IOException("durability check failed $fileName")
        }
    }
}
