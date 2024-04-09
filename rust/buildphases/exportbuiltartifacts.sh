#! /usr/bin/env bash

# build library folder for android
mkdir -p ../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../android/app/src/main/jniLibs/x86
mkdir -p ../android/app/src/main/jniLibs/x86_64

id=$(docker create devlocal/build_android)

docker cp \
    $id:/opt/zingo/rust/target/x86_64-linux-android/release/librustlib.so \
    ../android/app/src/main/jniLibs/x86_64/libuniffi_rustlib.so
docker cp \
    $id:/opt/zingo/rust/target/i686-linux-android/release/librustlib.so \
    ../android/app/src/main/jniLibs/x86/libuniffi_rustlib.so
docker cp \
    $id:/opt/zingo/rust/target/armv7-linux-androideabi/release/librustlib.so \
    ../android/app/src/main/jniLibs/armeabi-v7a/libuniffi_rustlib.so
docker cp \
    $id:/opt/zingo/rust/target/aarch64-linux-android/release/librustlib.so \
    ../android/app/src/main/jniLibs/arm64-v8a/libuniffi_rustlib.so

docker rm -v $id
