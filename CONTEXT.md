# Zingo Mobile — Ironwood Migration

Vocabulary for the ZIP 318 Orchard→Ironwood migration flows (the immediate
drain and the private two-phase path). API-facing terms follow zingolib's
`lightclient/migrate.rs`; UI-facing terms are the deliberately smaller set the
user sees. Code uses the API terms; rendered copy uses only the UI terms.

## Language

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
One 256-block (~5.3h) anchor-height bucket during which a batch may be sent.
UI-facing term.
_Avoid_: bucket, epoch

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
