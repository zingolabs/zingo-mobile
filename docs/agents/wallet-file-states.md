# Wallet file states in the fleet

The map behind Step 1 of the wallet storage rework (encryption removal).
It lists every on-disk state a device can be in today and what the Step 1
load path does with each. Steps 2 to 4 (Rust-owned I/O, legacy deletion,
multiple wallet files) build on this inventory.

## Where the states come from

Release 2.0.21 (313) introduced Jetpack `EncryptedFile` on Android. Its
migration tested "already encrypted?" by a trial decrypt. A transient
Keystore failure made an encrypted file look plain, and the migration
wrapped the Tink envelope a second time (#965). zingolib then read the
inner envelope header as the wallet version and reported values like
11506714174589491496. A separate class: OEM Keystore key loss (Tecno
HiOS observed) made files undecryptable outright. iOS never had
app-layer encryption. Every recovery sidecar below exists to patch one
of these failure modes.

## Main files: `wallet.dat`, `wallet.backup.dat`

The state names are the `diagnoseWalletFile` vocabulary that crosses the
bridge (`WalletFileState` in `walletFileRepair.ts`).

| State | Content | How a device got here | Step 1 load path |
|---|---|---|---|
| `missing` | no file | fresh install, or deleted wallet | wallet-exists check fails, StartMenu |
| `plainWallet` | raw zingolib bytes, u64-LE version 0..1000 | Zingo ≤ 2.0.20, a restored `.migrating` copy, or a Step 1 write | open directly, no Keystore involved |
| `encryptedLegacy` | Tink envelope, payload is base64 text of plain bytes | normal 2.0.21+ save path | decrypt once, verify, migrate to plain via temp then atomic rename |
| `doubleWrapped` | Tink envelope whose payload is another envelope, depth 1..3 | the #965 trial-decrypt bug | decrypt, unwrap each layer, keep the original at `.prerepair`, write plain |
| `undecryptable` | Tink header, keyset gone, or garbage | OEM Keystore loss, app data restored onto another install | typed load error, recovery dialog with diagnosis report |

The plain state and the Step 1 write format are the same bytes a desktop
zingolib wallet file holds. zingolib's parser is the only judge of
content. On iOS the file is base64 text until Step 2 and none of the
Android states apply.

## Sidecars

| File | Format | Written by | Step 1 handling |
|---|---|---|---|
| `<name>.write.tmp` | encrypted | `writeEncryptedFileDurably`, stash of the previous content before its delete-then-write | `completePendingWrite` keeps working: restore when the main file is unreadable, else delete |
| `<name>.migrating` | plain | the 2.0.21 migration, plain copy kept until the encrypted write verified | rename to main when main is missing, delete once main verifies plain, keep otherwise |
| `wallet.swap.tmp` | encrypted (legacy) or plain (Step 1) | backup restore swap, copy of the original main | `completePendingSwap` keeps working, reads either format |
| `<name>.prerepair` | raw double-wrapped copy | double-wrap repair, and now the load path's unwrap | support evidence only, never auto-read |
| `<name>.broken` | raw undecryptable copy | backup restore over an unreadable main | support evidence only, never auto-read |

## Rules the load path must keep

- A legacy file is never deleted or overwritten before its plain
  replacement verifies. The temp write verifies its read-back bytes and
  the version header before the atomic rename, and the rename is the
  only operation that touches the legacy path.
- A read failure never triggers a write. Classification uses the raw
  bytes (`WalletFileEnvelope`), never a trial decrypt, so a transient
  Keystore failure can only fail the load with a typed error. The next
  launch retries from unchanged bytes.
- Anything unreadable routes to the recovery dialog
  (`walletFileDiagnosisInfo` feeding `WalletRecoveryModal`) instead of
  reaching zingolib as garbage.
