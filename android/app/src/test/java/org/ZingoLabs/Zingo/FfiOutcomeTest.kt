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
    private val ffiFailures: Map<String, ZingolibException> = mapOf(
        "init_new" to ZingolibException.Init("boom"),
        "init_from_seed" to ZingolibException.Init("boom"),
        "init_from_ufvk" to ZingolibException.Init("boom"),
        "init_from_b64" to ZingolibException.Init("boom"),
        "run_sync" to ZingolibException.Sync("boom"),
        "pause_sync" to ZingolibException.Sync("boom"),
        "status_sync" to ZingolibException.Sync("boom"),
        "poll_sync" to ZingolibException.Sync("boom"),
        "run_rescan" to ZingolibException.Rescan("boom"),
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
