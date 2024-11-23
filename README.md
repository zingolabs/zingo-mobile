# Zingo Android and iOS apps
App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

# Security Vulnerability Disclosure

If you believe you have discovered a security issue, please contact us at:

zingodisclosure@proton.me

# iOS
## Prerequisites
1. Yarn
2. NodeJS (recommended version 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cocaopods (`sudo gem install cocoapods`)

## Building for physical device
1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. In the `rust/ios` directory, run: <br />
   `./build.sh` <br />
   This step may take a long time.
4. From the root of the project, run: <br />
   `yarn`
5. In the `ios` directory, run: <br />
   `pod install`

## Building for simulator
1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. In the `rust/ios` directory, run: <br />
   `./buildsimulator.sh` <br />
   This step may take a long time.
4. From the root of the project, run: <br />
   `yarn`
5. In the `ios` directory, run: <br />
   `pod install`

## Launching the app
1. In a terminal, run: <br />
   `yarn start`
2. In a separate terminal, run: <br />
   `yarn ios` <br />
   You can also open the `ios` directory in XCode and run it there.

# Android
## Prerequisites
1. Yarn
2. NodeJS (recommended version 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Docker (Docker Engine)
5. OpenJDK 18 (https://jdk.java.net/archive/)

    1. curl https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz -o openjdk-18.0.2_linux-x64_bin.tar.gz
    2. tar -xzvf openjdk-18.0.2_linux-x64_bin.tar.gz

6. Android SDK Command-line Tools <br />
   Install via Android Studio SDK Manager: <br />
   https://developer.android.com/studio/install <br />
   or as standalone: <br />
   https://developer.android.com/tools  
7. Cargo nextest (https://nexte.st/book/installing-from-source.html)

The React Native tools require some environment variables to be set up in order to build apps with
native code. <br />
Add the following lines to your `$HOME/.bash_profile` or `$HOME/.profile` config file: <br />
`PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"` <br />
`PATH="$PATH:$ANDROID_HOME/platform-tools"` <br />
`PATH="$PATH:$ANDROID_HOME/emulator"` <br />
Add the following lines to your `$HOME/.bashrc` config file: <br />
`export ANDROID_SDK_ROOT="$HOME/Android/Sdk"` <br />
Also, make sure your JAVA_HOME is set, for example: <br />
`export JAVA_HOME="/usr/lib/jvm/jdk-18.0.2"`

## Building
1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. In the `rust` directory, run: <br />
   `./build.sh` <br />
   This step may take a long time.
4. From the root of the project, run: <br />
   `yarn`

## Launching the app
### Android Studio
1. For Android emulations, you can create a new AVD, compatible with your CPU architecture 
   i.e. x86_64 (https://developer.android.com/studio/run/managing-avds). The recommended API is API 
   30 (Android 11). Alternatively, you can connect to a physical device
   (https://reactnative.dev/docs/running-on-device).
2. In `File > Settings`, navigate to `Build, Execution and Deployment > Build Tools > Gradle` and
   check the `Gradle JDK` matches your JDK version.
2. In a terminal, run: <br />
   `yarn start`
3. Open the `android` directory in Android Studio as a project, select 'app' and the previously
   created AVD in the upper toolbar and click the "Run 'app'" button.
   Alternatively, launch an AVD and in a separate terminal, run: <br />
   `yarn android` 
   
### Android SDK Command-line Tools (Standalone)
You can also emulate android from the command line without using Android Studio.
1. Check that the Android SDK cmdline-tools binaries are in the following directory path: <br />
   `$ANDROID_HOME/cmdline-tools/latest/bin`
2. From the root directory run: <br />
   `scripts/start_interactive.sh -a x86` <br />
   Outputs are generated in `android/app/build/outputs/emulator_output`

## Testing
### Prerequesites
Integration tests and end-to-end tests require a regtest server. On linux hosts, these may be run
locally by installing the lightwalletd, zcashd and zcash-cli binaries
(https://github.com/zingolabs/zingolib#regtest). From the `rust/android/regtest/bin/` directory run: <br />
`ln -s path/to/lightwalletd/binary path/to/zcashd/binary path/to/zcash-cli/binary ./` <br />
From the `rust/android/lightwalletd_bin` directory run: <br />
`ln -s path/to/lightwalletd/binary ./`

Alternatively, integration tests and end-to-end tests can be run on non-linux hosts with Regchest
(https://github.com/zingolabs/zingo-regchest). Regchest manages the zcash/lightwalletd regtest 
network in a docker container. Before running tests, pull the latest Regchest image from docker: <br />
`docker pull zingodevops/regchest:009`

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
