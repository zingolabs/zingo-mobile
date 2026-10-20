# Zingo Android and iOS apps

Zingo Mobile is a shielded Zcash light-client wallet for Android and iOS, built with React Native and powered by the [Zingolib](https://github.com/zingolabs/zingolib) Rust SDK.

App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)

Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

# Security Vulnerability Disclosure

If you believe you have discovered a security issue, please contact us at:

zingodisclosure@proton.me

## Building The App

 Please see the platform specific [iOS](./docs/ios_developer_quickstart.md) and [Android](./docs/android_developer_quickstart.md) "quickstart" documentation.

## Releasing

Zingo ships as two parallel apps from this repo:

- **Production** (`org.ZingoLabs.Zingo`) — App Store + Play Production.
- **Beta** (`org.ZingoLabs.Zingo.Beta`) — TestFlight External + Play Open Testing.

Both share the same JS bundle and Rust libs; only the native shell differs
(bundle ID, display name, icon with `BETA` band). Version/build bumps are
scoped per channel via:

```bash
yarn release:prod:prep <version> <build>
yarn release:beta:prep <version> <build>
```

Create the tag **before** building the app: the About screen shows the
zingo-mobile descriptor that the app build computes, so an app built before the
tag ships naming its commit instead of the tag.
See [Release order](./docs/release_quickstart.md#release-order-tag-first-then-build).

Pushing a `zingo-<version>-<build>` or `zingo-beta-<version>-<build>` tag
triggers a CI workflow that builds the 4 ABI APKs + a universal APK from
source on the tagged commit and publishes them to a fresh GitHub Release.

Full step-by-step for both stores, signing setup, and the underlying iOS/Android
flavor architecture: see [docs/release_quickstart.md](./docs/release_quickstart.md).

## Architecture decision records

Architecture decision records live in
[zingo-adrs](https://github.com/zingolabs/zingo-adrs), and zingo-mobile's own
records sit under `docs/adr/zingo-mobile/` once the submodule is initialised.
The [zingo-adrs README](https://github.com/zingolabs/zingo-adrs#pointing-a-code-repository-at-zingo-adrs) explains how to read them, advance the
pointer, and propose a record.

## The Binding Layer

The Rust wallet and the mixnet proxy, with their Kotlin and Swift bindings,
live in [zingolabs/zingolib](https://github.com/zingolabs/zingolib). This
repository pins them as a submodule at `zingolib/` (ADR zingo-mobile/0016).
The Android and iOS builds read that checkout. Initialise it before any build.

```sh
git submodule update --init zingolib
```

## Testing
### Yarn Tests
1. From the root directory, run: <br />
   `yarn test`

### Memory Benchmark
Peak heap per wallet-file path, on a connected Android device or emulator.

- `yarn bench:memory`: measure and compare against `scripts/wallet_memory_baseline.json`, non-zero exit on a regression
- `yarn bench:memory --report`: measure only
- `yarn bench:memory:accept`: record a new baseline

### Device Tests
The device tests exercise the Binding Layer through Kotlin and Swift on an
emulator or a simulator. An annotation on each Android test class names its
kind (`CONTEXT.md` defines the terms).

- An offline device test (`@OfflineDeviceTest`) opens a wallet with an empty
  server URI and reads no chain.
- A public-chain test (`@PublicChainTest`) reads mainnet or testnet through a
  public server. A test that needs funds reads a testnet fixture wallet
  (`docs/testnet_fixture_wallets.md`).

The `android-ubuntu-integration-test-ci` workflow runs both kinds on every
pull request, and `ios-integration-test` runs the XCTest classes of
`ios/ZingoTests`.

To run the Android tests, boot an emulator and run these commands from the
`android` directory. Replace `x86_64` with the ABI of the emulator.

```sh
./gradlew :app:connectedProdDebugAndroidTest \
  -PreactNativeArchitectures=x86_64 \
  -Pandroid.testInstrumentationRunnerArguments.annotation=org.ZingoLabs.Zingo.OfflineDeviceTest

./gradlew :app:connectedProdDebugAndroidTest \
  -PreactNativeArchitectures=x86_64 \
  -Pandroid.testInstrumentationRunnerArguments.annotation=org.ZingoLabs.Zingo.PublicChainTest \
  -Pandroid.testInstrumentationRunnerArguments.timeout_msec=420000
```

To run the iOS tests, open `ios/Zingo.xcworkspace` in Xcode and run the
`ZingoTests` target on a simulator.

### End-to-End Tests (Maestro UI flows)
[Maestro](https://maestro.mobile.dev/) drives the released app from the
outside, asserting on the rendered UI. Flows live in `.maestro/` as YAML
(`01_new_wallet.yaml`, etc.). Runs nightly in CI via
`.github/workflows/maestro-nightly.yaml` against both Android and iOS;
this is the e2e suite that PR reviewers and releases lean on going
forward.

To run locally:

1. Install the Maestro CLI: <br />
   `curl -Ls "https://get.maestro.mobile.dev" | bash` (puts the binary in `~/.maestro/bin`)

2. Boot an emulator/simulator and install the app you want to test against
   (debug or release). Maestro talks to whatever device is currently
   selected by `adb` / `xcrun simctl`.

3. From the repo root: <br />
   `maestro test --exclude-tags=screen-awake .maestro/`
   Or run a single flow: <br />
   `maestro test .maestro/01_new_wallet.yaml`

The flows restore or create their wallets on mainnet, and need network
access. The `screen-awake` flow runs alone in CI, after a step that
shortens the device's screen-off timeout. New e2e coverage lands as
Maestro flows.

# Storybook & visual review
Browse components in isolation with Storybook (on-device via
`yarn storybook:ios`/`storybook:android`, web via `yarn storybook:web`).

The web build powers per-PR visual regression: `yarn visual` captures and
diffs components and animations against a baseline. See
[visual/README.md](./visual/README.md) for the harness, and
[.github/CLOUDFLARE.md](./.github/CLOUDFLARE.md) for the Cloudflare Pages deploy
that publishes the review site.

# Troubleshooting
For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).
