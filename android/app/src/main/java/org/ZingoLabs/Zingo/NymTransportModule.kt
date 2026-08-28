package org.ZingoLabs.Zingo

import com.facebook.react.bridge.Arguments
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
 * Lifecycle: `startMixnetTransport` (re)starts the proxy and resolves its
 * binding — the `host:port` endpoint and the Exit Node it bound, both of
 * which the wallet's attach seam requires; `stopMixnetTransport` is the
 * deliberate teardown.
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
/**
 * The identity decision for a proxy death report (zingo-mobile#1227): a
 * death may clear only the handle its observer was started for. A closed
 * union so the observer must render both verdicts.
 */
internal sealed interface HandleDeathVerdict {
    /** The stored handle is the one that died; clear it. */
    data object ClearStored : HandleDeathVerdict

    /** The stored handle is a replacement (or absent); leave it running. */
    data object RetainStored : HandleDeathVerdict
}

/**
 * Pure: the stored handle is cleared only when it is identically the one
 * the reporting observer watched. Reference identity is the contract —
 * every start stores the exact instance it created.
 */
internal fun <T : Any> verdictOnDeath(stored: T?, watched: T?): HandleDeathVerdict =
    if (stored != null && stored === watched) {
        HandleDeathVerdict.ClearStored
    } else {
        HandleDeathVerdict.RetainStored
    }

class NymTransportModule internal constructor(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "NymTransportModule"
    }

    companion object {
        // One proxy per app process, shared across React context reloads.
        private val handleLock = Any()
        private var handle: MixnetProxyHandle? = null

        /**
         * Frees the stored handle and clears the slot before anything that
         * can throw, so a failed restart never strands a destroyed wrapper.
         */
        private fun releaseHandle() {
            // destroy() frees the Rust Arc, whose Drop runs the ordered
            // off-thread teardown.
            val stored = handle
            handle = null
            stored?.destroy()
        }
    }

    /**
     * The proxy-owner-remediates contract: a death report only clears the
     * stored handle (its endpoint is dead, so it must not be stopped or
     * reused). Recovery stays with the user-driven re-enable; the wallet's
     * own liveness probe lands the `died` mode the app is already polling.
     *
     * Identity-checked (#1227): the observer speaks only for the handle it
     * was started with, so a dying predecessor's late report cannot wipe a
     * fresh replacement. `watched` is assigned inside the same
     * `handleLock` section that stores the started handle, and `onDeath`
     * takes the lock, so a death can never observe a half-started state.
     */
    private class HandleClearingObserver : ProxyDeathObserver {
        var watched: MixnetProxyHandle? = null

        override fun onDeath(reason: ProxyDeathReason) {
            android.util.Log.w("NymTransportModule", "mixnet proxy died: $reason")
            synchronized(handleLock) {
                when (verdictOnDeath(handle, watched)) {
                    HandleDeathVerdict.ClearStored -> releaseHandle()
                    HandleDeathVerdict.RetainStored -> Unit
                }
            }
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
                    releaseHandle()
                    val observer = HandleClearingObserver()
                    val started = MixnetProxyHandle.start(observer)
                    observer.watched = started
                    handle = started
                    val endpoint = started.socks5Endpoint()
                    val exitNode = started.exitNode()
                        ?: throw IllegalStateException("the started proxy reported no exit node")
                    Arguments.createMap().apply {
                        putString("socks5Addr", "${endpoint.host}:${endpoint.port}")
                        putString("exitNode", exitNode)
                    }
                }
            }
        }
    }

    @ReactMethod
    fun stopMixnetTransport(promise: Promise) {
        FfiOutcome.settling(promise, "stop_mixnet_transport") {
            guardingLinkage {
                synchronized(handleLock) {
                    releaseHandle()
                }
            }
            null
        }
    }
}
