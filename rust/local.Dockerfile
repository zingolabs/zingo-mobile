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
ENV CARGO_TARGET_DIR=/opt/zingo/rust/target
ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
# forcing to 24 API LEVEL
ENV CARGO_NDK_PLATFORM=24
ENV CARGO_NDK_ANDROID_PLATFORM=24
ENV AR=llvm-ar
ENV RANLIB=llvm-ranlib

RUN rustup default nightly
RUN rustup target add x86_64-linux-android

RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash
RUN cargo binstall --force --locked bindgen-cli

RUN cargo binstall --version 4.0.1 cargo-ndk

# Copy just the lib crate to avoid docker cache invalidation
COPY lib/ ./

COPY Cargo.lock ./Cargo.lock

RUN cargo build --release

RUN cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate --library ../target/release/libzingo.so --language kotlin \ 
    --out-dir ./src

RUN cargo ndk --target x86_64-linux-android build --release
RUN llvm-strip --strip-all ../target/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/release/libzingo.so
RUN sha256sum ../target/release/libzingo.so