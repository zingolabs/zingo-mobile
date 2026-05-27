# iOS
> iOS builds require **macOS** with Xcode (and Xcode Command Line Tools) installed.
> They cannot be performed on Linux or Windows.

## Prerequisites
1. Yarn
2. NodeJS (recommended version 22.18.0 or higher)
3. Rust (https://www.rust-lang.org/tools/install)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`)
5. CocoaPods (`sudo gem install cocoapods`)

## Building
A single command produces `ios/Zingolib.xcframework`, a bundle that contains both
the device slice (arm64) and the simulator slice (arm64 + x86_64). Xcode picks
the right slice automatically based on the build destination — there is no
separate "device build" vs "simulator build".

1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. From the root of the project, install JS deps: `yarn`
4. Build the Rust XCFramework: `yarn rust:ios` — may take a long time on first run.
5. In the `ios` directory, run: `pod install`

## Launching the app
1. In a terminal, run: `yarn start`
2. In a separate terminal, run: `yarn ios`
   You can also open the `ios` directory in Xcode and run it there.
