#!/bin/bash
set -e

export SOURCE_DATE_EPOCH=1700000000
export CFLAGS="-ffile-prefix-map=$(pwd)=. -g0 -O2"
export LDFLAGS="-Wl,--build-id=none,--no-relax,--pack-dyn-relocs=none,--sort-common,--sort-section=name,--hash-style=gnu \
    -fuse-ld=lld"
export RUSTFLAGS=" \
    --remap-path-prefix=$(pwd)=. \
    -C opt-level=z \
    -C debuginfo=0 \
    -C codegen-units=1 \
    -C linker-plugin-lto=no \
    -C link-arg=-fuse-ld=lld \
    -C link-arg=-Wl,--hash-style=gnu \
    -C link-arg=-Wl,--build-id=none \
    -C link-arg=-Wl,--no-relax \
    -C link-arg=-Wl,--pack-dyn-relocs=none \
    -C link-arg=-Wl,--sort-common \
    -C link-arg=-Wl,--sort-section=name"
export CGO_LDFLAGS="-trimpath -buildvcs=false -buildid= "

android_ndk_ver="r27c"

apt update \
    && apt upgrade -y \
    && apt install -y --no-install-recommends --no-install-suggests \
    ca-certificates \
    build-essential \
    cmake \
    make \
    curl \
    automake \
    unzip \
    git \
    protobuf-compiler \
    openssl \
    libssl-dev \
    golang \
    clang-16 \
    libclang-16-dev \
    gcc \
    g++ \
    pkg-config \
    && update-ca-certificates

# Install Android NDK
curl -fL -o /tmp/android-ndk.zip https://dl.google.com/android/repository/android-ndk-${android_ndk_ver}-linux.zip
unzip /tmp/android-ndk.zip -d /usr/local/ > /dev/null
rm -rf /tmp/android-ndk.zip
export ANDROID_NDK_HOME="/usr/local/android-ndk-${android_ndk_ver}"
export NDK_HOME="/usr/local/android-ndk-${android_ndk_ver}"
export ANDROID_NDK_ROOT="/usr/local/android-ndk-${android_ndk_ver}"
export PATH="/usr/local/android-ndk-${android_ndk_ver}/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH"

# Install and setup Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export HOME="/root"
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"
export PATH="$PATH:$CARGO_HOME/bin"
rustup toolchain install stable --profile minimal
rustup toolchain install nightly --component rust-src
rustup update
rustup default stable
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

# Install and setup OpenSSL
mkdir -p /opt/openssl-3.3.2
curl -fL -o /opt/openssl-3.3.2.tar.gz https://www.openssl.org/source/openssl-3.3.2.tar.gz
tar xvf /opt/openssl-3.3.2.tar.gz -C /opt/openssl-3.3.2 --strip-components=1 > /dev/null
rm -rf /opt/openssl-3.3.2.tar.gz
export OPENSSL_STATIC="yes"

mkdir -p /opt/openssl-3.3.2/x86 \
    && mkdir -p /opt/openssl-3.3.2/aarch64 \
    && mkdir -p /opt/openssl-3.3.2/armv7 \
    && mkdir -p /opt/openssl-3.3.2/x86_64

/opt/openssl-3.3.2/Configure --prefix=/opt/openssl-3.3.2/aarch64 android-arm64 \
    -mno-outline-atomics \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 > /dev/null \
    && make -j$(nproc) > /dev/null \
    && make -j$(nproc) install > /dev/null \
    && make clean > /dev/null \
    && make distclean > /dev/null
/opt/openssl-3.3.2/Configure --prefix=/opt/openssl-3.3.2/armv7 android-arm \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 > /dev/null \
    && make -j$(nproc) > /dev/null \
    && make -j$(nproc) install > /dev/null \
    && make clean > /dev/null \
    && make distclean > /dev/null
/opt/openssl-3.3.2/Configure --prefix=/opt/openssl-3.3.2/x86 android-x86 \
    -DBROKEN_CLANG_ATOMICS \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24  > /dev/null \
    && make -j$(nproc) > /dev/null \
    && make -j$(nproc) install > /dev/null \
    && make clean  > /dev/null \
    && make distclean > /dev/null
/opt/openssl-3.3.2/Configure --prefix=/opt/openssl-3.3.2/x86_64 android-x86_64 \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 > /dev/null \
    && make -j$(nproc) > /dev/null \
    && make -j$(nproc) install > /dev/null \
    && make clean > /dev/null \
    && make distclean > /dev/null

rustup default nightly

cargo install --force --locked bindgen-cli

cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \
    --out-dir ./src

cargo install --version ^3 cargo-ndk

export LIBCLANG_PATH=/usr/lib/llvm-16/lib

export CARGO_FEATURE_STD="true"
export OPENSSL_DIR=/opt/openssl-3.3.2/aarch64
cargo ndk --target arm64-v8a build --release -Z build-std > /dev/null
llvm-strip --strip-all ../target/aarch64-linux-android/release/libzingo.so
llvm-objcopy \
    --remove-section .comment \
    ../target/aarch64-linux-android/release/libzingo.so
sha256sum ../target/aarch64-linux-android/release/libzingo.so
export CARGO_FEATURE_STD="false"

export OPENSSL_DIR=/opt/openssl-3.3.2/armv7
cargo ndk --target armeabi-v7a build --release -Z build-std > /dev/null
llvm-strip --strip-all ../target/armv7-linux-androideabi/release/libzingo.so
llvm-objcopy \
    --remove-section .comment \
    ../target/armv7-linux-androideabi/release/libzingo.so
sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

export OPENSSL_DIR=/opt/openssl-3.3.2/x86
cargo ndk --target x86 build --release -Z build-std > /dev/null
llvm-strip --strip-all ../target/i686-linux-android/release/libzingo.so
llvm-objcopy \
    --remove-section .comment \
    ../target/i686-linux-android/release/libzingo.so
sha256sum ../target/i686-linux-android/release/libzingo.so

export OPENSSL_DIR=/opt/openssl-3.3.2/x86_64
cargo ndk --target x86_64 build --release -Z build-std > /dev/null
llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
sha256sum ../target/x86_64-linux-android/release/libzingo.so

mkdir -p /opt/jniLibs/x86 \
    && mkdir -p /opt/jniLibs/arm64-v8a \
    && mkdir -p /opt/jniLibs/armeabi-v7a \
    && mkdir -p /opt/jniLibs/x86_64 \
    && mkdir -p /opt/jniLibs/kotlin

cp ../target/x86_64-linux-android/release/libzingo.so /opt/jniLibs/x86_64/libuniffi_zingo.so
cp ../target/i686-linux-android/release/libzingo.so /opt/jniLibs/x86/libuniffi_zingo.so
cp ../target/armv7-linux-androideabi/release/libzingo.so /opt/jniLibs/armeabi-v7a/libuniffi_zingo.so
cp ../target/aarch64-linux-android/release/libzingo.so /opt/jniLibs/arm64-v8a/libuniffi_zingo.so
cp ./src/uniffi/zingo/zingo.kt /opt/jniLibs/kotlin/zingo.kt

yes | rustup self uninstall

rm -rf ../target
rm -rf /opt/openssl-3.3.2
rm -rf ./src/uniffi
rm -rf $NDK_HOME
rm -rf $RUSTUP_HOME
rm -rf $CARGO_HOME

# Apt clean up
apt autoremove -y \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*