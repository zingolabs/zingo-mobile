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
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY zingomobile_utils/ /opt/zingo/rust/zingomobile_utils/

RUN rustup default stable

RUN cargo install --force --locked bindgen-cli

RUN cargo run --release --features=uniffi/cli --bin uniffi-bindgen \
    generate ./src/zingo.udl --language kotlin \ 
    --out-dir ./src

RUN cargo install --version 4.0.1 cargo-ndk

ENV LIBCLANG_PATH=/usr/lib/llvm-18/lib
ENV CARGO_NDK_PLATFORM=26
ENV CARGO_NDK_ANDROID_PLATFORM=26

RUN cargo ndk --target x86_64-linux-android build --release
RUN llvm-strip --strip-all ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy \
    --remove-section .comment \
    ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so
