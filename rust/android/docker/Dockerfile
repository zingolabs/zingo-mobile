FROM zingodevops/android_builder:018 AS build_android

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
COPY ios/ /opt/zingo/rust/ios/
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY zingomobile_utils/ /opt/zingo/rust/zingomobile_utils/
COPY workbench/ /opt/zingo/rust/workbench/
COPY uniffi-bindgen/ /opt/zingo/rust/uniffi-bindgen/

# The build context has no .git; the host passes git describe output through.
ARG ZINGO_MOBILE_GIT_DESCRIBE
ENV ZINGO_MOBILE_GIT_DESCRIBE=${ZINGO_MOBILE_GIT_DESCRIBE}

COPY mixnet-proxy/ /opt/zingo/rust/mixnet-proxy/


RUN rustup default stable

RUN cargo install --force --locked bindgen-cli

RUN cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \ 
    --out-dir ./src

RUN cargo install --version 4.0.1 cargo-ndk

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
# forcing to 26 API LEVEL
ENV CARGO_NDK_PLATFORM=26
ENV CARGO_NDK_ANDROID_PLATFORM=26
ENV AR=llvm-ar
ENV LD=ld
ENV RANLIB=llvm-ranlib

# aarch64
# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
ENV CC=aarch64-linux-android26-clang

ENV CFLAGS_aarch64_linux_android="-mno-outline-atomics"
ENV CXXFLAGS_aarch64_linux_android="-mno-outline-atomics"
RUN cargo ndk --target aarch64-linux-android build --release
RUN llvm-strip --strip-all ../target/aarch64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/aarch64-linux-android/release/libzingo.so
RUN sha256sum ../target/aarch64-linux-android/release/libzingo.so

# armv7
ENV CARGO_FEATURE_STD=false
ENV CC=armv7a-linux-androideabi26-clang

RUN cargo ndk --target armv7-linux-androideabi build --release
RUN llvm-strip --strip-all ../target/armv7-linux-androideabi/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/armv7-linux-androideabi/release/libzingo.so
RUN sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

# i686 - x86
ENV CARGO_FEATURE_STD=false
ENV CC=i686-linux-android26-clang

#-DBROKEN_CLANG_ATOMICS
RUN cargo ndk --target i686-linux-android build --release
RUN llvm-strip --strip-all ../target/i686-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/i686-linux-android/release/libzingo.so
RUN sha256sum ../target/i686-linux-android/release/libzingo.so

# x86_64
ENV CARGO_FEATURE_STD=false
ENV CC=x86_64-linux-android26-clang

RUN cargo ndk --target x86_64-linux-android build --release
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so

# ===== mixnet proxy (mixnet-proxy) =====
# Cross-compile the proxy per ABI in its own workspace (nym-sdk resolves only in
# mixnet-proxy's lock), mirroring the wallet's per-ABI CC/env above. Kotlin bindings
# come from library mode against a built .so (proc-macro uniffi, no UDL).
WORKDIR /opt/zingo/rust/mixnet-proxy
ENV PROXY=libmixnet_proxy.so

# aarch64
ENV CARGO_FEATURE_STD=true
ENV CC=aarch64-linux-android26-clang
RUN cargo ndk --target aarch64-linux-android build --release --package mixnet-proxy

RUN cargo run --release --manifest-path /opt/zingo/rust/Cargo.toml \
    --package zingo-uniffi-bindgen -- generate \
    --library target/aarch64-linux-android/release/$PROXY \
    --language kotlin --out-dir generated-kotlin
RUN llvm-strip --strip-all target/aarch64-linux-android/release/$PROXY
RUN llvm-objcopy --remove-section .comment target/aarch64-linux-android/release/$PROXY
RUN sha256sum target/aarch64-linux-android/release/$PROXY

# armv7
ENV CARGO_FEATURE_STD=false
ENV CC=armv7a-linux-androideabi26-clang
RUN cargo ndk --target armv7-linux-androideabi build --release --package mixnet-proxy
RUN llvm-strip --strip-all target/armv7-linux-androideabi/release/$PROXY
RUN llvm-objcopy --remove-section .comment target/armv7-linux-androideabi/release/$PROXY
RUN sha256sum target/armv7-linux-androideabi/release/$PROXY

# i686 - x86
ENV CC=i686-linux-android26-clang
RUN cargo ndk --target i686-linux-android build --release --package mixnet-proxy
RUN llvm-strip --strip-all target/i686-linux-android/release/$PROXY
RUN llvm-objcopy --remove-section .comment target/i686-linux-android/release/$PROXY
RUN sha256sum target/i686-linux-android/release/$PROXY

# x86_64
ENV CC=x86_64-linux-android26-clang
RUN cargo ndk --target x86_64-linux-android build --release --package mixnet-proxy
RUN llvm-strip --strip-all target/x86_64-linux-android/release/$PROXY
RUN llvm-objcopy --remove-section .comment target/x86_64-linux-android/release/$PROXY
RUN sha256sum target/x86_64-linux-android/release/$PROXY

