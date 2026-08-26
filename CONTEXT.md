# Context

A glossary of the ubiquitous language of this repository. Terms are added
as they are resolved in design discussions; each entry states what the
term means here, and, where useful, what it does not mean.

## Ironwood migration (ZIP 318)

Vocabulary for the ZIP 318 Orchard→Ironwood migration flows (the immediate
drain and the private two-phase path). API-facing terms follow zingolib's
`lightclient/migrate.rs`; UI-facing terms are the deliberately smaller set the
user sees. Code uses the API terms; rendered copy uses only the UI terms.

### Migration paths

**Migration**:
Moving the wallet's Orchard funds into the Ironwood pool under ZIP 318, by
either path.

**Drain**:
The immediate path: every Orchard note sent to Ironwood as-is, amounts visible
on-chain, in one interactive session. UI label: "Migrate now".
_Avoid_: fast path, happy path (session slang, not product language)

**Private migration**:
The two-phase path: note splitting, then scheduled sending inside windows.
UI label: "Migrate privately".
_Avoid_: privacy path, scheduled migration

### The private path

**Note splitting**:
Phase 1. Resizing (splitting or consolidating) Orchard notes into exact
denominations via Orchard self-sends, driven to completion in one interactive
session. Stepper label: "Split notes".
_Avoid_: Phase 1 (in UI copy), restructuring

**Round**:
One set of split transactions broadcast together; the next round may only
start after the previous round confirms. A plan has one or more rounds.

**Part**:
One denomination-sized unit bound at the end of splitting; each part becomes
one Orchard→Ironwood transfer in phase 2. In UI copy, call it a **note** —
each part consumes exactly one split note.
_Avoid_ in UI: part, shipment

**Sending**:
Phase 2. Broadcasting parts in batches inside scheduled windows, resumable
across app kills, driven by notifications. Stepper label: "Send batches".
_Avoid_: Phase 2 (in UI copy)

**Batch**:
The group of parts broadcast together in one window. UI-facing term.
_Avoid_: bucket (API-internal), shipment

**Window**:
One 144-block (3h) anchor-height bucket during which a batch may be sent.
UI-facing term.
_Avoid_: bucket, epoch

**Boundary**:
The block that opens a window, and the height every part sent in that window
anchors to. Sharing one anchor is what keeps a send free of per-wallet timing
information. A window can only carry notes that already existed at its
boundary, so a batch of freshly split notes waits for the next one.

**Cadence**:
How many parts share each window (`per_bucket`). Chosen once, after splitting
completes and before any part is signed; only re-buckets existing parts, never
re-cuts notes. UI frame: "How many batches?"

**Wake**:
An OS-scheduled re-entry into the app for a window. Two kinds per window: a
silent refresh at the window boundary (sync-only, captures proof material) and
a user-facing notification at the window's random target time (leads to the
execute screen). In UI copy the notification is a **reminder**; a batch is
**due** at its target time, never "send by" (lateness is designed-for, not a
deadline miss).

**Anchored**:
A note is anchored once the chain has advanced far enough past its
confirmation that the wallet will spend it. A round's outputs are mined some
blocks before they are anchored, and in that gap the note set shows neither the
round's inputs nor its outputs, so planning over it is wrong.

**Slid**:
A part whose window became unwitnessable and which moved itself to a coming
window. Rendered as a plain explanatory sentence, never an error.

**Stranded**:
Value left out of the plan because moving it would cost more than it carries.
Disclosed at consent.

**Residual**:
What remains when the migration completes; disclosed on completion.

**Consent**:
The single user approval of an exact plan hash before anything is signed or
sent. Covers the whole migration, both phases.

## Theme tokens

Vocabulary of the semantic color layer in `app/theme`. A color is always
referred to by its token, never by value.

**Token**:
A named color role, the unit of the palette. Its name is a surface prefix
plus a role, flat camelCase: `bgCanvas`, `fgMuted`, `borderAccent`.
_Avoid_: color constant, hex, variable

**Surface**:
Which part of a rendered element a token paints: `bg` (fills), `fg` (text
and glyphs), `border` (strokes). Unqualified "surface" always means this
axis; the raised-panel role is always written out as `bgSurface`.

**Role**:
The meaning half of a token name — what the color is *for* (Canvas, Muted,
Accent, Danger), as opposed to which surface carries it.

**Family**:
The tokens sharing one role across surfaces, e.g. the accent family
`fgAccent`/`borderAccent`/`bgAccent`. Families migrate, change, and are
discussed as units.

**Canvas**:
The screen's base plane (`bgCanvas`).
_Avoid_: background (ambiguous — every `bg` token is a background)

**Chrome**:
Navigation furniture — tab bar, side menu (`bgChrome`).

**Muted**:
The de-emphasized neutral for secondary text, subtle borders, and quiet
fills. Mode-dependent.
_Avoid_: grey, placeholder, zingo (dead legacy names)

**Accent**:
The brand color a mode selects — green in advanced, steel blue in basic.
One value across its three surface tokens today; the split exists so text
and fill can diverge later.
_Avoid_: primary, brand color

**Emphasis**:
The stronger sibling of a status role: `fgDangerEmphasis` is the red for
destructive actions, while bare `fgDanger` is the orange of danger body
copy. Named by traffic, deliberately against design-system convention —
here the bare name is the common case, not the loud one.

**Component token**:
A token named after a component instead of a role. Exactly one exists,
`bottomSheetBorder`; a second one needs a reason the map's role set cannot
express.

**Mode**:
`advanced` or `basic`. One theme exists; the mode selects the accent and
the muted neutral, and gates feature visibility.
_Avoid_: theme (for a mode), dark/light (no light mode exists)

**Overlay**:
The mode-dependent slice of the palette (the accent and accent-disabled
families, `bgSecondaryDisabled`, and the muted trio). Everything else is
the shared **base**. "Edit the overlay" means a per-mode change; "edit the
base" changes both modes at once.

**Legacy name**:
The pre-migration vocabulary: `primary`, `secondary`, `text`, `money`,
`zingo`, `placeholder`, `border`, `card`, and friends. Dead — use only
when reading history.

## CI

**Blocking check** — a PR CI job whose failure fails the pull request.
Jest, rust-shear, js-depcheck, andr-dependency-analysis, the Android
Kotlin compile, the Android JVM unit tests, the Android build chain, and
the Android integration buckets are blocking checks.

**Advisory stage** — a PR CI job that records its result without
affecting the pull request verdict. No PR stage currently runs in
advisory mode: every job's failure fails its run. ci-nightly remains
the enforced gate for the device ABIs and iOS.

**Verdict path** — the longest chain of blocking checks; its wall-clock
length is the time from push to PR verdict. Advisory stages are never on
the verdict path.

**Bucket** — a group of Android integration tests that share one CI job,
so runner setup and emulator boot amortize across the group instead of
being paid once per test. Unrelated to the migration API's `per_bucket`
windowing sense, which UI copy avoids entirely.

**Fail-all** — the policy that the first failure of any blocking check
cancels the entire run at once, rather than letting the surviving checks
run to completion for diagnostic completeness. Under fail-all, one red
run reports the first failure found, not necessarily every failure
present.

**Artifact gate** — a step inside a job that waits for a named artifact
from an upstream job in the same run, instead of a `needs:` edge between
the jobs. It lets a job front-load work that does not depend on the
artifact, and it must abort promptly with a clear message when the
upstream job that produces the artifact concludes without success.

**Device ABI** — an ABI that real Android devices execute: arm64-v8a for
nearly every device in use, armeabi-v7a for the 32-bit remainder. The
device ABIs are what a release ships. No GitHub-hosted runner can
execute them, so CI proves they build, never that they run.

**Emulator ABI** — an ABI the CI emulator executes with KVM
acceleration, which requires the guest to match the x86_64 host: x86_64
and 32-bit x86 only. Calling one of these "primary" is wrong; an
emulator ABI in a test lane reflects a hosting constraint, not which
library matters most.
## Build identity

**Build descriptor** — the string `get_version()` reports: a zingolib
part and a zingo-mobile part (`zl_…-zm_…`), each derived from git
describe against that repo's release tags. The commit count and
5-character hash fields are elided when a part sits exactly on its
release tag, and `_dirty` marks a part built from an uncommitted tree.

## Mixnet Mode

Vocabulary for the mixnet transport surface. Type names follow zingolib's
`mixnet/mode.rs` and `mixnet/route.rs`.

**Mixnet Mode**:
The feature: carrying the send and price surfaces over the Nym mixnet. A
persisted user opt-in, default off and sticky.

**Indicator**:
The state Mixnet Mode reports: `off`, `bootstrapping`, `ready`, or `died`.
It crosses the FFI as the `mixnet_indicator` payload key and reaches the app
as `RPCMixnetIndicatorEnum`.
_Avoid_: mode (names the feature, not the state it reports)

**Route**:
The network path a mixnet-only surface resolves to, either the Standing
Client's tunnel or clearnet. zingolib derives it from the indicator, and the
app never sees it. A price fetch that resolves to clearnet is refused, never
sent.

## Wallet storage

Vocabulary for wallet files at rest. The full state inventory lives in
`docs/agents/wallet-file-states.md`; the security stance is ADR 0007.

**Wallet file**:
The raw `wallet.save()` bytes at rest, byte-identical to a desktop
zingolib wallet file. base64 is a bridge encoding, never a storage
format (iOS keeps base64 text on disk until Step 2 of the storage
rework).
_Avoid_: encrypted file (no app layer since ADR 0007)

**Open / closed**:
A wallet is open while the zingolib lightclient holds it in memory, and
closed when it exists only as its wallet file. Saving writes the open
wallet back to its file; it does not close it.

**Retained wallet** (`wallet.backup.dat`):
The previously active wallet file, kept aside when the user switches
wallets and restorable from the start menu.
_Avoid_: backup (collides with device backups, which wallet files are
excluded from)

**Device backup**:
The OS backup mechanism (Google backup, iCloud). Wallet files are
always excluded from it; a wallet restored from a stale device backup
is an incident, not a feature.
