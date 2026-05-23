# Zingo Android and iOS apps

App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)

Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

# Security Vulnerability Disclosure

If you believe you have discovered a security issue, please contact us at:

zingodisclosure@proton.me

## Building The App

 Please see the platform specific [iOS](./docs/ios_developer_quickstart.md) and [Android](./docs/android_developer_quickstart.md) "quickstart" documentation.

## Testing
### Prerequisites
Integration tests and end-to-end tests require a regtest server. On linux hosts, these may be run
locally by installing the lightwalletd, zcashd and zcash-cli binaries
(https://github.com/zingolabs/zingolib#regtest). From the `rust/android/regtest/bin/` directory run: <br />
`ln -s path/to/lightwalletd/binary path/to/zcashd/binary path/to/zcash-cli/binary ./` <br />
From the `rust/android/lightwalletd_bin` directory run: <br />
`ln -s path/to/lightwalletd/binary ./`

Alternatively, integration tests and end-to-end tests can be run on non-linux hosts with Regchest
(https://github.com/zingolabs/zingo-regchest). Regchest manages the zcash/lightwalletd regtest
network in a docker container. Before running tests, pull the latest Regchest image from docker: <br />
`docker pull zingodevops/regchest:013`

### Yarn Tests
1. From the root directory, run: <br />
   `yarn test`

### Integration Tests
These exercise the Rust ↔ Kotlin/Swift FFI boundary against a regtest network.

The Android suite (`rust/android/tests/integration_tests.rs`) runs on every PR
via the `android-ubuntu-integration-test-ci` workflow. The iOS suite
(`rust/ios/tests/integration_tests.rs`) exists but its `cargo nextest run`
invocation is currently commented out in `ios-integration-test.yaml`, so it
does **not** gate PRs — you can still run it locally with the same nextest
commands.

1. Create quick-boot snapshots to speed up AVD launch times. From the root directory, run: <br />
   `./scripts/android_integration_tests.sh -a x86_64 -s` <br />
   `./scripts/android_integration_tests.sh -a x86 -s` <br />
   By default, this uses default API 29 system images. Other images may be used for testing
   by specifying the api level and target. However, using other images with the cargo test runner
   is still under development.
2. To run the integration tests. From the `rust` directory, run: <br />
   `cargo nextest run android_integration` <br />
   Specify to run specific ABI: <br />
   `cargo nextest run android_integration::x86_64` <br />
   `cargo nextest run android_integration::x86_32` <br />
   `cargo nextest run android_integration::arm64` <br />
   `cargo nextest run android_integration::arm32` <br />
   Specify to run a specific test on all ABIs: <br />
   `cargo nextest run test_name` <br />
   Specify to run a specific ABI and test: <br />
   `cargo nextest run android_integration::x86_64::test_name`

To run tests with Regchest, add the `--features regchest` flag, for example: <br />
`cargo nextest run android_integration --features regchest`

For more information on running integration tests on non-default AVDs, run: <br />
`./scripts/android_integration_tests.sh -h` <br />
Without the cargo test runner these emulated android devices will not be able to connect to a
lightwalletd/zcashd regtest network. Therefore, only tests in the "Offline Testsuite" may be tested.

### End-to-End Tests (Rust nextest, Android)
Drives the Android app from Rust against a regtest network. Lives in
`rust/android/tests/e2e_tests.rs`. Currently Android-only.

0. Note there needs to be a lightwalletd in rust/android/lightwalletd_bin
1. Launch the emulated AVD by clicking the 'play' icon in Android Studio's `Device Manager`.
   Alternatively, connect to a physical device. See previous section 'Launching the app' for more
   details.
2. In a terminal, run: <br />
   `yarn start`
3. Create quick-boot snapshots to speed up AVD launch times. From the root directory, run: <br />
   `./scripts/e2e_tests.sh -a x86_64 -s` <br />
   `./scripts/e2e_tests.sh -a x86 -s` <br />
   By default, this uses default API 29 system images. Other images may be used for testing
   by specifying the api level and target. However, using other images with the cargo test runner
   is still under development.
4. In a separate terminal, from the `rust` directory, run all tests: <br />
   `cargo nextest run e2e`
   Specify to run specific ABI: <br />
   `cargo nextest run e2e::x86_64` <br />
   `cargo nextest run e2e::x86_32` <br />
   `cargo nextest run e2e::arm64` <br />
   `cargo nextest run e2e::arm32` <br />
   Specify to run a specific ABI and test: <br />
   `cargo nextest run e2e::x86_64::test_name`

### End-to-End Tests (Maestro UI flows)
[Maestro](https://maestro.mobile.dev/) drives the released app from the
outside, asserting on the rendered UI. Flows live in `.maestro/` as YAML
(`01_basic_new_wallet.yaml`, etc.). Runs nightly in CI via
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
   `maestro test .maestro/`
   Or run a single flow: <br />
   `maestro test .maestro/01_basic_new_wallet.yaml`

The legacy Detox suite under `e2e/*.test.js` is no longer wired to CI or
to any `yarn` script. It is being phased out in favour of Maestro and
should not be relied on; new e2e coverage should land as Maestro flows.

# Troubleshooting
For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).
