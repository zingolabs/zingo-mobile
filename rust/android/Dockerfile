FROM debian:bullseye-slim as apt_upgrade_rustndk_image

ARG android_ndk_ver=r23b

# Install Android NDK
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends --no-install-suggests \
            ca-certificates \
            build-essential \
            curl \
            automake \
            unzip \
            git \
            g++-aarch64-linux-gnu \
            libc6-dev-arm64-cross \
 && update-ca-certificates \
 # Install NDK itself
 && curl -fL -o /tmp/android-ndk.zip \
         https://dl.google.com/android/repository/android-ndk-${android_ndk_ver}-linux.zip \
 && unzip /tmp/android-ndk.zip -d /usr/local/


RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o ./rustup.sh
RUN chmod +x ./rustup.sh && ./rustup.sh -y
ENV HOME=/root
ENV CARGO_HOME=$HOME/.cargo
ENV PATH=$PATH:/root/.cargo/bin
# get latest stable toolchain
RUN rustup toolchain install stable

# Install Rust targets for Android platforms
RUN rustup target add aarch64-linux-android \
                      armv7-linux-androideabi \
                      i686-linux-android \
                      x86_64-linux-android


# Path to the Android NDK for cargo-ndk Cargo plugin
ENV ANDROID_NDK_HOME=/usr/local/android-ndk-${android_ndk_ver} \
    NDK_HOME=/usr/local/android-ndk-${android_ndk_ver} \
    ANDROID_NDK_ROOT=/usr/local/android-ndk-${android_ndk_ver}

ENV PATH=/usr/local/android-ndk-${android_ndk_ver}/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH


# Install cargo-ndk Cargo plugin
RUN cargo install cargo-ndk

FROM apt_upgrade_rustndk_image as rustndk_openssl_installed_image

# RUN curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain none -y
# ENV PATH=/root/.cargo/bin:/opt/android-ndk-linux/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH

# RUN rustup target add i686-linux-android
# RUN rustup target add armv7-linux-androideabi
# RUN rustup target add aarch64-linux-android

# change this if the ndk updates

RUN cd /opt && curl --proto '=https' --tlsv1.2 https://www.openssl.org/source/openssl-3.0.1.tar.gz -o openssl-3.0.1.tar.gz && \
    tar xvf openssl-3.0.1.tar.gz && cd openssl-3.0.1 && \
    mkdir x86 && mkdir aarch64 && mkdir armv7

RUN cd /opt/openssl-3.0.1 && \
    ./Configure --prefix=/opt/openssl-3.0.1/aarch64  android-arm64 -D__ANDROID_API__=29 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-3.0.1 && \
    ./Configure --prefix=/opt/openssl-3.0.1/armv7  android-arm -D__ANDROID_API__=29 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-3.0.1 && \
    ./Configure --prefix=/opt/openssl-3.0.1/x86  android-x86 -D__ANDROID_API__=29 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN rustup component add rustfmt

RUN cd /opt && git clone --depth=1 https://github.com/zingolabs/zecwallet-mobile zecwalletmobile && cd zecwalletmobile/rust/android && cargo fetch && cargo build --release && rm -rf /opt/zecwalletmobile

RUN rustup target install aarch64-linux-android
RUN echo "[target.aarch64-linux-android]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"aarch64-linux-android29-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

RUN rustup target install armv7-linux-androideabi
RUN echo "[target.armv7-linux-androideabi]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"armv7a-linux-androideabi29-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

RUN rustup target install i686-linux-android
RUN echo "[target.i686-linux-android]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"i686-linux-android29-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

ENV OPENSSL_STATIC=yes

# including nightly build to be able to compile -lgcc library
RUN rustup install nightly-x86_64-unknown-linux-gnu
RUN rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
RUN rustup component add rustfmt --toolchain nightly-x86_64-unknown-linux-gnu
