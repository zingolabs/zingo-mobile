package org.ZingoLabs.Zingo

/**
 * Classifies wallet-file content read back from disk before
 * restoreExistingWalletBackup swaps it into place — the same guard the
 * iOS bridge's WalletExport.isValidBase64 gives its restore path. The
 * wallet files store canonical standard-alphabet base64, so restorable
 * content is recognized by structure alone, never by sentinel
 * (zingo-mobile#1151). Pure — no I/O, no logging, no Android
 * dependencies — so it runs under plain JVM unit tests.
 */
object WalletBackup {
    private const val GROUP_LENGTH = 4
    private const val MAX_PADDING = 2

    // With one padding character the final sextet contributes four data
    // bits, so its low two bits must be zero; with two it contributes
    // two, so its low four bits must be zero.
    private const val ONE_PAD_ZERO_BITS = 0b11
    private const val TWO_PAD_ZERO_BITS = 0b1111

    private const val LOWERCASE_OFFSET = 26
    private const val DIGIT_OFFSET = 52
    private const val PLUS_VALUE = 62
    private const val SLASH_VALUE = 63
    private const val NOT_A_SEXTET = -1

    /**
     * Canonical: exactly the strings the encoder emits and the Rust
     * STANDARD engine accepts — the alphabet [A-Za-z0-9+/], a length
     * that is a positive multiple of four, padding only as a suffix of
     * at most two '=' characters, and zero trailing bits under that
     * padding. The classification is an O(1)-allocation char scan, not
     * a decode and re-encode round trip: it runs on the synchronous
     * native-modules thread, and a round trip transiently allocates
     * several times the wallet base64, which crashes low-RAM 32-bit
     * devices with an OutOfMemoryError — an Error that no Exception
     * handler on the restore path contains.
     */
    fun isRestorable(content: String): Boolean {
        if (content.isEmpty() || content.length % GROUP_LENGTH != 0) return false
        val padding = paddingLength(content)
        return padding <= MAX_PADDING &&
            bodyIsAlphabet(content, content.length - padding) &&
            trailingBitsAreZero(content, padding)
    }

    /** Counts the run of '=' characters that ends the content. */
    private fun paddingLength(content: String): Int {
        var length = 0
        while (length < content.length && content[content.length - 1 - length] == '=') {
            length++
        }
        return length
    }

    /**
     * True when every character before the padding belongs to the
     * standard alphabet; '=' is not in the alphabet, so this also
     * rejects padding anywhere but the suffix.
     */
    private fun bodyIsAlphabet(content: String, bodyLength: Int): Boolean =
        (0 until bodyLength).all { sextetOf(content[it]) != NOT_A_SEXTET }

    /**
     * True when the bits the padding discards are zero in the final
     * data character, as the encoder always emits them and the Rust
     * STANDARD engine requires. The caller has already bounded the
     * padding and the group length, so the final data character exists.
     */
    private fun trailingBitsAreZero(content: String, padding: Int): Boolean =
        padding == 0 ||
            (sextetOf(content[content.length - padding - 1]) and zeroBitMask(padding)) == 0

    private fun zeroBitMask(padding: Int): Int =
        if (padding == 1) ONE_PAD_ZERO_BITS else TWO_PAD_ZERO_BITS

    /** The six-bit value of a standard-alphabet character, or -1. */
    private fun sextetOf(char: Char): Int = when (char) {
        in 'A'..'Z' -> char - 'A'
        in 'a'..'z' -> char - 'a' + LOWERCASE_OFFSET
        in '0'..'9' -> char - '0' + DIGIT_OFFSET
        '+' -> PLUS_VALUE
        '/' -> SLASH_VALUE
        else -> NOT_A_SEXTET
    }
}
