package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test
import uniffi.zingo.ZingolibException

/**
 * The bridge-outcome contract for every migrated FFI
 * (zingo-mobile#1151): whether a call succeeded is knowable from the
 * channel of its result — Resolved versus Rejected — never from its
 * content. One case per FFI, exercising the typed exception family the
 * Rust side now throws for it.
 */
class FfiOutcomeTest {
    private val ffiFailures: Map<String, Exception> = mapOf(
        "init_new" to ZingolibException.Init("boom"),
        "init_from_seed" to ZingolibException.Init("boom"),
        "init_from_ufvk" to ZingolibException.Init("boom"),
        "init_from_b64" to ZingolibException.Init("boom"),
        "run_sync" to ZingolibException.Sync("boom"),
        "pause_sync" to ZingolibException.Sync("boom"),
        "status_sync" to ZingolibException.Sync("boom"),
        "poll_sync" to ZingolibException.Sync("boom"),
        "run_rescan" to ZingolibException.Rescan("boom"),
        // The read getters' Rust sides are prose-free; their one typed
        // failure family is the uninitialized client.
        "get_latest_block_wallet" to ZingolibException.LightclientNotInitialized("boom"),
        "get_version" to ZingolibException.LightclientNotInitialized("boom"),
        "get_unified_addresses" to ZingolibException.LightclientNotInitialized("boom"),
        "get_transparent_addresses" to ZingolibException.LightclientNotInitialized("boom"),
        "get_wallet_save_required" to ZingolibException.LightclientNotInitialized("boom"),
        "get_config_wallet_performance" to ZingolibException.LightclientNotInitialized("boom"),
        "get_wallet_version" to ZingolibException.LightclientNotInitialized("boom"),
        // The save shells resolve their helpers' contained boolean; what
        // rejects is an escaping exception, FFI-typed or platform I/O.
        "save_wallet_bytes" to ZingolibException.Save("boom"),
        "save_wallet_backup" to java.io.IOException("boom"),
        // The wallet-read getters whose domain failures are the typed
        // Read variant.
        "get_balance" to ZingolibException.Read("boom"),
        "get_spendable_balance_total" to ZingolibException.Read("boom"),
        "get_value_transfers" to ZingolibException.Read("boom"),
        "get_messages" to ZingolibException.Read("boom"),
        "get_latest_block_server" to ZingolibException.Read("boom"),
    )

    @Test
    fun resolvedValuesPassThroughUnclassified() {
        // The value deliberately wears the historical error sentinel:
        // classification must be by channel, never by content.
        val proseLikeData = "Error: looks like prose but is legitimate data"

        for ((code, _) in ffiFailures) {
            assertEquals(
                "FFI $code must resolve its value verbatim",
                FfiOutcome.Resolved(proseLikeData),
                FfiOutcome.of(code) { proseLikeData },
            )
        }
    }

    @Test
    fun thrownFfiErrorsRejectUnderTheFfiName() {
        for ((code, failure) in ffiFailures) {
            assertEquals(
                "FFI $code must reject with its typed exception",
                FfiOutcome.Rejected(code, failure),
                FfiOutcome.of(code) { throw failure },
            )
        }
    }
}
