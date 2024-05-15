#!/bin/bash

cd ../lib
cargo run --release --bin uniffi-bindgen generate ../lib/src/zingo.udl --language swift --out-dir ../../ios
cargo lipo --release --targets x86_64-apple-ios

cp ../target/universal/release/libzingo.a ../../ios/libuniffi_zingo.a