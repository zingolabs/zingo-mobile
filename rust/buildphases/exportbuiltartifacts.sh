#! /usr/bin/env bash

# build library folder for android
mkdir -p ../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../android/app/src/main/jniLibs/x86
mkdir -p ../android/app/src/main/jniLibs/x86_64

id=$(docker create devlocal/build_android)

docker cp \
    $id:/opt/zingo/rust/target/x86_64-linux-android/release/librust.so \
    ../android/app/src/main/jniLibs/x86_64/librust.so
docker cp \
    $id:/opt/zingo/rust/target/i686-linux-android/release/librust.so \
    ../android/app/src/main/jniLibs/x86/librust.so
docker cp \
    $id:/opt/zingo/rust/target/armv7-linux-androideabi/release/librust.so \
    ../android/app/src/main/jniLibs/armeabi-v7a/librust.so
docker cp \
    $id:/opt/zingo/rust/target/aarch64-linux-android/release/librust.so \
    ../android/app/src/main/jniLibs/arm64-v8a/librust.so

docker rm -v $id

# cp ../target/x86_64-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86_64/
# cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
# cp ../target/armv7-linux-androideabi/release/librust.so  ../../android/app/src/main/jniLibs/armeabi-v7a/
# cp ../target/aarch64-linux-android/release/librust.so ../../android/app/src/main/jniLibs/arm64-v8a/
