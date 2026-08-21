# 6. The mixnet proxy's TLS verifies against the compiled-in Mozilla bundle

Date: 2026-08-21

## Status

Accepted. Supersedes ADR 0004, which chose Android's platform verifier.
This decision returns the mixnet proxy to zingolib ADR 0021 and restates
that ADR's patch inside this repository's proxy workspace.

## Context

ADR 0004 reasoned that this repository, unlike a library workspace, owns
an application `Context` and a Kotlin source set, so it could initialize
`rustls-platform-verifier` properly and take the platform trust store.
The wiring worked. The verifier did reach Android's certificate store,
was handed the `Context` before every proxy start, and returned a verdict.
The verdict was that Nym's own API certificate is revoked.

Measured on 2026-08-20 against `validator.nymtech.net`, the host
`NymProxy::start` queries for the exit-node topology, Android's
`CertPathValidator` reports `Certificate does not specify OCSP responder`,
and `rustls-platform-verifier` maps that exception to `Revoked`. Discovery
fails in under two seconds, the coordinator's reconnect loop restarts it,
and the SOCKS5 listener never binds, so Mixnet Mode stays bootstrapping
forever. Two devices produced the same verdict: API 36.1 on a Play Store
image and API 34 on a `default` image. The failure is therefore a property
of the platform verifier rather than of one vendor image, one Android
release, or the emulator.

Two further facts shaped the ruling. The wallet's own lightwalletd TLS
succeeded throughout, which isolates the fault to the verifier this ADR
replaces. And `nym_http_api_client` flattens the cause to `client error
(Connect)`, so nothing the application receives names the certificate,
which is why the fault presented for weeks as a wallet stuck bootstrapping.

## Decision

The proxy workspace carries its own `[patch.crates-io]` substituting
`rustls-platform-verifier` with zingolib's `webpki-verifier-shim`, which
verifies against the compiled-in Mozilla root bundle. The patch is
necessary here because Cargo honours `[patch]` only from the workspace
being built, and `rust/mixnet-proxy` is a separate workspace from
`zingo-netutils`, so zingolib's stanza never reaches it.

Three parts of ADR 0004 are deleted rather than disabled. The JNI seam
`rust/mixnet-proxy/tls-init` and its export are gone, which removes the
repository's only hand-written `#[no_mangle]`. The Kotlin `NymTlsInit`
object and its call in `NymTransportModule.startMixnetTransport` are gone.
The gradle `cargo metadata` query, the maven repository it derived, and the
`runtimeOnly` dependency on the verifier's Kotlin component are gone,
because that component leaves the dependency graph with the patch applied.

## Consequences

Verification is byte-identical on Android, iOS, and every host, so there is
one behaviour to reason about and to test in plain CI. Enterprise and
user-installed certificate authorities are never honoured, the platform's
revocation machinery is bypassed, and the bundle ages between re-pins.
zingolib ADR 0021 sets the update policy those prices demand, and this
repository inherits it through the patched dependency rather than
maintaining a second policy.

The proxy start was measured again on API 34 after the change. Discovery
returned 828 nodes, the bootstrap raced four exits, and the listener bound
at `127.0.0.1:33121` roughly ten seconds after the toggle.

## Considered options

**Upgrade `rustls-platform-verifier` past 0.7.0.** Rejected. It gambles on
upstream having changed a revocation verdict we did not verify, and it
keeps both the hand-written JNI and the per-vendor divergence.

**Fork the verifier to disable revocation checking.** Rejected. It keeps
every cost of the platform verifier and adds a fork to maintain.

**Wait for Nym to staple an OCSP response.** Rejected. It puts this
application's schedule inside another project's.

**Restate zingolib ADR 0021 in this workspace.** Chosen.
