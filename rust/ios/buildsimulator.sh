#!/bin/bash

set -euo pipefail

cd ../lib
cargo run --release --features="uniffi/cli" --bin uniffi-bindgen generate ./src/zingo.udl --language swift --out-dir ./Generated
cargo build --release --target aarch64-apple-ios-sim --target x86_64-apple-ios
cargo lipo --release --targets aarch64-apple-ios-sim x86_64-apple-ios

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a
