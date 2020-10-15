#!/bin/bash

OPENSSL_DIR=/tmp/openssl-1.1.1e/aarch64 OPENSSL_STATIC=yes CC=aarch64-linux-android28-clang cargo build --target aarch64-linux-android --release
OPENSSL_DIR=/tmp/openssl-1.1.1e/armv7 OPENSSL_STATIC=yes  CC=armv7a-linux-androideabi28-clang cargo build --target armv7-linux-androideabi --release
OPENSSL_DIR=/tmp/openssl-1.1.1e/x86 OPENSSL_STATIC=yes CC=i686-linux-android28-clang cargo build --target i686-linux-android --release

cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
cp ../target/armv7-linux-androideabi/release/librust.so  ../../android/app/src/main/jniLibs/armeabi-v7a/
cp ../target/aarch64-linux-android/release/librust.so ../../android/app/src/main/jniLibs/arm64-v8a/   