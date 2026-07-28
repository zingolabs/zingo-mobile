# 5. The price fetch never holds the wallet lock

Date: 2026-07-27

## Status

Accepted. Decided during the 2026-07-27 diagnosis of tester-reported
app-wide sluggishness with "Check Balance in Dollars" enabled
(feat/nym handoff APK built 2026-07-27 18:09).

## Context

`zec_price()` ran under the FFI's global `LIGHTCLIENT` write lock and
held it across a network fetch. Every other FFI call — the 5 s sync
tick, balances, sends — queues on that lock, so one slow fetch froze
the whole surface. Over the mixnet a fetch is bounded only by
zingo-price's 20-second request timeout, and the app's auto-refresh
retries a failed fetch immediately: up to two 20-second freezes per
60-second cycle, which testers perceived as the app freezing "every
20 seconds". zingolib had already moved its own price recording off
the fetch path (`fetch_current_price` is documented lock-free); the
mobile FFI reintroduced the blackout one level up.

## Decision

The price-fetch flow never obtains the wallet lock, in either
direction:

- The route (mixnet, clearnet, or fail-closed refusal) is planned
  purely from a snapshot of the mixnet state, recorded by calls that
  already hold the lightclient for their own reasons (initialization,
  enable/attach/disable, the app's mode poll). The snapshot may lag
  one poll interval.
- The fetch runs with no lock held and stores its result in a bounded
  in-memory observation window: at most 1000 price points, oldest
  dropped when the 1001st arrives.
- Persistence is best-effort by contract. An observation reaches the
  wallet only when some other operation (a send, receipt discovery, a
  save) takes the write lock while it is buffered, and it may be lost.
  A price fetch guarantees a payload to the caller, never durability.

A unit test holds the write lock for its whole duration and requires
`zec_price()` to settle anyway; it fails precisely when the flow
touches the lock.

## Consequences

The FFI can no longer stall behind the price surface, whatever the
tunnel does. The price shown to the user comes from the fetch payload
and is unaffected. The costs are accepted and explicit: the route
snapshot can be stale between polls, and buffered observations are
lost if no lock-holding operation runs before process death (today
the piggyback write is not yet wired — it requires a public recording
API on the pinned zingolib, and until that lands the window buffers
without draining). The wallet's stored price series becomes advisory,
not a record of every fetch.
