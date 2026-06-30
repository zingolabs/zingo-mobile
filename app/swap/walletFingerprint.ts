/**
 * Derive a stable, per-wallet fingerprint from the wallet's UFVK.
 *
 * Used as the namespace suffix for `SwapStore`'s EncryptedStorage key so each
 * wallet on the same device sees only its own swap records. Without this,
 * a victim restoring their seed onto a device where a previous wallet had
 * been used would inherit the prior wallet's swap history (privacy leak),
 * plus the records would point at ephemeral addresses the new wallet can't
 * observe (correctness issue).
 *
 * Why a suffix of the UFVK and not a cryptographic hash:
 *   - Zcash UFVKs are bech32-encoded with a checksum at the tail. The last
 *     ~16 characters are derived from the wallet's key material, so two
 *     distinct wallets always produce distinct tails by construction.
 *   - The fingerprint is purely a storage key — never displayed, never used
 *     as an authenticator. A cryptographic hash would add a JS dependency
 *     for zero security benefit.
 *   - Slicing is O(1) and synchronous; no async crypto plumbing needed.
 *
 * Collision risk across a single user's wallets: 16 base32 chars ≈ 80 bits of
 * entropy. Even with thousands of wallets per device the birthday-collision
 * probability rounds to zero.
 */
export const WALLET_FINGERPRINT_LENGTH = 16;

export function deriveWalletFingerprint(ufvk: string): string {
  if (!ufvk || ufvk.length < WALLET_FINGERPRINT_LENGTH) {
    // Defensive: if the UFVK is missing or shorter than expected, return an
    // empty string so callers can branch on "no fingerprint" rather than
    // silently producing a key prefix that two different wallets could share.
    return '';
  }
  return ufvk.slice(-WALLET_FINGERPRINT_LENGTH);
}
