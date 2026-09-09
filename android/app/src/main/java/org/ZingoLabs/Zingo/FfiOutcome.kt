package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * The outcome of an FFI call, classified by channel alone
 * (zingo-mobile#1151): the value a call returns is Resolved verbatim —
 * never inspected for an error sentinel — and a thrown exception is
 * Rejected under a stable code, the ZingolibError variant name. Both
 * bridges reject the same shape: the variant code and the error's own
 * message verbatim; the FFI's call name rides the outcome only for
 * diagnostics. No outcome is ever encoded as prose inside the success
 * channel.
 *
 * Classification (`of`) is pure — no I/O, no logging, no Android
 * dependencies — so it runs under plain JVM unit tests. Settling touches
 * only the React Native Promise interface.
 */
sealed class FfiOutcome {
    data class Resolved(val value: Any?) : FfiOutcome()

    data class Rejected(val code: String, val call: String, val error: Exception) : FfiOutcome()

    fun settle(promise: Promise) {
        when (this) {
            is Resolved -> promise.resolve(value)
            // The code is the stable variant name the JS layer switches
            // on; the message crosses verbatim, the shape the iOS bridge
            // rejects with.
            is Rejected -> promise.reject(code, error.message ?: code, error)
        }
    }

    companion object {
        /**
         * The stable rejection code: the ZingolibError variant name, read
         * off the generated exception subclass — uniffi names each
         * subclass of the sealed ZingolibException exactly after its Rust
         * variant, so a variant added in Rust is covered here without
         * enumeration. The derivation is total: anything outside the
         * typed family is "Unknown".
         */
        fun codeOf(error: Exception): String =
            if (error is uniffi.zingo.ZingolibException) error.javaClass.simpleName else "Unknown"

        fun of(call: String, ffi: () -> Any?): FfiOutcome = try {
            Resolved(ffi())
        } catch (e: Exception) {
            Rejected(codeOf(e), call, e)
        }

        /**
         * Classifies `ffi` and settles `promise` with its outcome — the
         * one dispatch seam for every bridge method with no dispatch needs
         * of its own. The contract: `ffi` runs on the IO dispatcher, never
         * on the calling (React Native native-modules) thread, and the
         * promise settles on `main` — the pattern the sync family
         * established. React Native serializes all native-module calls onto
         * one thread, so a slow FFI — a wallet save, a server dial — must
         * not stall every other bridge call behind it.
         */
        fun settling(
            promise: Promise,
            call: String,
            main: CoroutineDispatcher = Dispatchers.Main,
            ffi: () -> Any?,
        ) {
            CoroutineScope(Dispatchers.IO).launch {
                val outcome = of(call, ffi)
                withContext(main) {
                    outcome.settle(promise)
                }
            }
        }
    }
}
