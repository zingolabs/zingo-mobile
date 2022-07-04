#! /usr/bin/env bash

# build rust library for android, used nightly build to rebuild core-librarys not there at compile time
docker run --rm -v $(pwd)/..:/opt/zingo -v $(pwd)/target/registry:/root/.cargo/registry devlocal/rustndk_openssl_installed_image:latest bash -c "
    cd /opt/zingo/android && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=x86_64-linux-android30-clang OPENSSL_DIR=/opt/openssl-3.0.1/x86_64 cargo +nightly build -Z build-std --target x86_64-linux-android --release && \
    llvm-strip ../target/x86_64-linux-android/release/librust.so && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=i686-linux-android30-clang OPENSSL_DIR=/opt/openssl-3.0.1/x86 cargo +nightly build -Z build-std --target i686-linux-android --release && \
    llvm-strip ../target/i686-linux-android/release/librust.so && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=armv7a-linux-androideabi30-clang OPENSSL_DIR=/opt/openssl-3.0.1/armv7 cargo +nightly build -Z build-std --target armv7-linux-androideabi --release && \
    llvm-strip ../target/armv7-linux-androideabi/release/librust.so && \
    AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=aarch64-linux-android30-clang OPENSSL_DIR=/opt/openssl-3.0.1/aarch64 cargo  +nightly build -Z build-std --target aarch64-linux-android --release && \
    llvm-strip ../target/aarch64-linux-android/release/librust.so"
