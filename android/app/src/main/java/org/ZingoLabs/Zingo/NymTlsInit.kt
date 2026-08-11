package org.ZingoLabs.Zingo

import android.content.Context

/**
 * Hands the application [Context] to `rustls-platform-verifier` inside the
 * Nym proxy shim library, so the shim's TLS verifies against Android's own
 * certificate verifier (docs/adr/0004). Must run before the shim opens any
 * mixnet connection; calling it again is a no-op.
 */
object NymTlsInit {
    init {
        System.loadLibrary("zingo_nym_proxy_ffi")
    }

    external fun initPlatformVerifier(context: Context)
}
