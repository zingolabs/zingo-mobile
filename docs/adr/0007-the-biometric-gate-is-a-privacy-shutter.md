---
status: accepted
---

# The biometric gate is a privacy shutter

Five review rounds of the biometric gate (PRs 1325 through 1339, August 2026) converged on the
same lesson: most of the gate's complexity, and most of its defects, came from defending a
security boundary the mechanism cannot enforce. The gate protects nothing cryptographic. The
sentinel it read held the string "1", wallet keys are not encrypted under the prompt, and the
locked screen's retry path admitted a patient adversary in a common configuration regardless of
policy. Every fail-closed arm, platform-split stall verdict, and prompt-liveness heuristic
existed to resist an adversary who was never actually resisted, and each one cost a review
round of interleaving bugs between async gates, AppState events, and React lifecycles.

We decided the gate is a privacy shutter: a deterrent against a casual person holding the
unlocked phone, and nothing more. Five consequences follow as one architecture.

1. **One gate controller.** A single authority runs every authentication ceremony. Surfaces
   that want the shutter closed (app foreground, screen entry, a toggle flipping on) are
   triggers that ask the controller; none owns a prompt. Concurrent triggers join one ceremony,
   and a cancel answers all of them, each enacting its own local consequence. This deletes the
   two-authority split and its coordination layer: the purpose axis, the shared-run
   reinterpretation, the `unanswered` verdict, the foreground holds, and the teardown graces.

2. **A freshness window replaces run-sharing.** After a successful ceremony, any trigger within
   the window passes without a new prompt. This is the deduplication the in-JS run-sharing
   machinery approximated, moved to the place that can state it in one constant.

3. **Every gate-cannot-run outcome fails open, on every platform, with a visible notice.** A
   stall, an expired wait, a platform error nobody was prompted for: the shutter opens and says
   so. The per-platform `settleAs` split, the wait-out-bypass analyses, and the fail-closed
   expiry all delete. What survives of the stall machinery is user experience only: one window
   constant, and never declaring a stall over a live prompt.

4. **A minimal native device-auth call replaces the keychain sentinel.** `LAContext` on iOS and
   `BiometricPrompt` on Android, wrapped in a deliberately tiny module of our own. The sentinel
   was a prompt-summoning trick with maximal side effects: entry staleness and rebuild phases,
   service versioning, probe chains, a serialized native queue that made stalls common, and
   error codes so ambiguous they were scraped from message text with a regex. A direct call has
   no entry to be stale and returns typed error codes. We had rejected the maintained wrapper
   libraries for good reasons in PR 1325; owning forty lines per platform is the smaller cost.

5. **A toggle enables a trigger, and nothing else.** No toggle selects a mechanism, a policy,
   or a retry path. The locked screen is the decline consequence of an app-level trigger, and
   its retry asks the controller unconditionally, which makes the retry-bypass class
   unrepresentable instead of guarded.

Considered and rejected: keeping the two-authority split with better coordination (each of the
last thirty findings was the price of that split); a fail-closed Android arm (it stops no
adversary the retry path does not already admit, and it produced the issue #1266 lockout class
twice); hardening the sentinel further (its failure modes are structural); and adopting a
maintained biometric wrapper library (unmaintained or audit-burdened, per PR 1325).

Consequence worth naming plainly: a person holding the owner's unlocked phone can wait out a
wedged gate and enter. That is the shutter's contract. A user who needs a security boundary
needs an OS-level device lock and, for funds, a spending key not present on the device; the
gate never provided more, and now no longer pretends to.
