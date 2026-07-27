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
One bucket-modulus span of anchor heights (144 blocks, ~3h provisionally)
during which a batch may be sent. UI-facing term.
_Avoid_: bucket, epoch

**Boundary**:
The block that opens a window, and the height every part sent in that window
anchors to. Sharing one anchor is what keeps a send free of per-wallet timing
information. A window can only carry notes that already existed at its
boundary, so a batch of freshly split notes waits for the next one.

**Cadence** (retired):
Formerly the user-chosen parts-per-window count (`per_bucket`). The ZIP 318
Poisson schedule draws every broadcast delay itself, so there is no cadence
to choose and no chooser screen; the term survives only in history.

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

## Mixnet Mode

**Mixnet Mode**:
Routing the send (transaction broadcast) and price-fetch surfaces over the
Nym mixnet. Synchronization is never covered; the IP-correlation disclaimer
(ZIP-0318) states that boundary. Modes: `off`, `bootstrapping`, `ready`,
`died`.

**Fail-closed**:
The policy that when Mixnet Mode is anything but `off`, a covered surface
that cannot reach the mixnet refuses rather than falling back to clearnet.
A refusal is not a server error and is never retried.

**Silent alpha APK**:
An alpha build of the app that routes the covered surfaces over Nym with
the stock (pre-Mixnet-Mode) UX/UI — no toggle, no banners, no disclaimer
screen. Its purpose is isolating transport behavior from UI work.
_Avoid_: silent mode (it is a build, not a runtime mode)

**Always On** (build flavor):
The build flavors that produce the silent alpha APKs: Mixnet Mode is enabled
unconditionally at wallet initialization and cannot be disabled at runtime.
Two network variants exist — `alwayson` first-runs on mainnet, and
`alwaysontest` first-runs on testnet — installable side by side.

## CI

**Blocking check** — a PR CI job whose failure fails the pull request.
Jest, rust-shear, js-depcheck, android-dependency-analysis, the Android
Kotlin compile, the Android JVM unit tests, the Android build chain, and
the Android integration buckets are blocking checks.

**Advisory stage** — a PR CI job that records its result without
affecting the pull request verdict. The per-PR iOS pipeline is an
advisory stage; ci-nightly remains the enforced iOS gate.

**Verdict path** — the longest chain of blocking checks; its wall-clock
length is the time from push to PR verdict. Advisory stages are never on
the verdict path.

**Bucket** — a group of Android integration tests that share one CI job,
so runner setup and emulator boot amortize across the group instead of
being paid once per test. Unrelated to the migration schedule's windowing
sense of the word, which UI copy avoids entirely.

**Mobileclient scenario contract** — the agreement that the
`*_mobileclient` regtest scenarios zingo-mobile consumes from zingolib
keep pre-ironwood semantics: the scenario chain never activates NU6.3,
no funds can land in the Ironwood pool, and the on-device ledgers assert
the pre-ironwood distribution. An ironwood-era ledger is valid only
after a coordinated change on both sides of the contract.

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
