#! /usr/bin/env bash

# build library folder for android
mkdir -p ../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../android/app/src/main/jniLibs/x86
mkdir -p ../android/app/src/main/jniLibs/x86_64

mkdir -p ../android/app/build/generated/source/uniffi/debug/java/uniffi/zingo
mkdir -p ../android/app/build/generated/source/uniffi/release/java/uniffi/zingo

id=$(docker create devlocal/build_android)

docker cp \
    $id:/opt/zingo/rust/target/x86_64-linux-android/release/libzingo.so \
    ../android/app/src/main/jniLibs/x86_64/libuniffi_zingo.so
docker cp \
    $id:/opt/zingo/rust/target/i686-linux-android/release/libzingo.so \
    ../android/app/src/main/jniLibs/x86/libuniffi_zingo.so
docker cp \
    $id:/opt/zingo/rust/target/armv7-linux-androideabi/release/libzingo.so \
    ../android/app/src/main/jniLibs/armeabi-v7a/libuniffi_zingo.so
docker cp \
    $id:/opt/zingo/rust/target/aarch64-linux-android/release/libzingo.so \
    ../android/app/src/main/jniLibs/arm64-v8a/libuniffi_zingo.so

docker cp \
    $id:/opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt \
    ../android/app/build/generated/source/uniffi/debug/java/uniffi/zingo/zingo.kt
docker cp \
    $id:/opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt \
    ../android/app/build/generated/source/uniffi/release/java/uniffi/zingo/zingo.kt
    
docker rm -v $id
