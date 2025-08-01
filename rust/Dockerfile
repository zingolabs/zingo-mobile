FROM zingodevops/android_builder:016 AS build_android

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

RUN cargo install --version 4.0.1 cargo-ndk

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
# forcing to 24 API LEVEL
ENV CARGO_NDK_PLATFORM=24
ENV CARGO_NDK_ANDROID_PLATFORM=24
ENV AR=llvm-ar
ENV LD=ld
ENV RANLIB=llvm-ranlib

# aarch64
# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
ENV CC=aarch64-linux-android24-clang

ENV CFLAGS_aarch64_linux_android="-mno-outline-atomics"
ENV CXXFLAGS_aarch64_linux_android="-mno-outline-atomics"
RUN cargo ndk --target aarch64-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/aarch64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/aarch64-linux-android/release/libzingo.so
RUN sha256sum ../target/aarch64-linux-android/release/libzingo.so

# armv7
ENV CARGO_FEATURE_STD=false
ENV CC=armv7a-linux-androideabi24-clang

RUN cargo ndk --target armv7-linux-androideabi build --release -Z build-std
RUN llvm-strip --strip-all ../target/armv7-linux-androideabi/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/armv7-linux-androideabi/release/libzingo.so
RUN sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

# i686 - x86
ENV CARGO_FEATURE_STD=false
ENV CC=i686-linux-android24-clang

#-DBROKEN_CLANG_ATOMICS
RUN cargo ndk --target i686-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/i686-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/i686-linux-android/release/libzingo.so
RUN sha256sum ../target/i686-linux-android/release/libzingo.so

# x86_64
ENV CARGO_FEATURE_STD=false
ENV CC=x86_64-linux-android24-clang

RUN cargo ndk --target x86_64-linux-android build --release -Z build-std
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so

