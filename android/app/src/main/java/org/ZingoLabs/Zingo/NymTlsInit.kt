package org.ZingoLabs.Zingo

import android.content.Context

/**
 * Hands the application [Context] to `rustls-platform-verifier` inside the
 * Nym proxy shim library — required once before the shim opens any mixnet
 * connection, and a no-op thereafter — so the shim's TLS verifies against
 * Android's own certificate verifier.
 */
object NymTlsInit {
    init {
        System.loadLibrary("zingo_nym_proxy_ffi")
    }

    external fun initPlatformVerifier(context: Context)
}
