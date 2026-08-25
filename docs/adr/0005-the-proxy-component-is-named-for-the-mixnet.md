# 5. The proxy component is named for the mixnet

Date: 2026-08-19

## Status

Accepted, ruled by the maintainer on 2026-08-19. The rename itself is
deferred to a follow-on pull request, because its scope reaches every
build system in the repository and does not belong inside PR #1276.

## Context

The crate is `zingo-nym-proxy-ffi`, and because it uses
`uniffi::setup_scaffolding!` rather than a UDL, that crate name becomes the
component namespace: Kotlin imports `uniffi.zingo_nym_proxy_ffi`, and the
generated scaffolding exports C-ABI symbols named
`ffi_zingo_nym_proxy_ffi_*`.

Three separate things are wrong with that name, and each is visible from
inside the crate itself.

The vendor name is the odd one out. Every type the crate exports is already
neutral about which mixnet it carries: `MixnetProxyHandle`,
`Socks5Endpoint`, `ProxyFfiError`, `ProxyDeathReason`, `ProxyDeathObserver`.
"Nym" survives only in the crate name and in an internal comment about
`NymProxy`. The wallet uses the same neutral vocabulary throughout — Mixnet
Mode, `MixnetProxy`, `MixnetSlot`, `MixnetTiming` — so the component name
is the single place the implementation choice leaks into the interface.

The `_ffi` suffix names the mechanism rather than the thing, and it states
that mechanism a third time. Every consumer already reaches the component
as `uniffi.<name>`, and the crate exists for no purpose other than being
bound. The wallet component settles the house convention by counterexample:
it is every bit as much an FFI component, with a UDL and generated Kotlin,
and it is named `zingo`, not `zingo_ffi`.

The word "shim" describes the crate's posture toward its own dependencies
rather than what a caller receives. A consumer across the boundary holds a
handle to a running mixnet proxy and calls `start`, `socks5Endpoint`,
`exitNode`, and `stop`. That it happens to wrap `NymProxy` from
`zingo-netutils` is invisible to them and irrelevant to the name.

## Decision

The crate is `mixnet-proxy`. The component namespace is `mixnet_proxy`,
so Kotlin imports `uniffi.mixnet_proxy` and the scaffolding exports
`ffi_mixnet_proxy_*`. The word "shim" is retired from the vocabulary of
this repository, in prose, in file names, and in identifiers; where a name
is needed, the thing is the mixnet proxy.

The wallet component keeps the name `zingo` for now.

## Considered options

**Keep `zingo-nym-proxy-ffi`.** Rejected. It names a vendor the interface
does not expose, and a mechanism the import path already states.

**`zingo-mixnet-proxy`.** Rejected, though it carries a real argument. Both
components are bound into one application process, so their C-ABI symbols
share a global namespace with every other native library the application
links, and a `zingo_` prefix both reduces the chance of a collision with a
third-party UniFFI component and makes a symbol legible as ours in a crash
dump or a linker error. It also pairs visibly with `uniffi.zingo`. The
maintainer ruled against the prefix: within this repository the component
is unambiguous, and the shorter name says what the thing is without
restating where it lives.

**`mixnet-proxy`.** Chosen.

## Consequences

The symbol prefix becomes generic. `ffi_mixnet_proxy_*` is a plausible name
for another party's component, so a future collision is possible where
`ffi_zingo_mixnet_proxy_*` would have been safe, and a symbol in a crash
dump no longer identifies itself as ours. This decision accepts that cost.

The name will overstate the crate's reach until its couplings are cut. It
depends on `zingo-netutils` for `NymProxy` and bootstraps TLS through
`org.ZingoLabs.Zingo.NymTlsInit`, so a consumer outside Zingo cannot use it
today. A name that invites reuse should either acquire that reuse or lose
those couplings; whichever happens, it should happen deliberately.

The rename is large and touches systems that cannot all be verified from
one place. Roughly 316 identifier sites across about 35 files carry the old
names, spanning Cargo manifests, `uniffi-bindgen`, two workbench binaries,
`android/app/build.gradle.kts`, `android/app/lint.xml`,
`ios/Zingo.xcodeproj/project.pbxproj`, `ios/NymTransportModule.swift`,
three `build_*.mjs` scripts, `rust/android/docker/Dockerfile`, the contract
tests, and ADR 0004. Seven paths change too, including the crate directory,
the checked-in generated bindings under `android/app/src/*/java/uniffi/`,
the workflow file `nym-proxy-ffi-check.yaml`, both `*-android-shim.rs`
workbench binaries, and this repository's ADR 0004, whose file name
contains the retired word. Cargo verifies only the Rust portion; Gradle,
Xcode, and CI each need their own build, which is the reason this is a
pull request of its own rather than a change carried inside another.

ADR 0004 is renamed and its prose updated by the same change. Its decision
is untouched: the platform verifier must hold the application Context
before the proxy opens any connection.

## Open

Whether the wallet component becomes `zingo_wallet`. Beside
`uniffi.mixnet_proxy`, the bare `uniffi.zingo` claims the product name for
one component among several, and two peers would read better as
`uniffi.zingo_wallet` and `uniffi.mixnet_proxy`. That rename moves the
crate name `zingo`, hence the built library, the UDL namespace, the
checked-in bindings, every Kotlin and Swift import, and the loader
configuration, so it is a larger change than this one and wants its own
decision.

Whether the React Native module classes `NymTransportModule` and
`NymTlsInit` are renamed with the component. They name the application's
bridge module rather than the component, so they are application
vocabulary and are left to a separate ruling.
