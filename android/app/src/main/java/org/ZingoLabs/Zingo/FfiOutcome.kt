package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise

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
    }
}
