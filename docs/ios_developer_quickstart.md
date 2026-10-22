# iOS

> iOS builds require **macOS** with Xcode (and Xcode Command Line Tools) installed.
> They cannot be performed on Linux or Windows.

## Prerequisites

1. Yarn
2. NodeJS at the version pinned in `.nvmrc` (`nvm install` reads the file and installs it)
3. Rust (https://www.rust-lang.org/tools/install)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`)
5. CocoaPods (`sudo gem install cocoapods`)

## Building

The Binding Layer comes from the iOS Prebuilt Bundle that `binding-layer.json`
pins: the `ZingoBindings` Swift package with two XCFrameworks (`Zingolib`,
`ZingoNymProxyFFI`) and the Swift sources. The fetch extracts it under
`ios/binding-layer/ZingoBindings`, where the Xcode project references it as a
local package. Each XCFramework contains both the device slice (arm64) and
the simulator slice (arm64 + x86_64), and Xcode picks the slice by the build
destination.

1. Clone the repository:
   `git clone https://github.com/zingolabs/zingo-mobile.git`.
2. Go to the cloned repo `cd zingo-mobile`.
3. From the root of the project, install JS deps: `yarn`
4. Fetch the Binding Layer: `yarn --silent fetch:binding-layer --platform ios`.
   The command needs network access to `ghcr.io` the first time. The
   `Zingo` and `Zingo Beta` schemes run the same fetch as a build
   pre-action, before Xcode plans the package build, and log it to
   `ios/build/fetch_binding_layer.log`. A failed pre-action leaves the
   build running, and the first build phase of the `Zingo` target then
   compares the extracted package with the pin and fails naming this
   command when they differ.
5. In the `ios` directory, run: `pod install`

## Launching the app

1. In a terminal, run: `yarn start`
2. In a separate terminal, run: `yarn ios`
   You can also open the `ios` directory in Xcode and run it there.
