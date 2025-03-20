#!/bin/bash

set -e

android_ndk_ver="r27c"

apt update && apt install -y --no-install-recommends --no-install-suggests \
    ca-certificates \
    build-essential \
    gcc-10-aarch64-linux-gnu \
    libc6-dev \
    cmake \
    golang \
    libclang1 \
    llvm-dev \
    libclang-dev \
    libatomic1 \
    clang \
    make \
    curl \
    automake \
    unzip \
    git \
    g++-aarch64-linux-gnu \
    libc6-dev-arm64-cross \
    protobuf-compiler \
    libssl-dev \
    pkg-config \
    && update-ca-certificates

curl -vfL -o /tmp/android-ndk.zip https://dl.google.com/android/repository/android-ndk-${android_ndk_ver}-linux.zip \
    && unzip /tmp/android-ndk.zip -d /usr/local/ \
    && rm -rf /tmp/android-ndk.zip

export ANDROID_NDK_HOME="/usr/local/android-ndk-${android_ndk_ver}"
export NDK_HOME="/usr/local/android-ndk-${android_ndk_ver}"
export ANDROID_NDK_ROOT="/usr/local/android-ndk-${android_ndk_ver}"
export PATH="/usr/local/android-ndk-${android_ndk_ver}/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH"

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export HOME="/root"
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"
export PATH="$PATH:$CARGO_HOME/bin"
rustup toolchain install stable --profile minimal
rustup toolchain install nightly --component rust-src
rustup update \
    && rustup default stable

rustup target add \
    aarch64-linux-android \
    armv7-linux-androideabi \
    i686-linux-android \
    x86_64-linux-android

echo "[target.aarch64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"aarch64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
echo "[target.armv7-linux-androideabi]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"armv7a-linux-androideabi24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
echo "[target.i686-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"i686-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
echo "[target.x86_64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"x86_64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml

cd /opt

curl -LO https://www.openssl.org/source/openssl-3.3.2.tar.gz -o openssl-3.3.2.tar.gz \
    && tar xvf openssl-3.3.2.tar.gz \
    && rm -rf openssl-3.3.2.tar.gz
export OPENSSL_STATIC="yes"
cd /opt/openssl-3.3.2 
mkdir x86 \
    && mkdir aarch64 \
    && mkdir armv7 \
    && mkdir x86_64

./Configure --prefix=/opt/openssl-3.3.2/aarch64 android-arm64 \
    -mno-outline-atomics \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean
./Configure --prefix=/opt/openssl-3.3.2/armv7 android-arm \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean
./Configure --prefix=/opt/openssl-3.3.2/x86 android-x86 \
    -DBROKEN_CLANG_ATOMICS \
    #-latomic \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean
./Configure --prefix=/opt/openssl-3.3.2/x86_64 android-x86_64 \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean

apt autoremove -y \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

mkdir /opt/zingo/rust/lib/
cd /opt/zingo/rust/lib/

rustup default nightly

cargo install --force --locked bindgen-cli

cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \ 
    --out-dir ./src

cargo install --version ^3 cargo-ndk

export CARGO_FEATURE_STD="true"
OPENSSL_DIR=/opt/openssl-3.3.2/aarch64 cargo ndk --target arm64-v8a build --release -Z build-std
llvm-strip ../target/aarch64-linux-android/release/libzingo.so

OPENSSL_DIR=/opt/openssl-3.3.2/x86_64 cargo ndk --target x86_64 build --release -Z build-std
llvm-strip ../target/x86_64-linux-android/release/libzingo.so

OPENSSL_DIR=/opt/openssl-3.3.2/armv7 cargo ndk --target armeabi-v7a build --release -Z build-std
llvm-strip ../target/armv7-linux-androideabi/release/libzingo.so

OPENSSL_DIR=/opt/openssl-3.3.2/x86 cargo ndk --target x86 build --release -Z build-std
llvm-strip ../target/i686-linux-android/release/libzingo.so
