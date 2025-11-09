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

# TODO: use cargo chef

WORKDIR /opt/zingo/rust/lib/

# Copy just the lib crate to avoid docker cache invalidation
COPY lib/ ./

COPY Cargo.lock ./Cargo.lock

ENV CARGO_TARGET_DIR=/opt/zingo/rust/target

RUN rustup default nightly

RUN rustup target add aarch64-apple-ios x86_64-apple-ios \
    aarch64-linux-android armv7-linux-androideabi \
    i686-linux-android x86_64-linux-android
    
RUN cargo run --release --features uniffi/cli --bin uniffi-bindgen -- \
    generate ./src/zingo.udl --language kotlin --out-dir ./src

RUN cargo install --version 4.0.1 cargo-ndk
RUN cargo install sccache

ENV PATH="/root/.cargo/bin:/usr/local/cargo/bin:${PATH}"

ENV RUSTC_WRAPPER=sccache
ENV SCCACHE_DIR=/sccache
RUN mkdir -p /sccache && chmod 777 /sccache

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
ENV CARGO_NDK_PLATFORM=24
ENV CARGO_NDK_ANDROID_PLATFORM=24
ENV AR=llvm-ar
ENV RANLIB=llvm-ranlib

# aarch64
# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CC=aarch64-linux-android24-clang

ENV CFLAGS_aarch64_linux_android="-mno-outline-atomics"
ENV CXXFLAGS_aarch64_linux_android="-mno-outline-atomics"

# Install the bindgen CLI binary that aws-lc-sys expects to exec.
RUN cargo install --locked bindgen-cli

RUN cargo ndk \
  -t aarch64-linux-android \
  -t armv7-linux-androideabi \
  -t i686-linux-android \
  -t x86_64-linux-android \
  build --release

RUN set -eu; \
  for T in aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android; do \
    so="${CARGO_TARGET_DIR}/${T}/release/libzingo.so"; \
    llvm-strip --strip-all "$so"; \
    llvm-objcopy --remove-section .comment "$so"; \
    sha256sum "$so"; \
  done
