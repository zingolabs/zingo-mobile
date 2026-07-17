package org.ZingoLabs.Zingo

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The restore guard's acceptance rules, the Kotlin twin of the Swift
 * WalletFileBase64Tests: wallet files store canonical standard-alphabet
 * base64 — exactly the strings the encoder emits and the Rust
 * `STANDARD` engine accepts — and restorable content is recognized by
 * structure alone, never by sentinel (zingo-mobile#1151).
 */
class WalletBackupRestorableTest {
    @Test
    fun contentResemblingAnErrorSentinelIsRestorable() {
        // Every case variant of the historical sentinel is well-formed
        // base64 and must validate.
        assertTrue(WalletBackup.isRestorable("errorAAA"))
        assertTrue(WalletBackup.isRestorable("ERRORAAA"))
    }

    @Test
    fun failureProseIsNotRestorable() {
        // Prose always contains ':' and ' ', both outside the base64
        // alphabet.
        assertFalse(WalletBackup.isRestorable("Error: disk full"))
    }

    @Test
    fun emptyContentIsNotRestorable() {
        assertFalse(WalletBackup.isRestorable(""))
    }

    @Test
    fun malformedContentIsNotRestorable() {
        assertFalse(WalletBackup.isRestorable("not base64 at all"))
    }

    @Test
    fun paddingMayOnlyTrail() {
        assertFalse(WalletBackup.isRestorable("AB=A"))
        assertTrue(WalletBackup.isRestorable("ABCD"))
    }

    @Test
    fun paddingIsAtMostTwoCharacters() {
        assertFalse(WalletBackup.isRestorable("A==="))
    }

    @Test
    fun trailingBitsMustBeZero() {
        // Non-canonical padding decodes downstream-dependently: the Rust
        // STANDARD engine rejects it, so the guard must too.
        assertFalse(WalletBackup.isRestorable("AB=="))
        assertFalse(WalletBackup.isRestorable("AAB="))
        assertTrue(WalletBackup.isRestorable("AA=="))
        assertTrue(WalletBackup.isRestorable("AAA="))
    }
}
