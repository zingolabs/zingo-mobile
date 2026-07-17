package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * The outcome of an FFI call, classified by channel alone
 * (zingo-mobile#1151): the value a call returns is Resolved verbatim —
 * never inspected for an error sentinel — and a thrown exception is
 * Rejected under the FFI's name. No outcome is ever encoded as prose
 * inside the success channel.
 *
 * Classification (`of`) is pure — no I/O, no logging, no Android
 * dependencies — so it runs under plain JVM unit tests. Settling touches
 * only the React Native Promise interface.
 */
sealed class FfiOutcome {
    data class Resolved(val value: Any?) : FfiOutcome()

    data class Rejected(val code: String, val error: Exception) : FfiOutcome()

    fun settle(promise: Promise) {
        when (this) {
            is Resolved -> promise.resolve(value)
            is Rejected -> promise.reject(code, error)
        }
    }

    companion object {
        fun of(code: String, call: () -> Any?): FfiOutcome = try {
            Resolved(call())
        } catch (e: Exception) {
            Rejected(code, e)
        }

        /**
         * Classifies `call` and settles `promise` with its outcome — the
         * one dispatch seam for every bridge method with no dispatch needs
         * of its own. The contract: `call` runs on the IO dispatcher, never
         * on the calling (React Native native-modules) thread, and the
         * promise settles on `main` — the pattern the sync family
         * established. React Native serializes all native-module calls onto
         * one thread, so a slow FFI — a wallet save, a server dial — must
         * not stall every other bridge call behind it.
         */
        @Suppress("UNUSED_PARAMETER")
        fun settling(
            promise: Promise,
            code: String,
            main: CoroutineDispatcher = Dispatchers.Main,
            call: () -> Any?,
        ) {
            of(code, call).settle(promise)
        }
    }
}
