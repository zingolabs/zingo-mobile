# Plan: Nym connectivity diagnostics and the collaboration protocol

Status: ready for coordinated implementation across two repositories.
Written 2026-07-27. Motivating evidence: issue #1221 (a stock Zingo user
under NymVPN cannot sync, with only a generic error to report), the
silent-alpha field sessions on PR #1207, and the port-443 finding
recorded in zingolib's `zingo-net-diag` design
(`docs/agents/net-diag-design.md` on `nym_mobile_adoption`, PR #2527).

Two workstreams share one dependency: zingolib's failure taxonomy. This
plan sequences them and defines how agents in each repository update the
pin without colliding.

## The situation this serves

Issue #1221: under NymVPN, stock Zingo fails to load wallet data against
every server, with rare success. The user can offer only screenshots of
a generic message. Two facts already in our records make this legible:

1. Nym exit infrastructure carries TCP 443 cleanly and mishandles
   lightwalletd's non-standard 9067. The 2026-07-21 probe in zingolib's
   broadcast-indexer module doc found every 9067 target failing TLS
   through Nym exits while the same hosts worked over clearnet.
2. The stock server list mixes 443 servers (`zec.rocks` family) and
   9067 servers (`lwd1.zcash-infra.com` and kin). Under NymVPN the
   9067 entries would fail persistently, and 443 entries would be
   subject to ordinary Nym weather. That matches "switching servers
   doesn't make a difference, rare success" better than any bug in the
   wallet.

The user cannot confirm or refute this because the app tells them
nothing. That is the gap to close: not a fix first, a diagnosis first,
in the user's own hands.

## Workstream A: the Connection Doctor debug APK

A diagnostics capability a non-developer can run and share, offered to
the #1221 reporter and kept for every future connectivity report.

1. **Probe engine (zingolib side, rides the net-diag work).** A staged
   connectivity probe per configured server: TCP connect, TLS
   handshake, gRPC `GetLightdInfo`, each stage timed, each failure a
   `NetOpFailure` (the same taxonomy, applied to the *sync* path — the
   current design doc covers only the mixnet-covered operations, so
   this extends its integration list). Pure classification, effectful
   probe shell, mirroring the doc's structure.
2. **FFI surface (mobile rust).** One new function, e.g.
   `probe_servers()`, returning a JSON array of per-server, per-stage
   results with timings. No wallet lock held across the probes (the
   polling-blackout rules apply).
3. **App surface (TS).** A Connection Doctor screen reachable from
   Settings in debug-signed builds: runs the probe, renders each
   server's stage results, and offers a copy-to-clipboard report
   (markdown, ready to paste into a GitHub issue). Stock release
   flavors may hide the screen; the debug APK we hand the user has it.
4. **Delivery.** A debug-signed APK built from the PR #1207 branch (or
   dev once landed) offered on the issue with two asks: run the Doctor
   with NymVPN off, then on, and paste both reports. The port-443
   hypothesis is then confirmed or dead in one round trip.

The existing always-on alpha diagnostics (the silent-flavor dev log,
attested price fetches, watchdog timings) stay as they are. The Doctor
is orthogonal: it is for connectivity triage on any flavor.

## Workstream B: consuming the net-diag taxonomy

Already specced upstream. When it lands, the mobile side: bumps the
pin, verifies the chain-text rendering in the FFI messages, extends the
Doctor's report with the richer stages, and later takes the
fielded-error PR that retires substring classification. Nothing in
Workstream A blocks on B beyond the probe engine itself.

## The pin collaboration protocol

Multiple agents update `rust/Cargo.toml`'s zingolib pin: sessions in
this repository, sessions in zingolib, and humans merging dev. The
protocol keeps them from colliding:

1. **The manifest comment is law.** `rust/Cargo.toml` states the pin
   branch (`nym_mobile_adoption`) and that it wins every merge
   conflict. Any agent resolving a conflict keeps that branch and
   re-runs `cargo update` to its head. Never adopt another branch's
   pin without changing the comment in the same commit.
2. **One bump, one commit.** A pin bump is its own commit whose body
   names the upstream revision range and what it carries. If the bump
   requires adaptation (API drift), the adaptation is a separate
   commit landing with it, so a revert of either is clean.
3. **Verification floor per bump.** `cargo check --workspace`, `cargo
   fmt --check`, `npx tsc --noEmit`, the jest suite, and — when
   `rust/lib/src` changed — the release-Kotlin compile
   (`:app:compileAlwaysonReleaseKotlin` covers the flavors). Native
   `.so` rebuilds are required only when shipped rust changed;
   test-only upstream commits need no rebuild and the commit body says
   so. The staged proxy shim is part of the floor: when the bump
   touches `zingo-netutils`, rebuild the bundle in zingolib and
   restage (`consume-android-shim`, which stamps
   `jniLibs/shim-provenance.txt` with the source revision); otherwise
   run `attest-android-shim`, which proves `zingo-netutils` unchanged
   between the staged revision and the new pin before recording the
   attestation. The gradle gate `verifyShimProvenance` fails any APK
   assembly whose staged shim satisfies neither, so a stale shim
   binary cannot ride a pin bump again (it did once: the `.so` built
   hours before zingolib ADR 0021's TLS fix rode three bumps
   undetected and fail-closed every mixnet enable).
4. **Upstream milestones are announced in the design doc.** The
   zingolib agent marks landed milestones (taxonomy crate, price
   timeout, lock release, sync-path probes, clearnet test gate) in
   `docs/agents/net-diag-design.md` status lines. Mobile agents treat
   that file, not commit archaeology, as the signal for what a pin
   bump delivers.
5. **Breaking-surface warning.** An upstream commit that changes an
   FFI-consumed signature or payload field says so in its commit body
   with the string `mobile-adaptation-required`, and the mobile bump
   commit references it. The immediate-migration rename cost a
   13-error surprise; the string makes the next one a search hit
   instead.
6. **The endgame note stands.** Before PR #1207 merges to dev, the pin
   reverts to mainline (`feat/ironwood` or dev per the manifest
   comment), and this protocol retires with it.

## Sequencing

1. This plan lands in both repositories' agent docs (this file, and a
   sync-path addendum to zingolib's net-diag design).
2. zingolib agent: probe engine + sync-path stages, alongside the
   already-specced net-diag work.
3. Mobile agent: FFI `probe_servers` + Connection Doctor screen +
   report export, behind the debug-build gate.
4. Debug APK built and offered on issue #1221 with the two-run ask.
5. Findings feed back: if the port-443 hypothesis confirms, the fix
   discussion (server-list annotation, 443-only default under detected
   VPNs, or an in-app warning) gets real data.
