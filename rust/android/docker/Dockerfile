FROM stunnar/rustndk:latest

RUN apt-get update 
RUN apt-get install -y curl wget gcc make automake build-essential

# RUN curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain none -y
# ENV PATH=/root/.cargo/bin:/opt/android-ndk-linux/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH

# RUN rustup target add i686-linux-android
# RUN rustup target add armv7-linux-androideabi
# RUN rustup target add aarch64-linux-android

# change this if the ndk updates

RUN cd /opt && wget https://www.openssl.org/source/openssl-3.0.1.tar.gz && \
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

RUN apt-get install -y git

RUN cd /opt && git clone --depth=1 https://github.com/zecwalletco/zecwallet-mobile zecwalletmobile && cd zecwalletmobile/rust/android && cargo fetch && cargo build --release && rm -rf /opt/zecwalletmobile

RUN apt-get install --assume-yes --no-install-recommends \
    g++-aarch64-linux-gnu \
    libc6-dev-arm64-cross

RUN rustup target install aarch64-linux-android
RUN echo "[target.aarch64-linux-android]" >> /usr/local/cargo/config
RUN echo "ar = \"llvm-ar\"" >> /usr/local/cargo/config
RUN echo "linker = \"aarch64-linux-android29-clang\"" >> /usr/local/cargo/config
RUN echo "" >> /usr/local/cargo/config

RUN rustup target install armv7-linux-androideabi
RUN echo "[target.armv7-linux-androideabi]" >> /usr/local/cargo/config
RUN echo "ar = \"llvm-ar\"" >> /usr/local/cargo/config
RUN echo "linker = \"armv7a-linux-androideabi29-clang\"" >> /usr/local/cargo/config
RUN echo "" >> /usr/local/cargo/config

RUN rustup target install i686-linux-android
RUN echo "[target.i686-linux-android]" >> /usr/local/cargo/config
RUN echo "ar = \"llvm-ar\"" >> /usr/local/cargo/config
RUN echo "linker = \"i686-linux-android29-clang\"" >> /usr/local/cargo/config
RUN echo "" >> /usr/local/cargo/config

ENV OPENSSL_STATIC=yes

# including nightly build to be able to compile -lgcc library
RUN rustup install nightly-x86_64-unknown-linux-gnu
RUN rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
RUN rustup component add rustfmt --toolchain nightly-x86_64-unknown-linux-gnu
