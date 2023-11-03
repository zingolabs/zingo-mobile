# Zingo Android and iOS apps

App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## iOS build instructions

### Prerequisites
1. Yarn
2. NodeJS (recommended version v16.20.2 LTS)
3. Rust (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios x86_64-apple-ios`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cbindgen (`cargo install cbindgen`)
7. Cocaopods (`sudo gem install cocoapods`)

### Building
1. In the `./rust/ios` directory, run `./build.sh`.
   This step will take a long time.
2. In the `./ios` directory, run `pod install`
3. From the root `./` of the project, run `yarn install`
4. Run `yarn react-native start` to start the dev server
5. Run `yarn run ios` to install the app on an emulator/connected device.
   You can also open the `./ios` folder in XCode and run it there.

For notes on known issues and problems, see the [trouble-shooting notes](./TROUBLESHOOTING.md).

## Android build instructions

### Prerequisites
1. Yarn
2. NodeJS (recommended version v16.20.2 LTS)
3. Rust (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
4. Docker (Docker Engine)
5. OpenJDK 18
6. Android SDK Command-line Tools (included with Android Studio or available standalone)

Carefully follow the instructions to setup the react-native CLI development envrionment:
https://reactnative.dev/docs/environment-setup?guide=native
It is not necessary to install watchman or the Android 12 system images.


### Building
1. AS A NONROOT USER: In the `rust/` directory, run `./build.sh`.
   This step will take a long time.
2. From the root of the project, run `yarn install`

## Launching the app

### Android Studio
1. For Android emulations, you can create and start a new Android 11 API 30 AVD, compatible with 
   your CPU architecture i.e. x86_64. Alternatively, you can connect to a physical device. 
2. In a terminal, run `yarn react-native start` to start the dev server
3. In a separate terminal, run `yarn run android` to compile and install the app. Alternatively, 
   you can open the `android` directory in Android Studio as a project, select 'app' and the 
   previously created AVD in the upper toolbar and click the "Run 'app'" button.

### Android SDK Command-line Tools (Standalone)
Alternatively, you can emulate android from the command line without using Android Studio.
1. Standalone setup has a quirk as navigated in `scripts/sdkmanager_install.sh`. Then, sdkmanager
   must be added to PATH.
2. Run `scripts/start_interactive.sh -a x86` to automatically set up the android sdk, build the app,
   and stream it to the emulator. It will boot, then take a minute to load from a local port.
   Outputs are generated in `android/app/build/outputs/emulator_output/`

## Android Tests

### Integration Tests

TODO: Update to cargo test runner
1. To create a quick-boot snapshot. From the root directory, run:
   `./scripts/integration_tests.sh -a x86_64 -s`
2. To run the integration tests. From the root directory, run:
   `./scripts/integration_tests.sh -a x86_64`
3. To test other ABIs, such as x86. Specify the target ABI with the `-a` flag:
   `-a x86`
   
For more information. From the root directory, run:
`./scripts/integration_tests.sh -h`

### e2e Tests with Detox
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
