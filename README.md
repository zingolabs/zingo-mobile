# Zingo Android and iOS apps

Zingo Mobile is a shielded Zcash light-client wallet for Android and iOS, built with React Native and powered by the [Zingolib](https://github.com/zingolabs/zingolib) Rust SDK.

App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)

Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## Security Vulnerability Disclosure

If you believe you have discovered a security issue, please contact us at:

zingodisclosure@proton.me

## Features

**Wallet**

- Light client: no full chain download, it syncs from a `lightwalletd` server through zingolib
- Follows the chain while it is open, so a payment shows up when it lands
- Background sync of the wallet while the app is closed: once a day on Android, around 3 a.m., on an
  unmetered network while charging; when iOS grants a background processing task
- Create from a new seed, restore from a seed, or import a Unified Full Viewing Key (view-only)
- One wallet at a time, with the last one kept as a backup that can be restored from Settings
- Mainnet, Testnet and Regtest, fixed when the wallet is created; a server on another network is caught
  on opening, with a switch to the right one
- Offline mode: create or restore a wallet with no server, and sync once one is chosen
- Seed backup flow (the words, a check that they are on paper, three words to confirm), with a reminder
  in History until it is done; a restored wallet counts as backed up
- Seed phrase and viewing key screens, behind device authentication
- Performance profiles (Maximum, High, Medium, Low)
- Sync report with a scanning map, the last background sync, and Rescan
- A birthday below Sapling activation is raised to it, and the app says so once
- A wallet file that cannot be opened is classified (missing, encrypted…) and explained; Try Again
  retries without changing any setting

**Transactions**

- Unified, Sapling, Transparent and TEX addresses; a TEX send goes out as two transactions through a
  temporary transparent address
- Shielded by default: new addresses are Orchard (Ironwood) unless another type is chosen
- Encrypted memos, with a byte counter
- Shield the transparent balance from History or Pools
- Any amount can be typed in USD instead of ZEC (mainnet); what is sent is always ZEC
- Scan a QR into the recipient field
- `zcash:` payment links open the app (ZIP-321, first recipient)
- Send progress in steps (build, mixnet, mempool, confirmations), with what to do when one fails
- History with filters (received, sent, shielded, failed, memos, swaps), and Messages for transfers
  carrying memos
- Receive: every address grouped by pool, with tags, pins, ownership check and new addresses by type
- Pools: the balance per pool (Ironwood, Orchard, Sapling, Transparent)
- Financial Insight: activity over time and amounts per recipient

**Servers**

- Automatic, from a list, custom (with a test that shows each step) or offline
- Live list from the community registry ([hosh.zec.rocks](https://hosh.zec.rocks)), ranked by 30-day
  uptime and then ping, with the built-in list as the fallback
- Status dot beside the active server

**Privacy**

- Nym mixnet transport for sending a payment and for the ZEC price, through a native SOCKS5 proxy
  handed to zingolib
- Sending fails closed: a payment goes out over the mixnet or not at all, unless the mixnet has been
  switched off deliberately
- Mixnet Doctor: diagnoses the transport and the server through the tunnel, with a redacted report to copy
- Hide sensitive values from the header
- Screenshots and screen recording blocked on the seed and key screens (Android `FLAG_SECURE`, capture
  detection on iOS); a copied seed or viewing key is cleared from the clipboard after 60 seconds

**Swaps**

- Swap ZEC to and from assets on other chains through SwapKit (NEAR Intents, Maya, THORChain and Flashnet)
- Routes compared against the market rate, with the slippage tolerance chosen
- Swap history, detail and tracking, with links to each chain's explorer and refund tracking
- When a provider offers no route, its own reason is given (a minimum to reach, a pair it does not
  trade…); a provider that refuses to start a swap it has just quoted is set aside, with its reason
- Deposit QR and payment link for paying a purchase from another wallet; a token deposit that needs a
  memo gets no QR, since no payment link can carry it
- Buying ZEC with a token (USDT, USDC…) from another wallet never goes through Maya or THORChain: their
  memo travels only through the router contract, which no wallet's Send calls, and a plain token transfer
  to their vault is neither seen nor refunded. Those routes are listed as unavailable, with the reason;
  paying with a chain's own coin (BTC, ETH…) keeps them
- The address field reads a QR code and checks each chain's format
- A Maya deposit is paid in one shielded transaction, with its memo in a 0 ZEC note to Maya's memo
  address, when Maya takes it; otherwise, and for THORChain, the memo rides in an OP_RETURN after a
  deshield. A deposit whose second transaction did not go out is finished by Try Again
- A Maya purchase lands shielded when its memo can carry a unified address, and a Maya sale's refund
  comes back shielded
- An expired purchase is still watched for a late payment
- The addresses made for swaps have their own group in Receive
- When the swap service is busy (it rate-limits the app's key), quotes pause with a countdown and resume
  by themselves
- Swap records are kept per wallet and cleared with it
- Swap traffic goes over clearnet, not the mixnet; the ZEC deposit itself is a payment and goes through it

**Ironwood migration**

- Meet Ironwood, then a choice: migrate now or not; the migration sends the Orchard funds to Ironwood
  in self-transactions that confirm together

**Address book**

- Contacts per network, searchable
- Contacts on other chains too, with Swap To / Swap From
- Scan a QR into a contact, or save one from Send, Swap or a transaction's detail
- Zcash Names: type `alice.zcash` or `alice.zec` in Send or a contact, and it resolves to the address

**Settings**

- Languages: English, Spanish, Portuguese, Russian and Turkish
- Block explorer for transactions and addresses (ZcashExplorer, ZecBlock, ZExplorer or none)
- Device authentication (biometrics or the device PIN) to open the app and to see the seed
- Support email with redacted diagnostics

## Building The App

Please see the platform-specific [iOS](./docs/ios_developer_quickstart.md) and [Android](./docs/android_developer_quickstart.md) quickstarts.

- Node is pinned in `.nvmrc` (`nvm install` reads it), and the package manager is Yarn 1.
- Swaps need a SwapKit API key. Set `SWAPKIT_API_KEY` before `yarn install`: its `postinstall` writes
  `app/swap/swapKitSecrets.ts`, which is gitignored. Without the variable a placeholder is written, so
  TypeScript and Jest still run, but every swap call fails.
- The first build fetches the Binding Layer (see below), which needs network access to `ghcr.io`.

## The Binding Layer

The Rust wallet and the mixnet proxy, with their Kotlin and Swift bindings,
live in [zingolabs/zingolib](https://github.com/zingolabs/zingolib), which
publishes them as Prebuilt Bundles. This repository pins one published
zingolib commit in `binding-layer.json`, the Bundle Pin (ADR
zingo-mobile/0020). The Android and iOS builds fetch the pinned bundles
through the `fetch:binding-layer` script. A build host needs Node and
network access to `ghcr.io` the first time. `yarn pin <commit>` moves the
pin to another published commit. The tests that read zingolib's source
run in zingolib.

## Releasing

Zingo ships as two parallel apps from this repo:

- **Production** (`org.ZingoLabs.Zingo`): App Store and Play Production.
- **Beta** (`org.ZingoLabs.Zingo.Beta`): TestFlight External and Play Open Testing.

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
triggers a CI workflow that builds the 4 ABI APKs and a universal APK on the
tagged commit, against the Binding Layer AAR that the Bundle Pin names, and
publishes them to a fresh GitHub Release.

Full step-by-step for both stores, signing setup, and the underlying iOS/Android
flavor architecture: see [docs/release_quickstart.md](./docs/release_quickstart.md).

## Architecture decision records

Architecture decision records live in
[zingo-adrs](https://github.com/zingolabs/zingo-adrs), and zingo-mobile's own
records sit under `docs/adr/zingo-mobile/` once the submodule is initialised.
The [zingo-adrs README](https://github.com/zingolabs/zingo-adrs#pointing-a-code-repository-at-zingo-adrs) explains how to read them, advance the
pointer, and propose a record.

[CONTEXT.md](./CONTEXT.md) is the glossary of the terms this repository uses,
and [docs/agents/](./docs/agents/) holds the notes for coding agents (domain,
security practices, wallet file states, issue triage).

## Testing

### JavaScript checks

These run on every pull request:

- `yarn test`: the Jest suite
- `yarn typecheck`: TypeScript
- `yarn lint:check`: ESLint
- `yarn prettier:check`: Prettier over every JS/TS file in the repository, so one unformatted file fails it
- `yarn check:compiler:changed --base=origin/dev`: the React Compiler ratchet; a changed file may not
  add bailouts over its version in the base

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
(`01_new_wallet.yaml` to `09_screen_awake.yaml`). They run nightly in CI via
`.github/workflows/maestro-nightly.yaml` against both Android and iOS;
this is the e2e suite that PR reviewers and releases lean on.

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

## Storybook & visual review

Browse components in isolation with Storybook (on-device via
`yarn storybook:ios`/`storybook:android`, web via `yarn storybook:web`).

The web build powers per-PR visual regression: `yarn visual` captures and
diffs components and animations against a baseline. On a pull request whose
captures changed, a comment of `/visual-accept` by someone with write access
records the new baseline. See [visual/README.md](./visual/README.md) for the
harness, and [.github/CLOUDFLARE.md](./.github/CLOUDFLARE.md) for the
Cloudflare Pages deploy that publishes the review site.

## Troubleshooting

For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).
