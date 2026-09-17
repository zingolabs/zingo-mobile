package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import uniffi.zingo.LoadException

class SettleTest {
    private class RecordingPromise : Promise {
        val resolved = mutableListOf<Any?>()
        val rejections = mutableListOf<Triple<String?, String?, Throwable?>>()
        val latch = CountDownLatch(1)
        val settleThread = AtomicReference<Thread>()

        private fun record(code: String?, message: String?, throwable: Throwable?) {
            rejections.add(Triple(code, message, throwable))
            settleThread.set(Thread.currentThread())
            latch.countDown()
        }

        override fun resolve(value: Any?) {
            resolved.add(value)
            settleThread.set(Thread.currentThread())
            latch.countDown()
        }

        override fun reject(code: String, message: String?, throwable: Throwable?) =
            record(code, message, throwable)

        override fun reject(code: String, message: String?) = record(code, message, null)

        override fun reject(code: String, throwable: Throwable?) = record(code, null, throwable)

        override fun reject(throwable: Throwable) = record(null, null, throwable)

        override fun reject(throwable: Throwable, userInfo: WritableMap) = record(null, null, throwable)

        override fun reject(code: String, userInfo: WritableMap) = record(code, null, null)

        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) =
            record(code, null, throwable)

        override fun reject(code: String, message: String?, userInfo: WritableMap) =
            record(code, message, null)

        override fun reject(
            code: String?,
            message: String?,
            throwable: Throwable?,
            userInfo: WritableMap?,
        ) = record(code, message, throwable)

        @Deprecated("Deprecated in the React Native Promise interface")
        override fun reject(message: String) = record(null, message, null)

        fun awaitSettled() {
            assertTrue("the promise must settle", latch.await(10, TimeUnit.SECONDS))
        }
    }

    /** Tests that a LoadException rejects under its variant name and carries only its detail, whichever of the seven variants is thrown. */
    @Test
    fun loadExceptionRejectsUnderItsVariantNameWithItsDetail() {
        val variants = mapOf(
            "Unreadable" to LoadException.Unreadable("bad header"),
            "InvalidInput" to LoadException.InvalidInput("bad header"),
            "Save" to LoadException.Save("bad header"),
            "Panic" to LoadException.Panic("bad header"),
            "Poisoned" to LoadException.Poisoned("bad header"),
            "Busy" to LoadException.Busy("bad header"),
            "Internal" to LoadException.Internal("bad header"),
        )
        for ((code, error) in variants) {
            assertEquals(Rejection(code, "bad header"), rejectionOf(error))
        }
    }

    /** Tests that a throwable outside the load family rejects under Host with its own message. */
    @Test
    fun hostThrowableRejectsUnderHostWithItsMessage() {
        assertEquals(
            Rejection("Host", "wallet.dat does not exist"),
            rejectionOf(java.io.FileNotFoundException("wallet.dat does not exist")),
        )
    }

    /** Tests that a messageless throwable rejects under Host with its string form when it carries no message. */
    @Test
    fun messagelessThrowableRejectsWithItsStringForm() {
        val error = IllegalStateException()
        assertEquals(Rejection("Host", error.toString()), rejectionOf(error))
    }

    /** Tests that settling resolves the work's value verbatim when the work returns. */
    @Test
    fun settlingResolvesTheValueWhenTheWorkReturns() {
        val promise = RecordingPromise()
        settling(promise, main = Dispatchers.Unconfined) { true }
        promise.awaitSettled()
        assertEquals(listOf<Any?>(true), promise.resolved)
        assertTrue(promise.rejections.isEmpty())
    }

    /** Tests that settling resolves null when the work returns Unit, since the bridge cannot carry Unit. */
    @Test
    fun settlingResolvesNullWhenTheWorkReturnsUnit() {
        val promise = RecordingPromise()
        settling(promise, main = Dispatchers.Unconfined) { }
        promise.awaitSettled()
        assertEquals(1, promise.resolved.size)
        assertNull(promise.resolved.single())
    }

    /** Tests that settling rejects with the variant code, the detail, and the throwable itself when the work throws a LoadException. */
    @Test
    fun settlingRejectsWithCodeDetailAndThrowableWhenTheWorkThrows() {
        val promise = RecordingPromise()
        val error = LoadException.Unreadable("truncated at byte 40")
        settling(promise, main = Dispatchers.Unconfined) { throw error }
        promise.awaitSettled()
        val (code, message, throwable) = promise.rejections.single()
        assertEquals("Unreadable", code)
        assertEquals("truncated at byte 40", message)
        assertSame(error, throwable)
        assertTrue(promise.resolved.isEmpty())
    }

    /** Tests that the work runs off the calling thread and the promise settles on the main dispatcher when settling is invoked. */
    @Test
    fun settlingRunsTheWorkOffThreadAndSettlesOnMain() {
        Executors.newSingleThreadExecutor { task -> Thread(task, "test-main") }
            .asCoroutineDispatcher().use { mainSurrogate ->
                val mainThread = runBlocking(mainSurrogate) { Thread.currentThread() }
                val callerThread = Thread.currentThread()
                val workThread = AtomicReference<Thread>()
                val promise = RecordingPromise()

                settling(promise, mainSurrogate) {
                    workThread.set(Thread.currentThread())
                    "1.0.0"
                }

                promise.awaitSettled()
                assertNotEquals(callerThread, workThread.get())
                assertEquals(mainThread, promise.settleThread.get())
            }
    }
}
