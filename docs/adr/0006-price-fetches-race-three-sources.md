# 6. Price fetches race three sources

Date: 2026-07-27

## Status

Accepted. Supersedes the sequential source rotation designed earlier the
same day, which was never wired.

## Context

The price surface had one source, Gemini, so any Gemini outage or an
unlucky path to it cost the user the price entirely. ADR 0005 made the
fetch lock-free, which removed the cost of concurrency on this surface:
nothing waits on a price fetch anymore, however many requests it makes.
A sequential rotate-on-failure design was considered first, but it pays
one failed source's full 20-second timeout before trying the next, and
it needs sticky rotation state.

## Decision

A price fetch races all three sources concurrently — Gemini and Kraken
through their recent-trades endpoints (median of eleven trades), and
CoinGecko through its simple-price endpoint (an aggregator's spot
value) — and reports the first success. Losing legs are cancelled. The
payload names the winning source beside the route attestation. A fetch
fails only when every source fails, and that failure names each
source's typed error with its full cause chain, so a total outage is
diagnosable per operator.

Each leg keeps the 20-second request bound, so the race settles within
the same single-fetch contract the UI's 25-second watchdog assumes.
The source mechanism lives upstream in zingo-price (the `PriceSource`
union with per-source parsers and `race_current_price`); the mobile FFI
consumes the race over the fail-closed route.

## Consequences

Availability improves to the union of three operators, and the race
never takes longer than the slowest bound. The costs are accepted: every
fetch contacts three operators instead of one, which over clearnet
(the deliberate mixnet toggle-off) reveals the fetch to all three; over
the mixnet the proxy hides the client from all of them alike. CoinGecko
is an aggregator, so its spot value carries a different trust model
than an exchange's trade median; it serves as the last-resort diversity
leg, not the reference. The sequential rotation order remains available
upstream (`PriceSource::next`) for a caller that prefers one source at
a time.
