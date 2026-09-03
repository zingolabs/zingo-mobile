package org.ZingoLabs.Zingo

import android.content.Context
import java.io.File

/**
 * Fixture bytes for the wallet-file tests: the loaded wallet streamed
 * through the save entry point into a scratch file and read back.
 */
object WalletFixtures {
    fun savedWalletBytes(context: Context): ByteArray {
        val scratch = File(context.cacheDir, "fixture-wallet.dat")
        try {
            check(uniffi.zingo.saveWalletFile(scratch.path)) { "an initialized wallet always saves" }
            return scratch.readBytes()
        } finally {
            scratch.delete()
        }
    }
}
