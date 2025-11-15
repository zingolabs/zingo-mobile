#!/bin/bash

set -euo pipefail

# Pick the iOS Simulator SDK and tools. This is necessary for librocksdb-sys compilation
SDK_SIMULATOR="$(xcrun --sdk iphonesimulator --show-sdk-path)"
CLANG_SIMULATOR="$(xcrun --sdk iphonesimulator -f clang)"
AR_SIMULATOR="$(xcrun --sdk iphonesimulator -f ar)"

export BINDGEN_EXTRA_CLANG_ARGS_aarch64_apple_ios_sim="--target=arm64-apple-ios-simulator -isysroot ${SDK_SIMULATOR}"
export BINDGEN_EXTRA_CLANG_ARGS_x86_64_apple_ios="-isysroot ${SDK_SIMULATOR}"

# Use the simulator toolchain for C builds under those Rust targets
export CC_aarch64_apple_ios_sim="${CLANG_SIMULATOR}"
export AR_aarch64_apple_ios_sim="${AR_SIMULATOR}"
export CC_x86_64_apple_ios="${CLANG_SIMULATOR}"
export AR_x86_64_apple_ios="${AR_SIMULATOR}"

cd ../lib
cargo run --release --features="uniffi/cli" --bin uniffi-bindgen generate ./src/zingo.udl --language swift --out-dir ./Generated
cargo build --release --target aarch64-apple-ios-sim --target x86_64-apple-ios
cargo lipo --release --targets aarch64-apple-ios-sim x86_64-apple-ios

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a
