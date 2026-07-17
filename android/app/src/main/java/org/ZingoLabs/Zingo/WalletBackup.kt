package org.ZingoLabs.Zingo

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
    // The red half of a red-to-green pair: today the restore path
    // validates nothing, so everything is restorable. The green half
    // replaces this with the structural check the tests pin.
    @Suppress("UNUSED_PARAMETER", "FunctionOnlyReturningConstant")
    fun isRestorable(content: String): Boolean = true
}
