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
