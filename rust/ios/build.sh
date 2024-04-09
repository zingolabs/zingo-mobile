#!/bin/bash

cd ../lib
cargo run --release --bin uniffi-bindgen generate ../lib/src/rustlib.udl --language swift --out-dir ./Generated
cargo lipo --release --targets aarch64-apple-ios

cp ./Generated/rustlib.swift ../../ios
cp ./Generated/rustlibFFI.h ../../ios
cp ./Generated/rustlibFFI.modulemap ../../ios

cp ../target/universal/release/librustlib.a ../../ios/libuniffi_rustlib.a