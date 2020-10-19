FROM lakoo/android-ndk:latest

RUN curl https://sh.rustup.rs -sSf | \
    sh -s -- --default-toolchain none -y
ENV PATH=/root/.cargo/bin:/opt/android-ndk-linux/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH

RUN rustup toolchain install 1.46.0

RUN rustup target add i686-linux-android
RUN rustup target add armv7-linux-androideabi
RUN rustup target add aarch64-linux-android

RUN echo "[target.aarch64-linux-android]" >> ~/.cargo/config
RUN echo "ar = \"aarch64-linux-android-ar\"" >> ~/.cargo/config
RUN echo "linker = \"aarch64-linux-android24-clang\"" >> ~/.cargo/config
RUN echo "" >> ~/.cargo/config

RUN echo "[target.armv7-linux-androideabi]" >> ~/.cargo/config
RUN echo "ar = \"arm-linux-androideabi-ar\"" >> ~/.cargo/config
RUN echo "linker = \"armv7a-linux-androideabi24-clang\"" >> ~/.cargo/config
RUN echo "" >> ~/.cargo/config

RUN echo "[target.i686-linux-android]" >> ~/.cargo/config
RUN echo "ar = \"i686-linux-android-ar\"" >> ~/.cargo/config
RUN echo "linker = \"i686-linux-android24-clang\"" >> ~/.cargo/config
RUN echo "" >> ~/.cargo/config

RUN apt-get update 
RUN apt-get install -y gcc make automake build-essential

RUN cd /opt && wget https://www.openssl.org/source/old/1.1.1/openssl-1.1.1e.tar.gz && \
    tar xvf openssl-1.1.1e.tar.gz && cd openssl-1.1.1e && \
    mkdir x86 && mkdir aarch64 && mkdir armv7

RUN cd /opt/openssl-1.1.1e && \
    ./Configure --prefix=/opt/openssl-1.1.1e/aarch64  android-arm64 -D__ANDROID_API__=24 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-1.1.1e && \
    ./Configure --prefix=/opt/openssl-1.1.1e/armv7  android-arm -D__ANDROID_API__=24 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

RUN cd /opt/openssl-1.1.1e && \
    ./Configure --prefix=/opt/openssl-1.1.1e/x86  android-x86 -D__ANDROID_API__=24 && \
    make -j$(nproc) && make -j$(nproc) install && \
    make clean && make distclean

ENV OPENSSL_STATIC=yes
