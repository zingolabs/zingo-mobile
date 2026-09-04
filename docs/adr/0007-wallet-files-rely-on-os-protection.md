# 7. Wallet files rely on OS protection, not app-layer encryption

Date: 2026-08-26

## Status

Accepted by the maintainer in the wallet-storage rework that followed
the file-module audit, and implemented by Step 1 (encryption removal).

## Context

Android wrapped the wallet file in a Jetpack `EncryptedFile` (Tink)
envelope keyed by the AndroidKeystore. That layer caused every
wallet-loss incident on record: the 2.0.21 migration wrapped an
encrypted file a second time after a transient Keystore failure (#965),
OEM Keystore key loss (Tecno HiOS observed) made files undecryptable
outright, and the delete-before-write forced by `EncryptedFile` opened a
crash window with no file at all. Five sidecar recovery files exist only
to patch these failure modes.

The layer defended a file that already sits inside the app sandbox on a
device that encrypts it at rest. Android file-based encryption is
mandatory since Android 10 and app data lives in credential-encrypted
storage, keys available after first unlock. iOS encrypts every file in
hardware. An attacker who defeats those protections holds the same
device that holds the Keystore, so the app layer added no attacker it
defends against. It added a second single point of failure.

## Decision

Wallet files rest as the raw `wallet.save()` bytes zingolib produces,
byte-identical to a desktop zingolib wallet file. Their protection is
the OS: encryption at rest, the app sandbox, and backup exclusion
(Android `allowBackup="false"`, iOS `isExcludedFromBackup`). iOS wallet
files use protection class
`completeUntilFirstUserAuthentication`, not `complete`, because class
`complete` locks the file about ten seconds after the screen locks and
breaks background sync saves. No platform applies app-layer encryption.

## Consequences

Keystore or Keychain loss no longer bricks a wallet. A wallet file is
portable to desktop zingolib and zingolib's parser is the only judge of
its content. Backup exclusion becomes the only guard against the
restored-old-wallet incident class, so it must never regress on either
platform. The Tink read paths survive as recovery-only code until the
fleet has migrated (Step 3 deletes them).
