# 7. Server selection consults only the census

Date: 2026-07-28

## Status

Accepted

## Context

Server selection had two sources: the census (zingolib#2571, the sole
source of truth for indexer endpoints) and a live registry fetch from the
community server monitor (`hosh.zec.rocks/api/v0/zec.json`). The live
fetch ran at every boot in auto mode, at every Settings-screen open, at
every list-mode validation, and at every send-failure and RPC-failure
recovery. Each call announced "a Zingo wallet is booting or failing here"
to one operator from the wallet's real IP, and the response decided which
indexer the wallet would trust next — a steering surface: a compromised
or coerced registry could funnel wallets onto chosen operators, defeating
witness rotation and operator diversity at their root. The census had
already absorbed the registry's static value (the uptime leaderboard
snapshot rides in `indexers.rs` with its source and date).

## Decision

The app never fetches the live registry. Auto mode probes the census's
active entries by latency and takes the best; list mode validates the
stored server against the census's active entries; every recovery path
selects from the census ranked by latency. The census refreshes on code
cadence under its documented update policy, not on boot cadence over the
network.

## Consequences

Selection freshness now moves at release cadence: a server that dies
between releases costs a failed probe and a fallover instead of being
pre-filtered by the monitor. In exchange, boot, Settings, and recovery
stop beaconing to a single operator; no remote party can steer indexer
selection; and offline behavior is simpler (one fewer unreachable-network
arm per path). The hosh monitor remains the observation source for
refreshing the census's uptime-derived entries at release time, which is
where a community monitor belongs in a threat model that includes the
monitor itself.
