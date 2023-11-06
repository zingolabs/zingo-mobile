# Zingo Android and iOS apps
App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

# iOS

## Prerequisites
1. Yarn
2. NodeJS (recommended version 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios x86_64-apple-ios`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cbindgen (`cargo install cbindgen`)
7. Cocaopods (`sudo gem install cocoapods`)

## Building
1. In the `./rust/ios` directory, run:
      `./build.sh`.
   This step may take a long time.
2. In the `./ios` directory, run:
      `pod install`
3. From the root of the project, run:
      `yarn install`

For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).

## Launching the app
1. In a terminal, run:
      `yarn start`
2. In a separate terminal, run:
      `yarn run ios`
   You can also open the `./ios` folder in XCode and run it there.

# Android

## Prerequisites
1. Yarn
2. NodeJS (recommended version 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Docker (Docker Engine)
5. OpenJDK 18
6. Android SDK Command-line Tools
      install via Android Studio SDK Manager:
         https://developer.android.com/studio/install
      or as standalone:
         https://developer.android.com/tools
7. Cargo nextest (https://nexte.st/book/installing-from-source.html)

The React Native tools require some environment variables to be set up in order to build apps with
native code. Add the following lines to your $HOME/.bash_profile or $HOME/.bashrc config file:
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/emulator

## Building
1. In the `rust` directory, run:
      `./build.sh`.
   This step may take a long time.
2. From the root of the project, run:
      `yarn install`

## Launching the app

### Android Studio
1. For Android emulations, you can create and start a new AVD, compatible with your CPU architecture 
   i.e. x86_64. The recommended API is API 30 (Android 11). Alternatively, you can connect to a
   physical device (https://reactnative.dev/docs/running-on-device).
2. In `File > Settings`, navigate to `Build, Execution and Deployment > Build Tools > Gradle` and
   check the `Gradle JDK` matches your JDK version.
2. In a terminal, run:
      `yarn start`
3. Open the `android` directory in Android Studio as a project, select 'app' and the previously
   created AVD in the upper toolbar and click the "Run 'app'" button.
   Alternatively, launch an AVD and in a separate terminal, run:
      `yarn run android` 
   
### Android SDK Command-line Tools (Standalone)
You can also emulate android from the command line without using Android Studio.
1. Standalone setup has a quirk as navigated in `scripts/sdkmanager_install.sh`. Then, sdkmanager
   must be added to PATH.
2. Run `scripts/start_interactive.sh -a x86` to automatically set up the android sdk, build the app,
   and stream it to the emulator. It will boot, then take a minute to load from a local port.
   Outputs are generated in `android/app/build/outputs/emulator_output/`

## Android Tests

### Yarn Tests
1. From the root directory, run:
      `yarn test`

### Integration Tests
1. Create quick-boot snapshots to speed up AVD launch times. From the root directory, run:
      `./scripts/integration_tests.sh -a x86_64 -s`
      `./scripts/integration_tests.sh -a x86 -s`
   By default, this uses Google Playstore API 30 system images. Other images may be used for testing
   by specifying the api level and target. However, using other images with the cargo test runner
   is still under development. 
2. To run the integration tests. From the `rust` directory, run:
      `cargo nextest run`
   Specify to run specific ABI:
      `cargo nextest run x86_64`
      `cargo nextest run x86_32`
      `cargo nextest run arm64`
      `cargo nextest run arm32`
   Specify to run a specific test on all ABIs:
      `cargo nextest run test_name`
   Specify to run a specific ABI and test:
      `cargo nextest run x86_64::test_name`

For more information on running integration tests on non-default AVDs, run:
   `./scripts/integration_tests.sh -h`
Without the cargo test runner these emulated android devices will not be able to connect to a
lightwalletd/zcashd regtest network. Therefore, only tests in the "Offline Testsuite" may be tested.

### End-to-End Tests
1. Run `yarn react-native start` to start the dev server
2. Download and create AVD with sdkmanager:
   For testing x86 (32-bit) run `./scripts/flow_emulator_setup.sh -a x86`
   For testing x86_64 (64-bit) run `./scripts/flow_emulator_setup.sh -a x86_64`
   If you already have the emulator created, you can target it without recreating it:
      `./scripts/emulator_target.sh -a x86_64`
3. `yarn detox build -c android.emu.x86`
4. `yarn detox test -c android.emu.x86`
   or to run a specific test: 
   `yarn detox test -c android.emu.x86 test_name`
