# Wallet file states in the fleet

The map behind Steps 1 and 2 of the wallet storage rework (encryption
removal, then bytes-only streaming persistence). It lists every on-disk
state a device can be in today and what the load path does with each.
Steps 3 and 4 (legacy deletion, multiple wallet files) build on this
inventory.

Since Step 2 the native layer hands Rust a path for every plain-format
operation and Rust streams the bytes. The Android sidecar
logic below is unchanged in effect. Its reads and writes moved from
buffers to paths.

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

The plain state and the write format are the same bytes a desktop
zingolib wallet file holds. zingolib's parser is the only judge of
content.

## iOS: `wallet.dat.txt`, `wallet.backup.dat.txt`

iOS never had app-layer encryption, so none of the Tink states apply.
Every build before Step 2 stored the wallet as base64 text of the plain
bytes, under a file name that keeps its `.txt` suffix to avoid a rename
migration on top of the format migration.

| State | Content | How a device got here | Step 2 load path |
|---|---|---|---|
| `missing` | no file | fresh install, or deleted wallet | wallet-exists check fails, StartMenu |
| `plainWallet` | raw zingolib bytes, u64-LE version 0..1000 | a Step 2 write, or a migrated text file | open directly through `load_wallet_file` |
| `base64Text` | base64 text of plain bytes, ASCII first bytes | every save before Step 2 | decode in 64 KiB aligned chunks into `.plain.tmp`, full parse, atomic rename, protection attributes reapplied |
| `unknown` | anything else | truncation inside the header, foreign file | typed load error, recovery dialog |
| `unreadable` | a file that exists and cannot be opened | a class-A file before the first unlock, a transient I/O failure | typed load error, reported to the dialog as `unknown` |

The recovery dialog reports a `base64Text` file whose decoded header is
plausible as `plainWallet`, the same vocabulary the Android report uses,
and the seed salvage decodes a text file into a scratch copy with its
unfinishable tail dropped, without migrating it.

## Sidecars

| File | Format | Written by | Step 1 handling |
|---|---|---|---|
| `<name>.write.tmp` | encrypted | `writeEncryptedFileDurably`, stash of the previous content before its delete-then-write | `completePendingWrite` keeps working: restore when the main file fails the full parse, delete only when it passes |
| `<name>.migrating` | plain | the 2.0.21 migration, plain copy kept until the encrypted write verified | rename to main when main is missing, delete once main passes the full parse, keep otherwise |
| `wallet.swap.tmp` | encrypted (legacy) or plain (Step 1) | backup restore swap, copy of the original main | `completePendingSwap` keeps working, reads either format |
| `<name>.prerepair` | raw double-wrapped copy | double-wrap repair, and now the load path's unwrap | support evidence only, never auto-read |
| `<name>.broken` | raw undecryptable copy | backup restore over an unreadable main | support evidence only, never auto-read |
| `<name>.plain.tmp.<unique>` | plain, possibly partial | every plain write, on both platforms: Rust streams a save into it, a migration or a copy fills it, one name per writer | never read as a wallet; the writer removes it when done, the next install and delete sweep the leftovers of a killed process, a live writer's temp is never swept |
| `<name>.salvage.tmp` | plain (iOS), backup-excluded | the seed salvage's decode of a `base64Text` file | removed when the salvage returns, and by delete |
| `wallet.swap.tmp.orphan.<millis>` | plain | the swap recovery, when main, backup, and the temp hold three distinct wallets | evidence only, never auto-read, survives delete |

## Rules the load path must keep

- A legacy file is never deleted or overwritten before its plain
  replacement verifies. A save's temp is verified by Rust, which streams
  it back through a digest compared against the digest of the bytes
  written. A migration's temp runs the full parse. A copy's source runs
  the full parse and the copy is compared with it by digest. The header
  check runs before the atomic rename, the rename is the only operation
  that touches the legacy path, and the directory is synced after it.
- Every temp is unique per write. A save fills its temp outside the
  writer lock, so a save blocked inside Rust never stalls the other file
  paths. A migration and a copy fill under the lock, since their source
  must not change meanwhile. The lock covers the commit check, the
  rename, and the sweep of temps that no live writer of the process
  owns.
- The header check (`WalletFileEnvelope` on Android, `PlainWalletFile`
  on iOS) reads the first 16 bytes and only routes formats: it survives
  truncation. Every decision to delete a sidecar or to install a copy
  runs the full zingolib parse (`validate_wallet_file`) on the source
  first.
- A restore reads the slots only after the startup swap recovery ran and
  installs the file it validated. A failure before the main slot changed
  undoes its own first step and reopens the wallet file. A failure after
  the main slot changed reports success, and the startup recovery
  finishes the retained copy. The swap recovery judges a temp by its
  wallet content after resolving its format, and sets a temp it cannot
  place aside as an orphan that no path installs.
- Delete runs under the writer lock, closes the wallet file for any save
  still in flight, removes every temp and the `.broken` and
  `.salvage.tmp` copies beside the file, removes a swap temp that holds a
  copy of the deleted wallet, and keeps a swap temp it cannot read.
- A read failure never triggers a write. Classification uses the raw
  header, never a trial decrypt or decode, so a transient Keystore
  failure can only fail the load with a typed error. The next launch
  retries from unchanged bytes.
- The wallet never exists as a whole buffer in memory on a plain-format
  path. Native hands Rust a path, Rust streams through a buffered
  reader or writer, and file copies and comparisons stream too. The
  Android legacy migration streams the Tink payload through a base64
  decoding stream into the temp, one envelope layer at a time.
- Anything unreadable routes to the recovery dialog
  (`walletFileDiagnosisInfo` feeding `WalletRecoveryModal`) instead of
  reaching zingolib as garbage.
