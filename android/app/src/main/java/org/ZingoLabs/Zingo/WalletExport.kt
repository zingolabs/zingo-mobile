package org.ZingoLabs.Zingo

/**
 * The outcome of classifying the string the `saveToB64` FFI returns on its
 * success channel. Whether a save succeeded must be knowable from this type,
 * never from re-inspecting the string's content downstream
 * (zingo-mobile#1151; audit Issue Q).
 */
sealed class WalletExportClassification {
    /** The wallet reported that nothing needs saving; not a failure. */
    object NoSaveNeeded : WalletExportClassification()

    /** A well-formed base64 wallet export, safe to persist. */
    data class ValidExport(val base64: String) : WalletExportClassification()

    /** Content that cannot be a wallet export; persisting it would corrupt the wallet file. */
    data class Invalid(val reason: String) : WalletExportClassification()
}

/**
 * Pure classification of wallet-export strings: no I/O, no logging, no
 * Android dependencies, so it runs under plain JVM unit tests.
 */
object WalletExport {
    fun classify(b64encoded: String): WalletExportClassification = when {
        b64encoded.isEmpty() ->
            WalletExportClassification.NoSaveNeeded
        !isValidBase64(b64encoded) ->
            WalletExportClassification.Invalid("The Encoded content is incorrect.")
        else ->
            WalletExportClassification.ValidExport(b64encoded)
    }

    // Quick local Base64 well-formedness check. Used as a defensive guard so we
    // never overwrite the wallet file with arbitrary text the Rust side might
    // accidentally return (e.g. "the library is broken"). We do this in Kotlin
    // rather than re-sending the whole Base64 payload back to Rust because the
    // round-trip allocates two extra full-size copies of the string
    // (Java→native via RustBuffer + native→Java again for the result), which
    // OOM-crashes on low-RAM 32-bit devices when wallets are large.
    fun isValidBase64(s: String): Boolean {
        if (s.isEmpty() || s.length % 4 != 0) return false
        var sawPadding = false
        for (c in s) {
            when {
                c == '=' -> sawPadding = true
                sawPadding -> return false
                c in 'A'..'Z' -> {}
                c in 'a'..'z' -> {}
                c in '0'..'9' -> {}
                c == '+' || c == '/' -> {}
                else -> return false
            }
        }
        return true
    }
}
