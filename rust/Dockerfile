FROM debian:bullseye-slim as apt_upgrade_rustndk_image

# Install Android NDK
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends --no-install-suggests \
    ca-certificates \
    build-essential \
    gcc-10-aarch64-linux-gnu \
    libc6-dev \
    make \
    curl \
    automake \
    unzip \
    git \
    g++-aarch64-linux-gnu \
    libc6-dev-arm64-cross \
    protobuf-compiler \
    libssl-dev \
    pkg-config \
    && update-ca-certificates

# Add group
FROM apt_upgrade_rustndk_image as add_android_ndk
ARG android_ndk_ver=r25b

# Install NDK itself
RUN curl -vfL -o /tmp/android-ndk.zip \
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

RUN rustup target install aarch64-linux-android
RUN echo "[target.aarch64-linux-android]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"aarch64-linux-android23-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

RUN rustup target install armv7-linux-androideabi
RUN echo "[target.armv7-linux-androideabi]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"armv7a-linux-androideabi23-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

RUN rustup target install i686-linux-android
RUN echo "[target.i686-linux-android]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"i686-linux-android23-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml

RUN rustup target install x86_64-linux-android
RUN echo "[target.x86_64-linux-android]" >> $CARGO_HOME/config.toml
RUN echo "ar = \"llvm-ar\"" >> $CARGO_HOME/config.toml
RUN echo "linker = \"x86_64-linux-android23-clang\"" >> $CARGO_HOME/config.toml
RUN echo "" >> $CARGO_HOME/config.toml
# Path to the Android NDK for cargo-ndk Cargo plugin
ENV ANDROID_NDK_HOME=/usr/local/android-ndk-${android_ndk_ver} \
    NDK_HOME=/usr/local/android-ndk-${android_ndk_ver} \
    ANDROID_NDK_ROOT=/usr/local/android-ndk-${android_ndk_ver}

ENV PATH=/usr/local/android-ndk-${android_ndk_ver}/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH
# Install cargo-ndk Cargo plugin
RUN cargo install cargo-ndk

FROM add_android_ndk as rustndk_openssl_installed_image

# RUN curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain none -y
# ENV PATH=/root/.cargo/bin:/opt/android-ndk-linux/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH

# RUN rustup target add i686-linux-android
# RUN rustup target add armv7-linux-androideabi
# RUN rustup target add aarch64-linux-android
# RUN rustup target add x86_64-linux-android

# change this if the ndk updates

RUN cd /opt && curl --proto '=https' --tlsv1.2 https://www.openssl.org/source/openssl-3.0.5.tar.gz -o openssl-3.0.5.tar.gz && \
    tar xvf openssl-3.0.5.tar.gz && cd openssl-3.0.5 && \
    mkdir x86 && mkdir aarch64 && mkdir armv7 && mkdir x86_64

RUN cd /opt/openssl-3.0.5 && \
    ./Configure -mno-outline-atomics --prefix=/opt/openssl-3.0.5/aarch64  android-arm64 -U__ANDROID_API__ -D__ANDROID_API__=23 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-3.0.5 && \
    ./Configure --prefix=/opt/openssl-3.0.5/armv7  android-arm -U__ANDROID_API__ -D__ANDROID_API__=23 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-3.0.5 && \
    ./Configure -DBROKEN_CLANG_ATOMICS --prefix=/opt/openssl-3.0.5/x86  android-x86 -U__ANDROID_API__ -D__ANDROID_API__=23 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-3.0.5 && \
    ./Configure --prefix=/opt/openssl-3.0.5/x86_64 -U__ANDROID_API__  android-x86_64 -D__ANDROID_API__=23 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

# add the local rust code into the container
COPY android/ /opt/zingo/rust/android/
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY ios/ /opt/zingo/rust/ios/

ENV OPENSSL_STATIC=yes

# including nightly build to be able to compile -lgcc library
RUN rustup toolchain install nightly
RUN rustup component add rust-src --toolchain nightly

WORKDIR /opt/zingo/rust/android/

RUN cargo fetch
RUN cargo build --release
RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=aarch64-linux-android23-clang \
    OPENSSL_DIR=/opt/openssl-3.0.5/aarch64 cargo +nightly build -Z build-std \
    --target aarch64-linux-android --release
RUN llvm-strip ../target/aarch64-linux-android/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=x86_64-linux-android23-clang \
    OPENSSL_DIR=/opt/openssl-3.0.5/x86_64 cargo +nightly build -Z build-std \
    --target x86_64-linux-android --release
RUN llvm-strip ../target/x86_64-linux-android/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=i686-linux-android23-clang \
    OPENSSL_DIR=/opt/openssl-3.0.5/x86 cargo +nightly build -Z build-std \
    --target i686-linux-android --release
RUN llvm-strip ../target/i686-linux-android/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=armv7a-linux-androideabi23-clang \
    OPENSSL_DIR=/opt/openssl-3.0.5/armv7 cargo +nightly build -Z build-std \
    --target armv7-linux-androideabi --release
RUN llvm-strip ../target/armv7-linux-androideabi/release/librust.so
