FROM zingodevops/android_builder:015 AS build_android

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

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib

# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
#-mno-outline-atomics
RUN cargo ndk --target aarch64-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/aarch64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/aarch64-linux-android/release/libzingo.so
RUN sha256sum ../target/aarch64-linux-android/release/libzingo.so
ENV CARGO_FEATURE_STD=false

RUN cargo ndk --target armv7-linux-androideabi build --release -Z build-std
RUN llvm-strip --strip-all ../target/armv7-linux-androideabi/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/armv7-linux-androideabi/release/libzingo.so
RUN sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

#-DBROKEN_CLANG_ATOMICS
RUN cargo ndk --target i686-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/i686-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/i686-linux-android/release/libzingo.so
RUN sha256sum ../target/i686-linux-android/release/libzingo.so

RUN cargo ndk --target x86_64-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so
