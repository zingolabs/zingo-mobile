# Zingo Android and iOS apps

App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## iOS build instructions

### Prerequisites
1. `yarn`
2. `nodejs` recommended version v16.16.0 LTS.
3. Install Rust
4. Add the ios targets `rustup target add aarch64-apple-ios x86_64-apple-ios`
5. `cargo install cargo-lipo`
6. `cargo install cbindgen`
7. `sudo gem install cocoapods` to install cocoapods

### Building
1. In the `./rust/ios` directory, run `./build.sh`.
   This step will take a long time.
2. In the `./ios` directory, run `pod install`
3. From the root `./` of the project, run `yarn install`
4. Run `yarn react-native start` to start the dev server
5. Run `yarn run ios` to install the app on an emulator/connected device.
   You can also open the `./ios` folder in XCode and run it there.

For notes on known issues and problems,
see the [trouble-shooting notes](./TROUBLESHOOTING.md).


## Android build instructions

### Prerequisites
1. `docker` (for building the rust library)
2. `yarn`
3. `nodejs` recommended version v16.16.0 LTS.
4. Android Studio or commandline tools

Carefully follow the instructions to [setup Android Studio for your
operating system](https://reactnative.dev/docs/environment-setup).
It is not neccessary to install watchman or the Android 12 system images.

If you do not have a physical device, you can create and start
a new Android 11, API 30 emulator device compatible
with the chip on your system and start the emulated device.

### Bash shortcut
It is possible emulate android with the command line.
1. install sdkmanager (or included with androidstudio). standalone setup has a quirk as navigated in `scripts/sdkmanager_install.sh`. then sdkmanager must be added to PATH.
2. run `scripts/start_interactive.sh -a x86` to automatically set up the android sdk, build the app, and stream it to the emulator. it will boot, then take a minute to load from a local port. outputs are generated in `android/app/build/outputs/emulator_output/`

### Building
0. Start docker daemon
1. AS A NONROOT USER: In the `rust/` directory, run `./build.sh`.
   This step will take a long time.
2. From the root of the project, run `yarn install`
3. Run `yarn react-native start` to start the dev server
4. Run `yarn run android` to compile and install the app on an
   emulator or connected device. You can also open the `android` directory
   in Android Studio as a project, select 'app' and the API 30 system image
   in the upper toolbar and click the "Run 'app'" button.

## Android Tests

### Prerequisites
4. `sdkmanager` (android commandline tools or android studio)

### Integration Tests
1. To create a quick-boot snapshot. From the root directory, run:
   `./scripts/integration_tests.sh -a x86_64 -s`
2. To run the integration tests. From the root directory, run:
   `./scripts/integration_tests.sh -a x86_64`
3. To test other ABIs, such as x86. Specify the target ABI with the `-a` flag:
   `-a x86`
   
For more information. From the root directory, run:
`./scripts/integration_tests.sh -h`

The first run may take a long time to download the `x86` and `x86_64` system images.

Alternatively, to run gradle managed devices integration tests. From the root directory, run:
`./scripts/integration_tests_gradle.sh`

### e2e Tests with Detox
0. build to step 3.

1. choose a build target to run against. currently works against x86 and x86_64. download and create emulator with sdkmanager.
   `./scripts/flow_emulator_setup.sh -a x86`
if you already have the emulator created, you can target it without recreating it: `./scripts/emulator_target.sh -a x86_64`

2. `yarn detox build -c android.emu.x86`

3. `yarn detox test -c android.emu.x86`
or to run a specific test: `yarn detox test -c android.emu.x86 new_wallet`
