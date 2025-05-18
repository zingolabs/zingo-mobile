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
`docker pull zingodevops/regchest:010`

### Yarn Tests
1. From the root directory, run: <br />
   `yarn test`

### Integration Tests
1. Create quick-boot snapshots to speed up AVD launch times. From the root directory, run: <br />
   `./scripts/integration_tests.sh -a x86_64 -s` <br />
   `./scripts/integration_tests.sh -a x86 -s` <br />
   By default, this uses default API 29 system images. Other images may be used for testing
   by specifying the api level and target. However, using other images with the cargo test runner
   is still under development.
2. To run the integration tests. From the `rust` directory, run: <br />
   `cargo nextest run integration` <br />
   Specify to run specific ABI: <br />
   `cargo nextest run integration::x86_64` <br />
   `cargo nextest run integration::x86_32` <br />
   `cargo nextest run integration::arm64` <br />
   `cargo nextest run integration::arm32` <br />
   Specify to run a specific test on all ABIs: <br />
   `cargo nextest run test_name` <br />
   Specify to run a specific ABI and test: <br />
   `cargo nextest run integration::x86_64::test_name`

To run tests with Regchest, add the `--features regchest` flag, for example: <br />
`cargo nextest run integration --features regchest`

For more information on running integration tests on non-default AVDs, run: <br />
`./scripts/integration_tests.sh -h` <br />
Without the cargo test runner these emulated android devices will not be able to connect to a
lightwalletd/zcashd regtest network. Therefore, only tests in the "Offline Testsuite" may be tested.

### End-to-End Tests
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

Regchest is still under development and currently not able to run darkside end-to-end tests: <br />
`cargo nextest run e2e --features regchest -E 'not test(darkside)'`

# Troubleshooting
For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).
