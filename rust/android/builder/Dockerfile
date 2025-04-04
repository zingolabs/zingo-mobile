FROM ubuntu:latest
ARG android_ndk_ver=r27c
# 27.2.12479018 CLANG/LLVM 18

# Install dependencies
RUN apt update \
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
    libssl-dev \
    pkg-config \
    && update-ca-certificates

# Install Android NDK
RUN curl -vfL -o /tmp/android-ndk.zip https://dl.google.com/android/repository/android-ndk-${android_ndk_ver}-linux.zip \
    && unzip /tmp/android-ndk.zip -d /usr/local/ \
    && rm -rf /tmp/android-ndk.zip
ENV ANDROID_NDK_HOME=/usr/local/android-ndk-${android_ndk_ver}
ENV NDK_HOME=/usr/local/android-ndk-${android_ndk_ver}
ENV ANDROID_NDK_ROOT=/usr/local/android-ndk-${android_ndk_ver}
ENV PATH=/usr/local/android-ndk-${android_ndk_ver}/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH

ENV SOURCE_DATE_EPOCH=1700000000
ENV CFLAGS="-ffile-prefix-map=$(pwd)=. -g0 -O2"
ENV LDFLAGS="-Wl,--build-id=none,--no-relax,--pack-dyn-relocs=none,--sort-common,--sort-section=name \
    -fuse-ld=lld"

# Install and setup Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV HOME=/root
ENV CARGO_HOME=$HOME/.cargo
ENV RUSTUP_HOME=$HOME/.rustup
ENV PATH=$PATH:$CARGO_HOME/bin
RUN rustup toolchain install stable --profile minimal
RUN rustup toolchain install nightly --component rust-src
RUN rustup update \
    && rustup default stable
RUN rustup target add \
    aarch64-linux-android \
    armv7-linux-androideabi \
    i686-linux-android \
    x86_64-linux-android
RUN echo "[target.aarch64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"aarch64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN echo "[target.armv7-linux-androideabi]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"armv7a-linux-androideabi24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN echo "[target.i686-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"i686-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN echo "[target.x86_64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"x86_64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml

# Install and setup OpenSSL
WORKDIR /opt
RUN curl -LO https://www.openssl.org/source/openssl-3.3.2.tar.gz -o openssl-3.3.2.tar.gz \
    && tar xvf openssl-3.3.2.tar.gz \
    && rm -rf openssl-3.3.2.tar.gz
ENV OPENSSL_STATIC=yes
WORKDIR /opt/openssl-3.3.2 
RUN mkdir x86 \
    && mkdir aarch64 \
    && mkdir armv7 \
    && mkdir x86_64

RUN ./Configure --prefix=/opt/openssl-3.3.2/aarch64 android-arm64 \
    -mno-outline-atomics \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean

RUN ./Configure --prefix=/opt/openssl-3.3.2/armv7 android-arm \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean

RUN ./Configure --prefix=/opt/openssl-3.3.2/x86 android-x86 \
    -DBROKEN_CLANG_ATOMICS \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean

RUN ./Configure --prefix=/opt/openssl-3.3.2/x86_64 android-x86_64 \
    -fno-ident \
    -fno-record-gcc-switches \
    -U__ANDROID_API__ \
    -D__ANDROID_API__=24 \
    && make -j$(nproc) \
    && make -j$(nproc) install \
    && make clean \
    && make distclean

# Apt clean up
RUN apt autoremove -y \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

