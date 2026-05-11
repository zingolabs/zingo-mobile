#!/bin/bash

# not working on xcode
#export RUSTFLAGS="-C debuginfo=1 -C split-debuginfo=off -C symbol-mangling-version=v0"

# Align C build scripts deployment target with Rust's aarch64-apple-ios default
# to avoid linker warnings/errors when using Xcode with newer iOS SDKs
export IPHONEOS_DEPLOYMENT_TARGET=16.0

rustup default stable

cargo install --force --locked bindgen-cli

cd ../lib
cargo run --release --bin uniffi-bindgen generate ./src/zingo.udl --language swift --out-dir ./Generated
cargo build --release --target aarch64-apple-ios
cargo build --release --target x86_64-apple-ios

mkdir -p ../target/universal/release
lipo -create \
  ../target/aarch64-apple-ios/release/libzingo.a \
  ../target/x86_64-apple-ios/release/libzingo.a \
  -output ../target/universal/release/libzingo.a

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a