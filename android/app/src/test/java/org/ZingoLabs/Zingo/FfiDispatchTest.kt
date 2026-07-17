package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * The dispatch contract for every bridge method that settles through
 * FfiOutcome.settling: the FFI call runs off the calling thread — React
 * Native serializes all native-module calls onto one thread, so a slow
 * FFI otherwise stalls every other bridge call behind it — and the
 * promise settles on the main dispatcher, the pattern the sync family
 * established.
 */
class FfiDispatchTest {
    /** Records the thread every settle path lands on; nothing more. */
    private class RecordingPromise(private val onSettle: () -> Unit) : Promise {
        override fun resolve(value: Any?) = onSettle()

        override fun reject(code: String, message: String?) = onSettle()

        override fun reject(code: String, throwable: Throwable?) = onSettle()

        override fun reject(code: String, message: String?, throwable: Throwable?) = onSettle()

        override fun reject(throwable: Throwable) = onSettle()

        override fun reject(throwable: Throwable, userInfo: WritableMap) = onSettle()

        override fun reject(code: String, userInfo: WritableMap) = onSettle()

        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) = onSettle()

        override fun reject(code: String, message: String?, userInfo: WritableMap) = onSettle()

        override fun reject(
            code: String?,
            message: String?,
            throwable: Throwable?,
            userInfo: WritableMap?,
        ) = onSettle()

        @Deprecated("Prefer passing a module-specific error code to JS")
        override fun reject(message: String) = onSettle()
    }

    @Test
    fun runsTheCallOffTheCallerThreadAndSettlesOnMain() {
        Executors.newSingleThreadExecutor { task -> Thread(task, "test-main") }
            .asCoroutineDispatcher().use { mainSurrogate ->
                val mainThread = runBlocking(mainSurrogate) { Thread.currentThread() }
                val callerThread = Thread.currentThread()
                val callThread = AtomicReference<Thread>()
                val settleThread = AtomicReference<Thread>()
                val settled = CountDownLatch(1)

                FfiOutcome.settling(
                    RecordingPromise {
                        settleThread.set(Thread.currentThread())
                        settled.countDown()
                    },
                    "get_version",
                    mainSurrogate,
                ) {
                    callThread.set(Thread.currentThread())
                    "1.0.0"
                }

                assertTrue("the promise must settle", settled.await(10, TimeUnit.SECONDS))
                assertNotEquals(
                    "the FFI call must leave the caller thread",
                    callerThread,
                    callThread.get(),
                )
                assertEquals(
                    "the settle must land on the main dispatcher",
                    mainThread,
                    settleThread.get(),
                )
            }
    }
}
