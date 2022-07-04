# Zecwallet Android and iOS apps

**WARNING! These apps are currently experimental!**
Do not use these apps in production.
Do not use these apps unless you specifically know what you are doing.

## Android build instructions

### Prerequisites
1. docker (for building the rust library)
2. `yarn`
3. `nodejs`

Carefully follow the instructions to [setup Android Studio for your
operating system](https://reactnative.dev/docs/environment-setup).

If you do not have a physical device, you can create and start
a new Android 11, API 30 emulator device compatible
with the chip on your system and start the emulated device.

### Building
0. Start docker daemon
1. AS A NONROOT USER: In the `rust/android` directory, run `./build.sh`.
   This step will take a long time.
2. From the root of the project, run `yarn install`
3. Run `npx react-native start` to start the dev server
4. Run `npm run android` to compile and install the app on an
   emulator or connected device. You can also open the `android` directory
   in Android Studio as a project and hit the run button

## iOS build instructions

### Prerequisites
1. Install Rust
2. Add the ios targets `rustup target add aarch64-apple-ios x86_64-apple-ios`
3. `cargo install cargo-lipo`
4. `cargo install cbindgen`
5. `sudo gem install cocoapods` to install cocoapods

### Building
1. In the `rust/ios` directory, run `./build.sh`.
   This step will take a long time.
2. In the `ios` directory, run `pod install`
3. From the root of the project, run `yarn install`
4. Run `npx react-native start` to start the dev server
5. Run `npx react-native run-ios` to compile and install the app on an emulator/connected device. You can also open the `.xcworkspace` project in XCode and run the app from XCode.
