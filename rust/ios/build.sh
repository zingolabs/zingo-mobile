#!/bin/bash

set -euo pipefail

cd ../lib
cargo build --release --target aarch64-apple-ios --target x86_64-apple-ios
cargo run --features="uniffi/cli" --release --bin uniffi-bindgen generate --library ../target/aarch64-apple-ios/release/libzingo.dylib --language swift --out-dir ./Generated
cargo lipo --release --targets aarch64-apple-ios x86_64-apple-ios

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libzingo.a