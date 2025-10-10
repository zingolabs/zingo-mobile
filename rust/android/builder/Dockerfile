FROM ubuntu:latest
ARG android_ndk_ver=r28c
# 28.2.13676358

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
RUN    echo "[target.armv7-linux-androideabi]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"armv7a-linux-androideabi24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN    echo "[target.i686-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"i686-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN    echo "[target.aarch64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"aarch64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
RUN    echo "[target.x86_64-linux-android]" >> $CARGO_HOME/config.toml \
    && echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml \
    && echo "linker = \"x86_64-linux-android24-clang\"" >> $CARGO_HOME/config.toml \
    && echo "" >> $CARGO_HOME/config.toml
