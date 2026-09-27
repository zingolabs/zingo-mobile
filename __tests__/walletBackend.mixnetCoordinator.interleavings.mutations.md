# What the interleaving harness was checked against

`walletBackend.mixnetCoordinator.interleavings.unit.test.ts` enumerates
orderings and asserts invariants. A harness like that is worth its weight only
if it fails when the coordinator is wrong, so each invariant was checked by
deliberately breaking the coordinator and confirming the harness caught it.

The first version of the harness caught **none** of these. That is what the
table is for: it turned "the harness is green" into "the harness has teeth",
and every escape named a knob the scenario space was missing — a `died` attach,
a failing stop, a hanging stop, a hanging attach, a disable that answers
something other than `off`. Re-run this table after changing either side.

## The breakages

| Mutation                          | Removes                                                             | Caught by                                                                         |
| --------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| reconnect ignores Offline         | the `phase !== 'online'` guard in `scheduleReconnect`               | no start after the session went Offline; an Offline session leaves no timer armed |
| no orphan stop                    | the `stopOrphanedTransport` call in `draw`'s superseded path        | no transport outlives an Offline session                                          |
| no epoch check after disable      | the staleness check between the disable and the stop in `goOffline` | a proven Online session keeps its transport                                       |
| start ignores a queued stop       | the `teardown.pending` wait in `draw`                               | a proven Online session keeps its transport                                       |
| publishes a stale attach          | the staleness check after `attachMixnet` in `draw`                  | an Offline session rests at off; an Offline session leaves no timer armed         |
| offline trusts the disable answer | publishes the wallet's answer instead of `OFF_REPORT`               | an Offline session rests at off                                                   |

## The one that is equivalent, and why

Removing the `phase !== 'online'` guard from **both** `armBootstrapDeadline`
and `redraw` changes nothing the harness can see, and that is correct rather
than a gap: after `goOffline` publishes `off`, `isBootstrapping()` is false, so
the deadline is never armed while Offline. The guards are defence in depth over
a path whose cause is gone.

They were load-bearing before. Combining the mutation with its cause — publish
a `bootstrapping` answer from the disable **and** drop both guards — brings the
dial straight back, and the harness catches it on four invariants at once,
`no start after the session went Offline` among them. So the path is covered
through its cause, and each guard on its own is redundant with the other.

Mutating either guard alone is therefore not a valid probe. A mutation that
does not change behaviour must not fail the suite.

## Running it

```
yarn jest __tests__/walletBackend.mixnetCoordinator.interleavings
```

6528 scenarios, about a second and a half. An act that never settles is counted
rather than awaited, so a coordinator that deadlocks fails the
`every act settles` invariant instead of hanging the suite — which is how the
head-of-line block in a fully serialized design was caught.
