FROM zingodevops/android_builder:017 AS build_android

RUN apt update \
    && apt install -y --no-install-recommends --no-install-suggests \
    build-essential \
    cmake \
    golang \
    clang-18 \
    libclang-18-dev \
    gcc \
    g++ \
    pkg-config libssl-dev ca-certificates

WORKDIR /opt/zingo/rust/lib/

# TODO: use cargo chef

WORKDIR /opt/zingo/rust/lib/

# Copy just the lib crate to avoid docker cache invalidation
COPY lib/ ./

COPY Cargo.lock ./Cargo.lock

ENV CARGO_TARGET_DIR=/opt/zingo/rust/target

RUN rustup default nightly

RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash

RUN rustup target add x86_64-linux-android

RUN cargo binstall --force --locked bindgen-cli

RUN cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \ 
    --out-dir ./src

RUN cargo binstall --version 4.0.1 cargo-ndk

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
# forcing to 24 API LEVEL
ENV CARGO_NDK_PLATFORM=24
ENV CARGO_NDK_ANDROID_PLATFORM=24
ENV AR=llvm-ar
ENV RANLIB=llvm-ranlib

RUN cargo ndk --target x86_64-linux-android build --release
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so
