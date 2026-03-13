#!/bin/bash

ln -s $(which node) /usr/local/bin/node

rustup default stable

cargo install --force --locked bindgen-cli

cd ../lib
cargo run --release --bin uniffi-bindgen generate ./src/zingo.udl --language swift --out-dir ./Generated
cargo build --release --target aarch64-apple-ios-sim
cargo build --release --target x86_64-apple-ios
cargo lipo --release --targets aarch64-apple-ios-sim x86_64-apple-ios

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a
