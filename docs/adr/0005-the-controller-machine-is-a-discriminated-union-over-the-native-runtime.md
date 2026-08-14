# 5. The controller machine is a discriminated union over the native runtime

Date: 2026-08-13

## Status

Accepted. Settled with the maintainer in the state-machine-hardening design
session. This ADR fixes the controller model. The test spine and the stage
order that lands it are separate decisions in the same effort.

Amended 2026-08-13 by the command-scheduler design
(`.wayfinder/state-machine-hardening/tickets/04-command-scheduler-epoch.md`):
`awaitingConfirmation` is removed. Every command confirms on its own ack, so the
in-flight command is the scheduler's single-flight lane and the only timeout is
Stalled. The `InFlight` type, the confirmation paragraph, and the Stalled
predicate below carry the amendment.

Amended 2026-08-13 by the fix-sequence design
(`.wayfinder/state-machine-hardening/tickets/05-fix-sequence-stage-cut.md`): the
prose term "overlay" is renamed to **in-flight command**, matching the `InFlight`
type and the `inFlight` field this ADR already declares. Naming only, no model
change. The paragraphs below carry the rename.

Amended 2026-08-13 by the price-slice design
(`.wayfinder/state-machine-hardening/tickets/07-pricefetcher-holder.md`): the
scheduler is the sole caller of the **wallet-state surface** (sync, command,
save), not of every `RPCModule` entry point. `zecPriceInfo` is a distinct surface
on its own lane, held as a `price` slice under `loaded` (a discriminated union,
not the `0/-1/-2` magic numbers). It takes the same `LIGHTCLIENT` write lock, so
its contention with that surface is real but out of scope here — the
native-discipline species of the `changeServerProcess` dial.

The Jotai holder is confirmed, not hypothetical. A throwaway spike
(`app/AppState/__prototype__/`, `__tests__/jotaiSyncSubmachine.spike.test.tsx`)
drove this model through the ranked races and proved per-slice subscription
against the real read-surface: a sync tick wakes only the sync consumer, a
`valueTransfers` change wakes only History, and a server switch that mutates the
machine twice wakes no sync consumer because the projection is equality-gated.
Today one field change re-renders all fifty-one consumers, so this is the
re-render storm removed.

## Context

The frontend holds wallet state in six containers that no single owner
coordinates (`STATE_MACHINE_ANALYSIS.md`). Legal states are implied by field
combinations and never named, and async callbacks write into a container that a
reset may already have unmounted. Eight ranked races follow from that shape.

The wallet worker is zingolib behind `RPCModule`. It exposes three independent
native axes, none of them a single enum that crosses the FFI: wallet-loaded
(`LIGHTCLIENT: RwLock<Option<LightClient>>`), the `SyncMode` atomic
(NotRunning / Paused / Running / Shutdown), and a save-required boolean. JS
reads none of these by name. It learns sync state from `poll_sync`, which
returns one of three shapes: the string `"Sync task has not been launched."`,
the string `"Sync task is not complete."`, or the `sync_complete` JSON, matched
by lowercase prefix (`SyncCoordinator.ts:353-373`).

Two facts constrain any model:

- **The worker does not take orders to stop.** A launched sync runs as a
  spawned task on a process-global runtime and holds its own clones of the
  wallet and its mode (`pepper-sync/src/sync.rs:46-49`). Clearing JS timers
  stops JS polling, never the task. So JS commands the worker and observes it by
  polling, and its own belief always lags native reality by up to one poll.
- **One global write lock serializes the commands.** `poll_sync`, `run_sync`,
  `pause_sync`, `run_rescan`, `send`, `confirm`, `save_wallet_bytes`, and
  `change_server` all take `LIGHTCLIENT.write()` (`rust/lib/src/lib.rs:412-442`).
  Native runs them one at a time. `change_server` holds that lock across an
  unbounded network dial with no timeout in the call chain
  (`zingo-netutils/src/lib.rs:292-318`), so a dead host freezes every other
  command, `poll_sync` included, until the dial resolves.

The refactor replaces the six containers with one Jotai-held controller
machine. This ADR names its states and its transition signatures so that
illegal states cannot be built and every transition is total and pure.

## Decision

The controller is one discriminated union, keyed by lifecycle. Sync state,
the save-required flag, and any in-flight command live inside `loaded`, so
"syncing with no wallet" and "save-required with no wallet" cannot be written.

```typescript
type Controller = {
  epoch: Epoch          // one monotonic counter for the whole controller
  phase: Phase
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'resetting' }
  | { kind: 'faulted'; errorKey: ErrorKey; faultPhase: 'load' | 'session' }
  | { kind: 'loaded'; loaded: Loaded }

type Loaded = {
  sync: SyncState
  saveRequired: boolean
  configuredServer: Server   // the server the next sync launch will use
  boundServer: Server        // the server the running sync captured at its launch
  inFlight: InFlight
  view: WalletViewSource     // the fields WalletView reads, and only those
}

type SyncState =
  | { kind: 'idle' }
  | { kind: 'syncing'; progress: SyncProgress }
  | { kind: 'error'; errorKey: ErrorKey; consecutiveFailures: number }
  | { kind: 'persistentFailure'; errorKey: ErrorKey }   // after three non-rescan failures

type InFlight =
  | { kind: 'none' }
  | { kind: 'command'; command: Command; epoch: Epoch; since: Instant }

type Command =
  | { kind: 'launchSync' } | { kind: 'pauseSync' } | { kind: 'rescan' }
  | { kind: 'changeServer'; target: Server } | { kind: 'save' }
```

**`faulted` is one variant.** A corrupt wallet on load surfaces as
`ZingolibError::Init` (bad base64, no chain deserializes, `from_bytes` failure,
`rust/lib/src/lib.rs:87`). An invariant break surfaces as
`LightclientNotInitialized`, `LightclientLockPoisoned`, `SideChannelPoisoned`,
or `Panic`. Both make the runtime unusable and both leave the same state shape:
a runtime that only a reset or a restore can recover. The cause rides as the
`errorKey`, the recoverable phase as `faultPhase`. `faulted` differs from a sync
`error` (a fetch failed, the wallet is intact, a poll retries it) and from a
stalled bridge (below).

**Intent rides as one in-flight command, over last-observed reality.** The base
state is what the last poll saw. A command JS issued but native has not yet
reflected rides as the in-flight command. Because the slot holds exactly one
command, a second command cannot be issued while one is in flight. That
single-in-flight-command invariant serializes writes on the JS side and makes the
torn server-switch read (race #6) unrepresentable: no revert can race the original
switch, because the revert cannot be issued while the switch is still in flight.

Every command confirms on its own ack, so the in-flight command clears when its
native call resolves, never on a later poll. `run_sync` blocks until the task reaches
`Running` within `SYNC_START_TIMEOUT` = 3s, so the launch ack confirms `Running`
and `SyncState` moves to `syncing` with progress filled by later polls. A paused
task is not poll-observable (`poll_sync` returns "not complete" for both `Running`
and `Paused`), so the pause ack is the only signal JS gets and clears the in-flight
command too. `save` and `changeServer` confirm on their own resolution, as before.

**A stalled bridge is reachable, and derived.** When a command's call stays in
flight past a threshold, the bridge is stalled: the derived predicate is
`inFlight.kind === 'command' && now - since > STALL_THRESHOLD`. It is not stored,
so reconcile never reads the clock. This is the only timeout in the model. Stalled tags the offending epoch, offers a
restart, and issues no revert. It does not claim to cancel the native call,
which nothing can.

The transitions:

```typescript
// pure and total. The stale drop is the first branch, returning the input.
reconcile(c: Controller, obs: Observation): Controller
  // if (obs.issuedEpoch !== c.epoch) return c

type Observation =
  | { kind: 'poll';       issuedEpoch: Epoch; result: PollResult }
  | { kind: 'status';     issuedEpoch: Epoch; snapshot: SyncStatus }
  | { kind: 'commandAck'; issuedEpoch: Epoch; command: Command
      outcome: { kind: 'ok' } | { kind: 'rejected'; code: FfiErrorCode } }

// sets the in-flight command, and bumps epoch on an invalidating command
issueCommand(c: Controller, command: Command): Controller
```

The invariants a build session must hold:

- **Epoch** bumps on every boundary that invalidates outstanding results: reset
  or teardown, foreground resume, wallet change, and each `changeServer` issue.
  `reconcile` drops any observation whose `issuedEpoch` differs from the current
  epoch, which cures the after-unmount write (race #2) and the torn server-switch
  read (race #6).
- **The poll mapping.** `"Sync task has not been launched."` means the task
  ended, so a launch is due. `"Sync task is not complete."` means `syncing`.
  The `sync_complete` JSON carries progress, and reaching the tip returns
  `sync` to `idle`. A rejected poll classifies to an `ErrorKey` and moves `sync`
  to `error`, then to `persistentFailure` after three non-rescan failures.
- **Save is must-complete.** A transition to `resetting` waits while `inFlight`
  is a `pending` save. Nothing preempts the save.
- **The server switch settles by itself.** `changeServer` resolving `"server set"`
  sets `configuredServer := target` and clears the in-flight command. `boundServer` catches
  up at the next `launchSync`, where `boundServer := configuredServer`. The
  running sync keeps the old server because it captured its client once at launch
  (`pepper-sync/src/sync.rs:35-48`), but the task is a bounded catch-up that ends
  at the chain tip (`sync.rs:630`, no continuous tip-follower,
  `sync.rs:508`). The next poll then reads `"Sync task has not been launched."`,
  the next launch reads the swapped server afresh (`lightclient/sync.rs:28-35`),
  and the divergence closes within one catch-up, in the normal poll cadence, with
  no app restart.
- **WalletView** is a total function over `Loaded.view`, returning one of
  `spinner | receiveOnly | fullWithSend | fullWithoutSend`, the predicate at
  `LoadedApp.tsx:2359-2416`. It reads observed data only. The in-flight command and the
  stalled predicate never enter the selection. `loading` and `resetting` render
  the spinner. `faulted` renders the error surface, outside the four.

**The error channel carries an `ErrorKey`, never prose** (ADR 0002, ADR 0003).
No `ErrorKey` covers load, corruption, sync, or a native rejection today, and
`FfiErrorCode` (the twenty-two variant names, surfaced clean by `callFfi` in
`app/walletBackend/ffi.ts`) and the `ErrorKeyed` catalog are two vocabularies
with no bridge. This model adds that bridge: reconcile classifies a
`FfiErrorCode` into an `ErrorKey` at its boundary, and the union holds keys only.

## Consequences

The controller makes the whole system honest against the ranked races: stale
results drop by epoch, one in-flight command serializes writes, a stalled bridge is a named
reachable state with a restart escape, and the save cannot be interrupted. Legal
states are the only states the type can hold, and `reconcile` is a pure function
a test drives without a device.

Three items follow this model and are not part of it:

- **The native dial still has no timeout.** The controller models the stalled
  state, but only a connect timeout on the Rust `Endpoint::connect` can stop a
  dead host from freezing the bridge for other callers. That is a native change,
  its own follow-up, out of this effort's scope.
- **New controller `ErrorKey`s and the `FfiErrorCode → ErrorKey` classifier** do
  not exist yet. They are execution work for the stage that lands the model.
- **Active rebind on a server switch is deferred.** The model exposes
  `boundServer` and `configuredServer`, so a later effort can choose to stop and
  relaunch the sync onto the new server at once. Today the app does not, and
  changing that is new sync behavior, out of scope here.
