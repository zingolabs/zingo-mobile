# 7. The mixnet's three legs are observed by capture and probe

Date: 2026-08-24

## Status

Accepted.

## Context

Mixnet Mode routes a send through three links: the client's websocket to
its entry gateway, the sphinx path from that gateway to the exit node,
and the exit node's TCP connection to the destination. When a send
fails, remediation differs by leg. A dead gateway link wants a
reconnect, a refusing exit wants a redraw, and an unreachable
destination is not a mixnet fault at all. Today the app observes none
of them. The proxy FFI reports start failures as prose and the death of
its local SOCKS5 listener, which is leg zero.

The SOCKS5 protocol cannot carry the discrimination. nym's local SOCKS5
server answers every CONNECT with `Success` before anything enters the
mixnet (`nym-socks5-client-core` 1.21.5, `socks/client.rs`,
`acknowledge_socks5`), so `check_connectivity` in `zingo-netutils`
proves only the local listener. zingo-netutils' Sentinel (zingolib ADR
0044) already proves an Exit Node carries traffic, with a round trip
deliberately shaped like traffic the exit sees constantly, but that
evidence never crosses the FFI. When the exit node fails to reach the
destination, its network requester does send a typed
`ConnectionError { connection_id, network_requester_error }` back
through the mixnet, but the client core logs it at `error!` and drops
it (`socks/mixnet_responses.rs`). The gateway link is no better served.
`Socks5MixnetClient` in nym-sdk 1.21.4 exposes no connection state and
no event stream, and websocket failures surface only as `error!` events
inside `nym-gateway-client`. Every signal this decision needs exists in
the process, and none of it crosses an API.

## Decision

The proxy FFI defines the missing observations with a tracing capture
layer and a caller-driven probe, and `zingo-netutils` makes the
bootstrap race typed.

A `tracing` layer inside `zingo-nym-proxy-ffi` matches events from two
target prefixes: `nym_socks5_client_core`, where the exit's
`ConnectionError` reason surfaces, and `nym_gateway_client`, where
websocket send and stream failures surface. Captured events and the
bootstrap narrative queue inside the crate, capped and drop-oldest,
and the host polls one `drain_diagnostics` export that surrenders the
queue in order with the count of any events lost to overflow. The host
implements no callback, so no host code runs on the mixnet client's
threads and no new trait object crosses the FFI. The existing
`ProxyDeathObserver` keeps its at-most-once production contract
unchanged.

The probe has two arms. `probe_sentinel(deadline_millis)` opens one
tunnel through the running proxy and performs the Sentinel round trip
`zingo-netutils::sentinel` defines: a DNS lookup of a constant name,
sent to a public resolver whose silence indicts the tunnel rather than
itself. A Sentinel answer proves legs one and two: the Exit Node
carries traffic. A captured exit `ConnectionError` in the window
proves those legs and names the exit's refusal, and this is the
definition of "exit refused". Silence with captured gateway-client
errors reads as a dead gateway link. Clean silence at the deadline
reads as indeterminate beyond the gateway, and is reported as exactly
that. Because Exit Nodes filter destinations by policy, a refusal
verdict names the Sentinel, never the exit's health.

`probe_destination(host, port, deadline_millis)` completes one TLS
handshake against the caller-supplied destination through the same
tunnel, verifying against the compiled-in Mozilla bundle (ADR 0006),
and hangs up without sending one byte of application protocol. A
completed handshake proves all three legs and the certificate chain. A
TLS-layer fault is its own verdict carrying rustls's reason, which is
the class of failure `nym_http_api_client` flattened into `client
error (Connect)` for weeks. A captured exit `ConnectionError` names
the exit's refusal of this destination. An attempt that ends without a
TLS fault classifies by the window, or stays indeterminate with the
local ending named. The crate holds the deadline and the caller's
host and port, and no wallet configuration.

For the client-to-gateway leg, `zingo-netutils` gains a public
`BootstrapEvent` enum with five lifecycle variants: `DiscoveryStarted`,
`DiscoveryFinished` with the candidate count, `PullLaunched` and
`PullFailed` with the Exit Node address (the failure stays prose, as it
already is inside `RaceEvent`), and `Connected` with the winner. The
driver resolves arm indices to Exit Node addresses. The planner's
hedging mechanics stay private. Every race reports, the first
bootstrap and each reconnect alike, so the screen never goes blind at
the moment after a death.

The whole surface compiles behind a cargo feature that only debug
wallet builds enable. The consumer is a hidden diagnostics screen in
the Zingo app whose bridge module registers from the debug source sets
(`androidDebug`, `#if DEBUG`). Release binaries never carry the log
coupling.

## Consequences

The test surface discriminates the three legs as sharply as an unforked
nym allows, and the exit's own refusal reason reaches the screen. The
price is coupling to nym's log targets and message shapes. The gate
confines that coupling to debug builds, so a nym upgrade that breaks
capture breaks a debug screen and its tests, never a release. The
diagnostics screen cannot help diagnose a release install in the field.
A new `zingo-netutils` surface means a zingolib change and a new tag
before the FFI work starts, and the backend and UI land as separate
changes.

## Considered options

**Read the exit's refusal from SOCKS5 reply codes.** Impossible. The
local server acknowledges success unconditionally before the mixnet is
involved.

**Define the refusal behaviorally, as a stream closed without data.**
Rejected. It loses the refusal reason and cannot distinguish a
mid-mixnet drop from an exit-side refusal.

**Fork nym's client core to forward `ConnectionError`.** Rejected. It
is the honest typed channel, but it adds a nym fork to maintain on top
of the existing zingolib fork, for a debug-build need.

**A Sentinel-only probe, with leg three left to the send.** Rejected
after a first ruling for it. It cannot discern the TLS failure modes
of a live destination, and a certificate fault would keep presenting
as an unexplained stall exactly as it did through
`nym_http_api_client`.

**A destination probe that sends an application request.** Rejected.
It puts protocol knowledge in the crate or pushes it across the FFI,
and the handshake alone already proves the three legs and the chain.

**A streaming callback interface for the diagnostics events.**
Rejected after a first implementation. UniFFI hands the crate a boxed
trait object for every callback interface, host code runs on whatever
thread fires the event, and the only consumer is a debug screen that
polls its platform bridge anyway. The drain keeps every type static
and deletes the forwarder thread the callback needed.

**Read gateway state from a nym-sdk API.** Impossible today. The
research found no connection state, no `is_connected`, and no event
stream on `Socks5MixnetClient`.

**A separate harness APK, or instrumented tests alone.** Rejected as
the host. The diagnostics screen lives in the wallet app, debug builds
only, so a person watches a live device with the wallet's own
configuration.

**Ship the capture layer in release builds.** Rejected. The log
coupling is too brittle to ship to users, and the field-diagnosis case
has not yet earned it.
