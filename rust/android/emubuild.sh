#!/bin/bash

OPENSSL_DIR=/tmp/openssl-1.1.1e/x86  OPENSSL_STATIC=yes cargo build --target i686-linux-android --release
cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
