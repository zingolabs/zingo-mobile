# Security practices

Distilled from the Least Authority initial audit of zingo-mobile
(12 June 2026; issue letters below cite it). Read this before touching a
sensitive path. These are working rules for agents in this repo, not a
summary of the report: each one states what to do in code you write or
review here. The audit's closing principle governs all of them — for a
privacy-preserving wallet, the auxiliary channels (logs, clipboard,
screenshots, deep links, local files) are part of the security boundary
and deserve the same rigor as the transaction path.

## Channels and errors

- Errors are types, and errors and data flow in separate channels —
  ADR 0002 and ADR 0003 (Issues Q, R). Never resolve error prose into a
  success channel, never sniff a payload for a sentinel, and settle both
  bridges through `FfiOutcome`. New code follows this without exception.
- Never branch on error message text; message strings are for humans and
  may be translated or reworded at any time (Issue R).

## Sensitive material never leaks sideways

- Never log wallet exports, seeds, viewing keys, addresses, or any
  recovery-capable material — on any path, and especially on failure
  paths, where the temptation to dump state is strongest (Issue A). Log
  a non-sensitive descriptor instead.
- Route all logging through a facade that production builds disable;
  a `console.log` you add for debugging is a production leak until
  proven otherwise (Issue K).
- Do not offer the clipboard for seed phrases (Suggestion 5), and set
  `autoComplete='off'`, `autoCorrect={false}`, and a non-predictive
  keyboard on every text input that handles sensitive text, so the
  keyboard's prediction dictionary never learns a seed (Issue M).
- Assume the screen is recordable: sensitive screens opt out of
  screenshots, recording, and app-switcher previews (Issue B), and the
  window is blanked before any biometric or keychain prompt (Issue C).

## Gates hold at the destination, not the doorway

- Enforce a biometric or security gate in the sensitive screen's entry
  layer itself, never only at the call sites that happen to navigate to
  it today — a new navigation path must not be able to bypass the gate
  by construction (Issues D, L).
- On Android, reject obscured touches on sensitive flows
  (`filterTouchesWhenObscured`, and `HIDE_OVERLAY_WINDOWS` where
  available) so an overlay cannot deceive the user into tapping
  (Issue I).

## Untrusted input is validated before it becomes state

- A parser error is a hard failure: no field parsed from a QR code,
  deep link, or URI updates application state until the whole parse is
  known good (Issue H), and size bounds apply before decoded input is
  stored, not only at submit time (Issue O).
- Server endpoints are https-only by default; plaintext http is a
  development-gated exception, never a valid production configuration
  (Issue G). When a custom server is set, verify the chain it reports
  matches the wallet (Suggestion 4), and never silently replace a
  user-configured server (Issue S).

## Persistence is atomic, awaited, and protected

- Report success only after the write completes: await filesystem
  promises and propagate their errors; UI state changes follow
  persistence, never precede it (Issue F).
- Write wallet files atomically — write to a temporary file, then
  rename over the target — so a crash mid-write can never destroy the
  only copy (Issue P).
- Prefer keychain-backed or keychain-encrypted storage for wallet data
  and settings, with properties set so nothing syncs to cloud backup
  and access survives new biometric enrollment (Issue N); request
  hardware-backed keys on Android (Suggestion 2) and use AES-GCM, not
  RSA, so payload size cannot break storage (Issue T).

## Async discipline

- Await every async result; a fire-and-forget call is a dropped error
  and, on sensitive paths, an exploitable race (Issues L, F). When
  racing a call against a timeout, ensure the loser cannot mutate state
  after losing (Issue S).

## Reproducibility

- Lockfiles are committed, and dependency audits run in CI for both the
  JavaScript and Rust graphs (Issue E).
- A constant that exists in both TypeScript and Rust has one source of
  truth, or a test pinning their correspondence (Suggestion 6).
