package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The save-path classification contract (zingo-mobile#1151; audit Issue Q):
 * a wallet export is classified by its structure, never by whether its
 * content resembles an error sentinel.
 */
class WalletExportClassificationTest {
    @Test
    fun walletExportResemblingAnErrorIsData() {
        // Audit Issue Q's one-in-33-million collision, made deterministic:
        // a well-formed base64 wallet export that begins with "error".
        val attackString = "errorAAA"

        assertEquals(
            WalletExportClassification.ValidExport(attackString),
            WalletExport.classify(attackString),
        )
    }

    @Test
    fun uppercaseCollisionIsAlsoData() {
        // The historical sniff matched case-insensitively, so every case
        // variant of the prefix was misclassified.
        val attackString = "ERRORAAA"

        assertEquals(
            WalletExportClassification.ValidExport(attackString),
            WalletExport.classify(attackString),
        )
    }

    @Test
    fun failureProseIsNeverAValidExport() {
        // Rust-side failure prose always contains ':' and ' ', both outside
        // the base64 alphabet, so structural validation alone rejects it —
        // deterministically, with no sentinel matching.
        assertTrue(
            WalletExport.classify("Error: disk full")
                is WalletExportClassification.Invalid,
        )
    }

    @Test
    fun emptyExportMeansNoSaveNeeded() {
        assertTrue(
            WalletExport.classify("")
                is WalletExportClassification.NoSaveNeeded,
        )
    }

    @Test
    fun malformedBase64IsInvalid() {
        assertTrue(
            WalletExport.classify("not base64 at all")
                is WalletExportClassification.Invalid,
        )
    }

    @Test
    fun paddingMayOnlyTrail() {
        assertTrue(
            WalletExport.classify("AB=A")
                is WalletExportClassification.Invalid,
        )
        assertEquals(
            WalletExportClassification.ValidExport("ABCD"),
            WalletExport.classify("ABCD"),
        )
    }

    @Test
    fun paddingIsAtMostTwoCharacters() {
        assertTrue(
            WalletExport.classify("A===")
                is WalletExportClassification.Invalid,
        )
        assertEquals(
            WalletExportClassification.ValidExport("AB=="),
            WalletExport.classify("AB=="),
        )
    }
}
