package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The byte classifier behind the load-failure dialog: a plain wallet by its
 * u64-LE version, a Tink streaming envelope by its 0x28 header-length byte,
 * and the two payloads observed in the field (Xiaomi, Motorola) that zingolib
 * reported as absurd wallet versions.
 */
class WalletFileEnvelopeTest {
    private fun versionHeader(version: Long): ByteArray =
        ByteArray(16) { i -> if (i < 8) ((version shr (8 * i)) and 0xFF).toByte() else 0x7F }

    @Test
    fun plainWalletByVersion() {
        assertTrue(WalletFileEnvelope.looksLikePlainWallet(versionHeader(42)))
        assertTrue(WalletFileEnvelope.looksLikePlainWallet(versionHeader(0)))
        assertTrue(WalletFileEnvelope.looksLikePlainWallet(versionHeader(1000)))
        assertFalse(WalletFileEnvelope.looksLikePlainWallet(versionHeader(1001)))
        assertEquals(
            WalletFileEnvelope.PayloadKind.PLAIN_WALLET,
            WalletFileEnvelope.classify(versionHeader(42)),
        )
    }

    @Test
    fun shortInputIsUnknown() {
        assertEquals(WalletFileEnvelope.PayloadKind.UNKNOWN, WalletFileEnvelope.classify(ByteArray(0)))
        assertEquals(WalletFileEnvelope.PayloadKind.UNKNOWN, WalletFileEnvelope.classify(byteArrayOf(0x2a, 0)))
    }

    @Test
    fun fieldReportsAreTinkEnvelopes() {
        // 7279039767390116136 (Xiaomi) and 1552767035874663720 (Motorola),
        // the "wallet versions" zingolib printed, are the first 8 bytes of an
        // inner envelope read as u64-LE.
        for (version in listOf(7279039767390116136L, 1552767035874663720L)) {
            val bytes = versionHeader(version)
            assertEquals(0x28, bytes[0].toInt() and 0xFF)
            assertEquals(WalletFileEnvelope.PayloadKind.TINK_ENVELOPE, WalletFileEnvelope.classify(bytes))
        }
    }

    @Test
    fun keystoreLossGarbageIsUnknown() {
        // 0x9FA09A1F94EA5E68, seen on a Tecno after Keystore key loss.
        val bytes = versionHeader("9FA09A1F94EA5E68".toULong(16).toLong())
        assertEquals(WalletFileEnvelope.PayloadKind.UNKNOWN, WalletFileEnvelope.classify(bytes))
    }
}
