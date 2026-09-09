package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import uniffi.zingo.ZingolibException

/**
 * The numeric-arg contract of the bridge (zingo-mobile#1151): a malformed
 * or overflowing string rejects as the typed InvalidInput with the same
 * message shape the iOS bridge throws — never a platform
 * NumberFormatException crossing as "Unknown", and never a silent default.
 */
class FfiArgsTest {
    @Test
    fun validNumbersParse() {
        assertEquals(7u, FfiArgs.requiredU32("7", "per_bucket"))
        assertEquals(UInt.MAX_VALUE, FfiArgs.requiredU32("4294967295", "per_bucket"))
        assertEquals(250uL, FfiArgs.requiredU64("250", "spacing_ms"))
        assertEquals(ULong.MAX_VALUE, FfiArgs.requiredU64("18446744073709551615", "spacing_ms"))
        assertEquals(7u, FfiArgs.optionalU32("7", "per_bucket"))
    }

    @Test
    fun emptyOptionalMeansAbsentNeverZero() {
        assertNull(FfiArgs.optionalU32("", "per_bucket"))
    }

    @Test
    fun malformedAndOverflowingValuesRejectAsInvalidInput() {
        val rejected = mapOf(
            "not-a-number" to { FfiArgs.requiredU32("not-a-number", "per_bucket") },
            "-1" to { FfiArgs.requiredU32("-1", "per_bucket") },
            "4294967296" to { FfiArgs.requiredU32("4294967296", "per_bucket") },
            "1.5" to { FfiArgs.optionalU32("1.5", "per_bucket") },
            "18446744073709551616" to { FfiArgs.requiredU64("18446744073709551616", "spacing_ms") },
        )
        for ((raw, parse) in rejected) {
            assertThrows(
                "\"$raw\" must reject as the typed InvalidInput",
                ZingolibException.InvalidInput::class.java,
            ) { parse() }
        }
    }

    @Test
    fun theRejectionMessageMatchesTheIosBridgeShape() {
        val u32 = assertThrows(ZingolibException.InvalidInput::class.java) {
            FfiArgs.requiredU32("nope", "per_bucket")
        }
        assertEquals("per_bucket must be a u32: \"nope\"", u32.message)

        val u64 = assertThrows(ZingolibException.InvalidInput::class.java) {
            FfiArgs.requiredU64("nope", "spacing_ms")
        }
        assertEquals("spacing_ms must be a u64: \"nope\"", u64.message)
    }

    @Test
    fun theRejectionCrossesTheBridgeAsInvalidInputNeverUnknown() {
        val outcome = FfiOutcome.of("reschedule_parts") {
            FfiArgs.requiredU32("not-a-number", "per_bucket")
        }
        check(outcome is FfiOutcome.Rejected)
        assertEquals(
            "a malformed numeric arg must reject under InvalidInput on both platforms",
            "InvalidInput",
            outcome.code,
        )
    }
}
