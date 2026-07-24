package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import uniffi.zingo_nym_proxy_ffi.MixnetProxyHandle
import uniffi.zingo_nym_proxy_ffi.ProxyDeathObserver
import uniffi.zingo_nym_proxy_ffi.ProxyDeathReason

/**
 * The platform half of Mixnet Mode on Android (send-over-nym step 3,
 * zingolib#2513): hosts the UniFFI proxy shim (`uniffi.zingo_nym_proxy_ffi`)
 * inside the app process and offers its local SOCKS5 endpoint to the app
 * layer, which hands it to the wallet's `attach_mixnet` seam. The shim is a
 * UniFFI component distinct from the wallet's (`uniffi.zingo`) by ratified
 * decision — the loopback socket, not a shared compile unit, is the boundary
 * between the two lockfile-incompatible stacks.
 *
 * Lifecycle: `startMixnetTransport` (re)starts the proxy and resolves the
 * endpoint as `host:port`; `stopMixnetTransport` is the deliberate teardown.
 * A proxy that dies on its own is observed by the shim's liveness monitor;
 * the observer clears the stored handle so a later re-enable starts afresh,
 * while the wallet's own probe surfaces the `died` mode the app polls.
 *
 * Failures settle out of band in the error channel (zingo-mobile ADRs 0002
 * and 0003): the promise rejects under this module's name, never prose in
 * the data payload. JVM `Error`s from shim linkage are converted to
 * exceptions at this boundary because a build whose APK carries no shim
 * library must degrade fail-closed — an `UnsatisfiedLinkError` becomes a
 * rejected start, sends stay blocked, and the app survives to offer
 * re-enable or the clearnet consent path.
 */
class NymTransportModule internal constructor(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "NymTransportModule"
    }

    companion object {
        // One proxy per app process, shared across React context reloads.
        private val handleLock = Any()
        private var handle: MixnetProxyHandle? = null

        private fun clearHandle() {
            synchronized(handleLock) {
                handle = null
            }
        }
    }

    /**
     * The proxy-owner-remediates contract: a death report only clears the
     * stored handle (its endpoint is dead, so it must not be stopped or
     * reused). Recovery stays with the user-driven re-enable; the wallet's
     * own liveness probe lands the `died` mode the app is already polling.
     */
    private class HandleClearingObserver : ProxyDeathObserver {
        override fun onDeath(reason: ProxyDeathReason) {
            clearHandle()
        }
    }

    /**
     * Runs `call`, converting JVM `Error`s (a missing or mismatched shim
     * library) into exceptions so [FfiOutcome] settles them as rejections
     * instead of the process dying.
     */
    private fun <T> guardingLinkage(call: () -> T): T = try {
        call()
    } catch (error: Error) {
        throw IllegalStateException("the nym proxy shim is unavailable", error)
    }

    @ReactMethod
    fun startMixnetTransport(promise: Promise) {
        FfiOutcome.settling(promise, "start_mixnet_transport") {
            guardingLinkage {
                synchronized(handleLock) {
                    handle?.stop()
                    val started = MixnetProxyHandle.start(HandleClearingObserver())
                    handle = started
                    val endpoint = started.socks5Endpoint()
                    "${endpoint.host}:${endpoint.port}"
                }
            }
        }
    }

    @ReactMethod
    fun stopMixnetTransport(promise: Promise) {
        FfiOutcome.settling(promise, "stop_mixnet_transport") {
            guardingLinkage {
                synchronized(handleLock) {
                    handle?.stop()
                    handle = null
                }
            }
            null
        }
    }
}
