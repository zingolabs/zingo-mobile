# 4. The mixnet shim's TLS verifies against Android's platform verifier

Date: 2026-08-10

## Status

Accepted. Ratified by the maintainer during the PR #1276 review. The
counterpart decision for the desktop workspace is zingolib ADR 0021,
whose 2026-08-10 amendment delegates the shim's verifier to this
repository.

## Context

zingolib ADR 0021 chose a compiled-in Mozilla root bundle for the
mixnet stack's TLS because the shim then lived in the zingolib
workspace, which could provide neither the JVM-side initialization
`rustls-platform-verifier` requires on Android nor any hand-written JNI
(its `#![forbid(unsafe_code)]` invariant). Without that initialization
the verifier cannot reach Android's certificate store, and every mixnet
enable died at the first TLS handshake (zingolib#2531).

PR #1276 moved the shim into this repository, whose git dependency on
`zingo-netutils` does not carry zingolib's `[patch.crates-io]`
substitution — a patch never crosses a workspace root. Left alone, the
shim would resolve the real `rustls-platform-verifier` uninitialized
and reproduce zingolib#2531. Unlike a library workspace, this app owns
an application `Context`, a Kotlin source set, and its gradle build, so
it can initialize the real verifier properly.

## Decision

The shim's TLS uses `rustls-platform-verifier` unpatched, verifying
against Android's own certificate verifier. Three parts wire it:

- `rust/nym-proxy-ffi/tls-init`, the one hand-written JNI seam, exports
  `Java_org_ZingoLabs_Zingo_NymTlsInit_initPlatformVerifier`, which
  hands the JVM and the application `Context` to the verifier. It lives
  outside the shim crate because `#[no_mangle]` is rejected by the
  shim's `forbid(unsafe_code)`; the shim links it on Android targets so
  the symbol ships inside `libzingo_nym_proxy_ffi.so`.
- `NymTlsInit` (Kotlin) loads the shim library and calls that export.
  `NymTransportModule.startMixnetTransport` invokes it before every
  proxy start; re-initialization is a no-op.
- The app's gradle build consumes the verifier's Kotlin component from
  the cargo checkout (it is not on Maven), so the Kotlin and Rust
  halves always share the one version the shim's lockfile pins.

## Consequences

Certificate verification on Android honors the platform trust store:
enterprise and user-installed CAs work, and the platform's revocation
machinery applies. The prices are the ones zingolib ADR 0021 avoided
and this repository accepts as ordinary properties of a mobile app:
verification behavior differs per platform vendor, and a device with a
hostile user-installed CA trusts it. iOS needs no counterpart, because
the verifier reaches Apple's Security framework without
initialization. The invariant to preserve is order — no shim TLS
before `NymTlsInit.initPlatformVerifier` — and the module enforces it
at the only start seam.
