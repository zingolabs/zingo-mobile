#!/bin/bash

cd ../lib
cargo run --release --bin uniffi-bindgen generate ../lib/src/zingo.udl --language swift --out-dir ./Generated
cargo lipo --release --targets x86_64-apple-ios

cp ./Generated/zingo.swift ../../ios
cp ./Generated/zingoFFI.h ../../ios
cp ./Generated/zingoFFI.modulemap ../../ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a