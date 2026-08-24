package org.ZingoLabs.Zingo

/**
 * Classifies the bytes of a wallet file by their first bytes: a plain zingolib
 * wallet starts with a small u64-LE serialization version, a Jetpack
 * `EncryptedFile` (Tink AES-GCM-HKDF streaming, RAW prefix) starts with its
 * header length byte, 0x28. A file whose decrypted payload is itself a Tink
 * envelope was wrapped twice by `migrateFileIfNeeded` after a transient
 * Keystore failure made a valid encrypted file look unencrypted. Pure, so
 * it runs under plain JVM unit tests.
 */
object WalletFileEnvelope {
    const val TINK_STREAMING_HEADER_LENGTH: Int = 0x28
    const val MAX_UNWRAP_DEPTH: Int = 3

    enum class PayloadKind { PLAIN_WALLET, TINK_ENVELOPE, UNKNOWN }

    // zingolib currently writes 42; accept up to 1_000 to leave headroom for
    // future formats without misreading an envelope header as a version
    // (observed in the wild: 11506714174589491496 after Keystore key loss).
    fun looksLikePlainWallet(bytes: ByteArray): Boolean {
        if (bytes.size < 8) return false
        var version = 0L
        for (i in 7 downTo 0) {
            version = (version shl 8) or (bytes[i].toLong() and 0xFFL)
        }
        return version in 0..1000
    }

    fun classify(bytes: ByteArray): PayloadKind = when {
        looksLikePlainWallet(bytes) -> PayloadKind.PLAIN_WALLET
        bytes.isNotEmpty() && (bytes[0].toInt() and 0xFF) == TINK_STREAMING_HEADER_LENGTH ->
            PayloadKind.TINK_ENVELOPE
        else -> PayloadKind.UNKNOWN
    }
}
