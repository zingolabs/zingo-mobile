FROM zingodevops/android_builder:014 AS build_android

RUN apt update \
    && apt upgrade -y \
    && apt install -y --no-install-recommends --no-install-suggests \
    build-essential \
    cmake \
    golang \
    clang-18 \
    libclang-18-dev \
    gcc \
    g++ 

WORKDIR /opt/zingo/rust/lib/

# add the local rust code into the container
COPY android/ /opt/zingo/rust/android/
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY zingomobile_utils/ /opt/zingo/rust/zingomobile_utils/

RUN rustup default nightly

RUN cargo install --force --locked bindgen-cli

RUN cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \ 
    --out-dir ./src

RUN cargo install --version 3.5.4 cargo-ndk

ENV SOURCE_DATE_EPOCH=1710000000
ENV ZERO_AR_DATE=1
ENV RUSTFLAGS=" \
    --remap-path-prefix=$(pwd)=. \
    -C opt-level=z \
    -C debuginfo=0 \
    -C codegen-units=1 \
    -C linker-plugin-lto=no \
    -C link-arg=-Wl,--hash-style=gnu \
    -C link-arg=-Wl,--build-id=none \
    -C link-arg=-Wl,--no-relax \
    -C link-arg=-Wl,--pack-dyn-relocs=none \
    -C link-arg=-Wl,--sort-common \
    -C link-arg=-Wl,--sort-section=name"
ENV CGO_LDFLAGS="-trimpath -buildvcs=false -buildid= "
ENV CMAKE_C_FLAGS=$CFLAGS
ENV CMAKE_CXX_FLAGS=$CFLAGS
ENV CMAKE_SHARED_LINKER_FLAGS=$LDFLAGS


ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib

# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
ENV OPENSSL_DIR=/opt/openssl-3.3.2/aarch64
RUN cargo ndk --target arm64-v8a build --release -Z build-std
RUN llvm-strip --strip-all ../target/aarch64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/aarch64-linux-android/release/libzingo.so
RUN sha256sum ../target/aarch64-linux-android/release/libzingo.so
ENV CARGO_FEATURE_STD=false

ENV OPENSSL_DIR=/opt/openssl-3.3.2/armv7
RUN cargo ndk --target armeabi-v7a build --release -Z build-std
RUN llvm-strip --strip-all ../target/armv7-linux-androideabi/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/armv7-linux-androideabi/release/libzingo.so
RUN sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

ENV OPENSSL_DIR=/opt/openssl-3.3.2/x86
RUN cargo ndk --target x86 build --release -Z build-std
RUN llvm-strip --strip-all ../target/i686-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/i686-linux-android/release/libzingo.so
RUN sha256sum ../target/i686-linux-android/release/libzingo.so

ENV OPENSSL_DIR=/opt/openssl-3.3.2/x86_64
RUN cargo ndk --target x86_64 build --release -Z build-std
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so
