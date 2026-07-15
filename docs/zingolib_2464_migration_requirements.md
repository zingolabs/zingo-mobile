# Rust changes required to match zingolib PR #2464

zingolabs/zingolib#2464 completes issue #2446 on the zingolib side: every
public API returns typed data with typed errors, and `do_info` is deleted
outright in favor of `info() -> Result<ServerInfo, LightClientError>`.
This document lists what `rust/lib` must change when its zingolib pin
(currently `branch = "feature/swap-op-return"`) advances past that merge.
It covers only #2464's delta; the pin bump will also cross other dev
work (offline mode, the calculate/transmit endpoints, and more) that has
its own migration surface.

## Required: `info_server` migrates from `do_info` to `info()`

`info_server()` (`rust/lib/src/lib.rs`) currently returns
`Ok(lightclient.do_info().await)`, forwarding a rendered JSON `String`
whose failure case, at the current pin, arrives as prose inside that
string. After the bump, `do_info` does not exist. The replacement is:

1. Call `lightclient.info().await`, which returns
   `Result<zingolib::data::ServerInfo, LightClientError>`.
2. Map the error into the bridge's typed vocabulary (a `ZingolibError`
   variant carrying or describing the `LightClientError`). This is the
   same shape the `typed_ffi_errors` branch is already building: the
   failure crosses the FFI as a thrown error, never as prose in the
   data channel. Note that an Indexerless client now fails this call
   with the typed `LightClientError::Offline`.
3. Expose `ServerInfo`'s fields as a typed UniFFI record and let the
   platform layers format. This is the decided end state (see
   "Decisions" below); the alternative of rendering
   `json::JsonValue::from(&info).pretty(2)` to preserve the old string
   contract was considered and rejected.

## Decisions (grilling session, 2026-07-14)

The typed-record upgrade was examined against three questions; each
resolved as follows.

**Timing: land with the pin bump, not before.** At the current pin,
`do_info` returns a bare `String` with failure in-band, so a typed
record could only be populated by parsing that string — a content
inspection this whole effort exists to eliminate. The record therefore
lands only when the workspace pin advances past zingolib #2464, in one
clean hop from `zingolib::data::ServerInfo`. No interim parse is ever
written.

**API shape: replace `info_server` outright.** The UDL signature
changes in place to `[Throws=ZingolibError] ServerInfo info_server()` —
the first UniFFI `dictionary` in `zingo.udl`. No string-returning
variant survives, so no sniffing path survives. All four layers migrate
in the same PR: `RPCModule.kt` and `RPCModule.swift` resolve a map and
reject on catch (per #1151), TypeScript drops its `JSON.parse` in
`checkServerURI.ts`, `DataService.ts`, and `walletUtils.ts`, and the
native FFI tests (`RustFFITest.kt`, `ZingoTest.swift` — roughly nine
call sites each) assert on record fields instead of JSON text.

**Error vocabulary: `Offline` plus a catch-all.** `ZingolibError`
gains two flat variants: `Offline`, because it is the one failure the
platforms genuinely branch on (the offline-mode UX adopted in #1162),
and `LightClient(String)` wrapping every other `LightClientError` via
its `Display` text. The message is prose, but it travels on the error
channel, which is what #1151 requires. Mirroring zingolib's full error
tree across the FFI was rejected: no current consumer branches on
anything but offline-ness, and the mirror would track upstream enum
churn forever. The sync, rescan, and init migrations reuse this
pattern with their own catch-all variants.

## Outcome of R5 (2026-07-15)

The typed-error work on the `typed_ffi_errors` branch (PR #1167) ended
in a deeper change than the decisions above anticipated, and the
outcome bears on the `ServerInfo` plan.

**The save path adopted a structural contract.** `save_to_b64` became
`save_wallet_bytes`, whose UDL signature is optional bytes: an absent
value means no save was needed, bytes are the wallet export, and
failure throws the typed `Save` variant. The trimodal string it
replaced was itself an in-band encoding, which Kotlin and Swift each
re-parsed with a hand-rolled base64 validator; both validators' work
became unnecessary, and the classification layer built earlier in the
same PR was deleted rather than polished. The platforms encode base64
at their write sites, so the on-disk wallet format is unchanged. The
historical attack string — a valid base64 export beginning with
"error" — is now unrepresentable, because no string crosses the
boundary at all.

**The `poll_sync` typed enum was deferred into this migration.** The
other half of the R5 proposal — replacing `poll_sync`'s three-shape
string with a typed UDL enum (`NoHandle`, `NotReady`, `Ready` with its
payload) — was deliberately deferred, because the platforms would then
need to resolve structured maps across the React Native bridge, which
is the same design problem the `ServerInfo` record poses. When the pin
bump lands and the `info_server` migration proceeds, design the
bridge's map contract once and apply it to both: `ServerInfo` and the
`poll_sync` result should cross as typed records in the same PR.

**One launch condition became status rather than error.** A second
sync request while one is already draining surfaces upstream as
`SyncModeError::SyncAlreadyRunning`. The bridge matches that variant
structurally and reports it on the data channel as status prose,
because the caller's desired state already holds; every other sync
failure remains typed. Any future reshaping of the sync surface should
preserve this distinction.

## No change required, verified by audit

The interface audit in zingolabs/zingolib#2465 confirmed the bridge
never calls the other two APIs #2464 changed:

- `do_delete` (renamed `delete_wallet_file`, now `std::io::Result<()>`)
  — wallet-file lifecycle is handled in platform code, not through
  zingolib.
- `memo_bytes_from_string` (now `Result<MemoBytes, MemoError>`) — the
  bridge constructs `Receiver { memo: Option<MemoBytes> }` with its own
  string conversion.

## Behavioral notes, not code changes

- `pepper_sync::SyncStatus` gained two additive fields,
  `total_outputs_scanned` and `total_outputs` (both `u64`, the exact
  integer ratio behind the percentage fields), and an `is_complete()`
  method that also accounts for pending nullifier refetching. Existing
  reads keep compiling. Any place the bridge renders a `SyncStatus`
  through `json::JsonValue::from` will automatically emit the two new
  keys — additive for JSON consumers, but worth knowing when diffing
  fixture output.
- The new fields are an opportunity for the sync UI: an exact
  `scanned / total` ratio with no floating-point rounding, and a
  completion predicate that does not report done while nullifier
  refetching remains. zingo-cli's prompt indicator adopted exactly this
  in the same PR.

## Coordination

The deletion of `do_info` is the final line item of
zingolabs/zingolib#2446, transferred to this repository's typed-error
work (zingolabs/zingo-mobile#1151). Landing the `info_server` migration
together with the #1151 error plumbing closes the loop: after it, no
layer of the stack — zingolib, this bridge, or the platform code —
learns an outcome by inspecting a value's content.
