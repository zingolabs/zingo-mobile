#!/bin/bash
# docker build --tag stunnar/rustndk:latest rustNDKDocker
docker build --tag zecwalletmobile/android:latest docker

docker run --rm -v $(pwd)/..:/opt/zecwalletmobile -v $(pwd)/target/registry:/root/.cargo/registry zecwalletmobile/android:latest bash -c "
    cd /opt/zecwalletmobile/android && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=i686-linux-android29-clang OPENSSL_DIR=/opt/openssl-3.0.1/x86 cargo +nightly build -Z build-std --target i686-linux-android --release && llvm-strip ../target/i686-linux-android/release/librust.so && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=armv7a-linux-androideabi29-clang OPENSSL_DIR=/opt/openssl-3.0.1/armv7 cargo +nightly build  -Z build-std --target armv7-linux-androideabi --release && llvm-strip ../target/armv7-linux-androideabi/release/librust.so && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=aarch64-linux-android29-clang OPENSSL_DIR=/opt/openssl-3.0.1/aarch64 cargo  +nightly build   -Z build-std --target aarch64-linux-android --release && llvm-strip ../target/aarch64-linux-android/release/librust.so"

# docker run --rm -v $(pwd)/..:/opt/zecwalletmobile -v $(pwd)/target/registry:/root/.cargo/registry -v $(pwd):/app -w /app zecwalletmobile/android:latest bash -c "
#      CC=i686-linux-android24-clang OPENSSL_DIR=/opt/openssl-3.0.1/x86 cargo ndk -t x86 -o ./jniLibs build
#      "

mkdir -p ../../android/app/src/main/jniLibs/arm64-v8a
mkdir -p ../../android/app/src/main/jniLibs/armeabi-v7a
mkdir -p ../../android/app/src/main/jniLibs/x86

cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
cp ../target/armv7-linux-androideabi/release/librust.so  ../../android/app/src/main/jniLibs/armeabi-v7a/
cp ../target/aarch64-linux-android/release/librust.so ../../android/app/src/main/jniLibs/arm64-v8a/

