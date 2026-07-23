package org.ZingoLabs.Zingo

import uniffi.zingo.ZingolibException

/**
 * Pure parsers for the bridge's string-crossing numeric arguments. A
 * malformed or overflowing value throws the typed InvalidInput — the same
 * code and message shape the iOS bridge rejects with — never a platform
 * NumberFormatException, which would cross the bridge as "Unknown" and
 * split the two platforms' rejection contracts.
 *
 * Pure — no I/O, no Android dependencies — so the parsers run under plain
 * JVM unit tests.
 */
object FfiArgs {
    fun requiredU32(raw: String, name: String): UInt =
        raw.toUIntOrNull()
            ?: throw ZingolibException.InvalidInput("$name must be a u32: \"$raw\"")

    /** Empty means absent — the module's "keep the default" convention. */
    fun optionalU32(raw: String, name: String): UInt? =
        if (raw.isEmpty()) null else requiredU32(raw, name)

    fun requiredU64(raw: String, name: String): ULong =
        raw.toULongOrNull()
            ?: throw ZingolibException.InvalidInput("$name must be a u64: \"$raw\"")
}
