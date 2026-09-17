package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.zingo.LoadException

/** The code and message a rejected wallet-file promise carries. */
data class Rejection(val code: String, val message: String)

/** A LoadException rejects under its variant name with its detail, any other throwable under "Host" with its message. */
fun rejectionOf(error: Throwable): Rejection = when (error) {
    is LoadException -> when (error) {
        is LoadException.Unreadable -> Rejection("Unreadable", error.detail)
        is LoadException.InvalidInput -> Rejection("InvalidInput", error.detail)
        is LoadException.Save -> Rejection("Save", error.detail)
        is LoadException.Panic -> Rejection("Panic", error.detail)
        is LoadException.Poisoned -> Rejection("Poisoned", error.detail)
        is LoadException.Busy -> Rejection("Busy", error.detail)
        is LoadException.Internal -> Rejection("Internal", error.detail)
    }
    else -> Rejection("Host", error.message ?: error.toString())
}

/** Runs `work` on the IO dispatcher and settles `promise` on `main`, resolving a Unit outcome as null. */
fun settling(
    promise: Promise,
    main: CoroutineDispatcher = Dispatchers.Main,
    work: suspend () -> Any?,
) {
    CoroutineScope(Dispatchers.IO).launch {
        val outcome = runCatching { work() }
        withContext(main) {
            outcome.fold(
                { promise.resolve(it.takeUnless { it == Unit }) },
                { error ->
                    val (code, message) = rejectionOf(error)
                    promise.reject(code, message, error)
                },
            )
        }
    }
}
