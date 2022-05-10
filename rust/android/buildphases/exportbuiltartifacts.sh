#! /usr/bin/env bash

# build library folder for android
mkdir -p ../../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../../android/app/src/main/jniLibs/x86

# copy over .so files
cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
cp ../target/armv7-linux-androideabi/release/librust.so  ../../android/app/src/main/jniLibs/armeabi-v7a/
cp ../target/aarch64-linux-android/release/librust.so ../../android/app/src/main/jniLibs/arm64-v8a/

