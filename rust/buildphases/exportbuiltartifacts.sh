#! /usr/bin/env bash

# build library folder for android
mkdir -p ../../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../../android/app/src/main/jniLibs/x86
mkdir -p ../../android/app/src/main/jniLibs/x86_64

docker cp \
    rustndk_openssl_installed_image:/opt/zingo/rust/target/x86_64-linux-android/release/librust.so \
    ../../android/app/src/main/jniLibs/x86_64/librust.so
docker cp \
    rustndk_openssl_installed_image:/opt/zingo/rust/target/i686-linux-android/release/librust.so \
    ../../android/app/src/main/jniLibs/x86/librust.so
docker cp \
    rustndk_openssl_installed_image:/opt/zingo/rust/target/armv7-linux-androideabi/release/librust.so \
    ../../android/app/src/main/jniLibs/armeabi-v7a/librust.so
docker cp \
    rustndk_openssl_installed_image:/opt/zingo/rust/target/aarch64-linux-android/release/librust.so \
    ../../android/app/src/main/jniLibs/arm64-v8a/librust.so

# cp ../target/x86_64-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86_64/
# cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
# cp ../target/armv7-linux-androideabi/release/librust.so  ../../android/app/src/main/jniLibs/armeabi-v7a/
# cp ../target/aarch64-linux-android/release/librust.so ../../android/app/src/main/jniLibs/arm64-v8a/
