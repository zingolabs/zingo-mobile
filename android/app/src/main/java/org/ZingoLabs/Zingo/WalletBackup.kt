package org.ZingoLabs.Zingo

import java.util.Base64

/**
 * Classifies wallet-file content read back from disk before
 * restoreExistingWalletBackup swaps it into place — the same guard the
 * iOS bridge's WalletExport.isValidBase64 gives its restore path. The
 * wallet files store canonical standard-alphabet base64, so restorable
 * content is recognized by structure alone, never by sentinel
 * (zingo-mobile#1151). Pure — no I/O, no logging, no Android
 * dependencies — so it runs under plain JVM unit tests.
 */
object WalletBackup {
    // Canonical: exactly the strings the encoder emits and the Rust
    // STANDARD engine accepts, checked by decode/re-encode round-trip.
    // (The JDK decoder alone tolerates non-zero trailing padding bits,
    // which Rust rejects.)
    fun isRestorable(content: String): Boolean {
        val decoded = try {
            Base64.getDecoder().decode(content)
        } catch (_: IllegalArgumentException) {
            return false
        }
        return content.isNotEmpty() &&
            Base64.getEncoder().encodeToString(decoded) == content
    }
}
