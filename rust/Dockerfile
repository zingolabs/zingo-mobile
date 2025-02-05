FROM zingodevops/android_builder:010 as build_android

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

#RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=aarch64-linux-android24-clang \
#    OPENSSL_DIR=/opt/openssl-3.3.1/aarch64 cargo +nightly build -Z build-std \
#    --target aarch64-linux-android --release
# this is for indexmap 1.9.3 -> forcing `features = ["std"]`
ENV CARGO_FEATURE_STD=true
RUN OPENSSL_DIR=/opt/openssl-3.3.1/aarch64 cargo ndk --target arm64-v8a build --release -Z build-std
RUN llvm-strip ../target/aarch64-linux-android/release/libzingo.so

#RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=x86_64-linux-android24-clang \
#    OPENSSL_DIR=/opt/openssl-3.3.1/x86_64 cargo +nightly build -Z build-std \
#    --target x86_64-linux-android --release
RUN OPENSSL_DIR=/opt/openssl-3.3.1/x86_64 cargo ndk --target x86_64 build --release -Z build-std
RUN llvm-strip ../target/x86_64-linux-android/release/libzingo.so

#RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=armv7a-linux-androideabi24-clang \
#    OPENSSL_DIR=/opt/openssl-3.3.1/armv7 cargo +nightly build -Z build-std \
#    --target armv7-linux-androideabi --release
RUN OPENSSL_DIR=/opt/openssl-3.3.1/armv7 cargo ndk --target armeabi-v7a build --release -Z build-std
RUN llvm-strip ../target/armv7-linux-androideabi/release/libzingo.so

#RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=i686-linux-android24-clang \
#    OPENSSL_DIR=/opt/openssl-3.3.1/x86 cargo +nightly build -Z build-std \
#    --target i686-linux-android --release
RUN OPENSSL_DIR=/opt/openssl-3.3.1/x86 cargo ndk --target x86 build --release -Z build-std
RUN llvm-strip ../target/i686-linux-android/release/libzingo.so
