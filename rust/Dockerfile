FROM zingodevops/android_builder:014 as build_android

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

RUN cargo install --version ^3 cargo-ndk

ENV RUSTFLAGS=" \
    --remap-path-prefix=$(pwd)=. \
    -C opt-level=z \
    -C debuginfo=0 \
    -C codegen-units=1 \
    -C link-arg=-Wl,--build-id=none,--sort-common \
    -C linker-plugin-lto=no"

# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
ENV OPENSSL_DIR=/opt/openssl-3.3.2/aarch64
RUN cargo ndk --target arm64-v8a build --release -Z build-std
RUN llvm-strip --strip-unneeded ../target/aarch64-linux-android/release/libzingo.so
RUN llvm-objcopy --remove-section .comment ../target/aarch64-linux-android/release/libzingo.so
RUN sha256sum ../target/aarch64-linux-android/release/libzingo.so

ENV OPENSSL_DIR=/opt/openssl-3.3.2/armv7
RUN cargo ndk --target armeabi-v7a build --release -Z build-std
RUN llvm-strip --strip-unneeded ../target/armv7-linux-androideabi/release/libzingo.so
RUN llvm-objcopy --remove-section .comment ../target/armv7-linux-androideabi/release/libzingo.so
RUN sha256sum ../target/armv7-linux-androideabi/release/libzingo.so

ENV OPENSSL_DIR=/opt/openssl-3.3.2/x86
RUN cargo ndk --target x86 build --release -Z build-std
RUN llvm-strip --strip-unneeded ../target/i686-linux-android/release/libzingo.so
RUN llvm-objcopy --remove-section .comment ../target/i686-linux-android/release/libzingo.so
RUN sha256sum ../target/i686-linux-android/release/libzingo.so

ENV OPENSSL_DIR=/opt/openssl-3.3.2/x86_64
RUN cargo ndk --target x86_64 build --release -Z build-std
RUN llvm-strip --strip-unneeded ../target/x86_64-linux-android/release/libzingo.so
RUN llvm-objcopy --remove-section .comment ../target/x86_64-linux-android/release/libzingo.so
RUN sha256sum ../target/x86_64-linux-android/release/libzingo.so
