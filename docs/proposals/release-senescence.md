# Proposal: release senescence instead of a remote forced-update switch

Status: proposed, for discussion. If the proposal is accepted, a companion ADR
(`docs/adr/0003-release-senescence.md`) and `CONTEXT.md` glossary entries land with the
implementation; both are drafted and follow this document.

## What the audit asked for

Least Authority's Suggestion 1 ("Implement a Forced Update Gate for the Application") observes that
nothing compares the installed version against a remotely controlled minimum supported version and
blocks usage of untrusted builds, so users may run deprecated or vulnerable releases indefinitely.
Its interim mitigation is operational: publish a minimum supported version and expedite store
rollouts. The suggestion carries no impact or severity ratings and leaves every design question
open: who controls the value, over what transport, which way it fails, and what "blocks usage"
means for a self-custody wallet.

## The core proposal

Adopt the threat, reject the remote control. Each release bakes an estimated mainnet block height
at release-prep time, and the app measures its own age against the chain tip it already syncs.
This is zebrad's end-of-support mechanism (constants verified from
`zebrad/src/components/sync/end_of_support.rs`: warn at 91 days, refuse to run at 105, age
estimated from `ESTIMATED_RELEASE_HEIGHT` and target block spacing, mainnet only, no override),
adapted to a wallet in one decisive way: a wallet must degrade, not die.

A senescent build loses exactly one capability, attaching to the network. Everything Offline mode
can do today continues: the wallet stays readable, history stays visible, keys stay exportable.

Why height and not a signed manifest or a clock:

- No party holds a kill switch. The deadline is public in each release's source. A signed remote
  manifest would need a key ceremony, a perpetual hosting commitment, and someone trusted to brick
  the fleet; its fail-open/fail-closed dilemma has no clean answer (fail open and a network attacker
  suppresses it, fail closed and an infrastructure lapse bricks everyone).
- The chain is already synced and already authenticated. Suppressing the signal means serving a
  stale tip, which also visibly stalls the user's sync. Accelerating it means mining real
  proof-of-work. Device clocks, by contrast, are user-settable.
- The app must never fetch a minimum version at runtime, not even from our own registry. That would
  rebuild the remote switch through the back door and make the registry operator a party who can
  gate the fleet.

The trade we accept: senescence cannot be accelerated. A critical vulnerability found the week
after a release leaves that build alive until its baked deadline. A signed manifest could be added
on top later if that trade ever stops being acceptable; the two mechanisms compose.

## Decisions reached (grilling of 2026-07-28)

1. **Failure mode.** Past drop-dead the app behaves as if Offline were the only server option,
   reusing the existing `SelectServerEnum.offline` machinery rather than inventing a lockout
   screen. Key export remains reachable from the senescent state, always.
2. **Recovery.** In-place store update is the primary path: app data survives, the updated build
   carries a farther drop-dead height, the gate lifts on next launch. Key export into a fresh
   install is the standing fallback, never the primary instruction, because every seed ceremony we
   train users into is phishing surface.
3. **Schedule: warn at 54 days, final notice at 67, drop-dead at 81.** The warning begins just past
   the longest observed production release gap (52 days, 2.0.20 to 2.0.21), the window lasts 27
   days, and a worst-case-so-far slip leaves about a month of slack. Ages convert to blocks at the
   75-second target spacing (1152 blocks/day) via the existing `BlockTime.ts` helpers.
4. **Evaluation semantics.** Pure chain height, no wall clock. At launch the app judges the height
   persisted from its last sync: already past drop-dead means Offline from the start, no attach
   attempted. If a live session's sync crosses the threshold, the session finishes (with the final
   interstitial shown) and the gate applies at next launch, which deliberately grants a
   long-absent user one grace session. A height of zero or below the release height reads as
   fresh: the gate acts only on evidence the chain moved past the deadline, so unknown state never
   locks anyone out.
5. **Scope.** Mainnet only; testnet and regtest never gate. Dev builds (`__DEV__`) never age, so
   stale checkouts keep working on emulators.
6. **Surfaces.** Warning window: a dismissible-per-session banner on the main screen (the
   `IronwoodMigrationBanner` pattern) stating the drop-dead as a human date (via
   `estimatedTimestampMs`), with an Update action. Final fortnight: a passable launch
   interstitial, also shown on a mid-session trip. Senescent: forced Offline plus a
   non-dismissible explanation card with Update and Export actions; server selection disabled with
   the same explanation. All copy is translation keys rendered at the display edge; the senescence
   module itself exposes state only (`fresh | warning | final | senescent` plus the estimated
   date) and never calls `translate`, per ADR-0002.
7. **Baking.** `release-prep.mjs` stamps the height: when the version/build actually changes, it
   fetches the current mainnet tip from the hosh registry (the same source the app trusts for
   server lists; a median over online servers), writes the const, and keeps its documented
   idempotency (re-running with current values re-stamps nothing). On fetch failure it accepts a
   manually supplied height rather than silently stamping nothing. Both channels stamp the same
   shared const; each binary carries the height stamped at its own prep. Betas ship well inside
   the window and effectively never gate.

## Implementation sketch (no code yet)

- `app/AppState/const/Senescence.ts`: `RELEASE_HEIGHT` (stamped; currently ~3,428,742 per hosh),
  the three thresholds, a pure phase function of the last-known height, a drop-dead date
  estimator, and a monotonic launch-height carrier for UI that renders while Offline.
- Settings persistence: a `lastKnownHeight` entry (`SettingsNameEnum`, `SettingsFileClass`,
  defaulted in `SettingsFileImpl.readSettings`), written from `LoadedApp.setInfo` when the mainnet
  tip advances materially (throttled, ~1000 blocks), read by the launch gate.
- Launch gate in `LoadingApp`'s settings effect: senescent plus a mainnet server config forces
  `selectServer`/`server` to Offline in memory only, never persisted, so an update restores the
  user's original server choice untouched.
- Warning/senescent banner beside `IronwoodMigrationBanner` in `History`; final interstitial at
  launch and on mid-session trip.
- Update link: Android `https://play.google.com/store/apps/details?id=<bundleId>` (bundle id read
  at runtime, so Beta links to its own listing); iOS App Store id 1668209531 (verified via
  Apple's lookup API). Sideloaders are pointed at the GitHub releases page in the explanation
  copy.
- New `senescence.*` keys in all five catalogs.
- Unit tests over the phase boundaries, the zero-height and pre-release-height cases, and the dev
  exemption.

## What this binds us to

An 81-day lifetime is a commitment to ship production releases meaningfully faster than 81 days,
forever, through store review delays. Our history says we already do. A release-age tripwire (a
scheduled alarm when the latest production tag passes 30 days) is recommended alongside, so the
humans feel a slipping cadence weeks before any user does.

## Open questions for zingoistas

1. Are 54/67/81 the right numbers, and should the release-age tripwire be part of the same work?
2. Should the iOS Beta channel link to TestFlight rather than the production App Store listing?
3. Does anyone want the signed-manifest emergency accelerator designed now rather than left as a
   documented later addition?

## References

- Least Authority audit report, Suggestion 1 (and Issue R context).
- `docs/adr/0003-release-senescence.md` (proposed) and `docs/adr/0002-error-keys-not-prose.md`
  (module/display-edge conventions the implementation follows).
- zebrad `end_of_support.rs` (the precedent: 91/105 days, height-estimated age, mainnet only).
- zcashd's End-of-Support halt, the original auto-senescence precedent in Zcash tooling.
