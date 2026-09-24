package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import uniffi.zingo.ZingolibException

/**
 * The settle half of the bridge-outcome contract: a Resolved outcome
 * resolves the promise with the value verbatim, a Rejected outcome
 * rejects with the three-arg shape the JS layer reads — the stable
 * variant code, the error's message verbatim (falling back to the code
 * when the platform exception carries none), and the throwable itself —
 * and every outcome settles the promise exactly once.
 */
class FfiOutcomeSettleTest {
    private class RecordingPromise : Promise {
        var resolved: MutableList<Any?> = mutableListOf()
        var rejections: MutableList<Triple<String?, String?, Throwable?>> = mutableListOf()
        val latch = CountDownLatch(1)

        val settleCount: Int
            get() = resolved.size + rejections.size

        private fun record(code: String?, message: String?, throwable: Throwable?) {
            rejections.add(Triple(code, message, throwable))
            latch.countDown()
        }

        override fun resolve(value: Any?) {
            resolved.add(value)
            latch.countDown()
        }

        override fun reject(code: String, message: String?, throwable: Throwable?) =
            record(code, message, throwable)

        override fun reject(code: String, message: String?) = record(code, message, null)

        override fun reject(code: String, throwable: Throwable?) = record(code, null, throwable)

        override fun reject(throwable: Throwable) = record(null, null, throwable)

        override fun reject(throwable: Throwable, userInfo: WritableMap) =
            record(null, null, throwable)

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
    }

    @Test
    fun resolvedSettlesTheValueVerbatimExactlyOnce() {
        val promise = RecordingPromise()
        // The value deliberately wears the historical error sentinel:
        // settling must pass it through, never re-classify by content.
        FfiOutcome.Resolved("Error: looks like prose but is legitimate data").settle(promise)
        assertEquals(listOf<Any?>("Error: looks like prose but is legitimate data"), promise.resolved)
        assertEquals(1, promise.settleCount)
    }

    @Test
    fun rejectedSettlesCodeMessageAndThrowable() {
        val promise = RecordingPromise()
        val failure = ZingolibException.MigrationConsentStale("plan hash moved")
        FfiOutcome.of("start_ironwood_migration") { throw failure }.settle(promise)
        val (code, message, throwable) = promise.rejections.single()
        assertEquals("MigrationConsentStale", code)
        assertEquals("the message must cross verbatim", "plan hash moved", message)
        assertSame(failure, throwable)
        assertEquals(1, promise.settleCount)
    }

    @Test
    fun aMessagelessPlatformExceptionFallsBackToTheCode() {
        val promise = RecordingPromise()
        val failure = IllegalStateException()
        FfiOutcome.of("get_version") { throw failure }.settle(promise)
        val (code, message, _) = promise.rejections.single()
        assertEquals("Unknown", code)
        assertEquals("Unknown", message)
    }

    @Test
    fun settlingRunsTheFfiOffThreadAndSettlesOnMain() {
        val promise = RecordingPromise()
        val callerThread = Thread.currentThread()
        var ffiThread: Thread? = null
        FfiOutcome.settling(promise, "get_version", main = Dispatchers.Unconfined) {
            ffiThread = Thread.currentThread()
            "data"
        }
        assertTrue(
            "settling must settle the promise",
            promise.latch.await(5, TimeUnit.SECONDS),
        )
        assertEquals(listOf<Any?>("data"), promise.resolved)
        assertTrue(
            "the FFI must not run on the calling thread",
            ffiThread != null && ffiThread !== callerThread,
        )
    }
}
