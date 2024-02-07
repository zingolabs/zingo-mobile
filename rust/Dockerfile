FROM zingodevops/android_builder:008 as build_android

WORKDIR /opt/zingo/rust/android/

# add the local rust code into the container
COPY android/ /opt/zingo/rust/android/
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY ios/ /opt/zingo/rust/ios/
COPY zingomobile_utils/ /opt/zingo/rust/zingomobile_utils/

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=aarch64-linux-android24-clang \
    OPENSSL_DIR=/opt/openssl-3.1.3/aarch64 cargo +nightly build -Z build-std \
    --target aarch64-linux-android --release
RUN llvm-strip ../target/aarch64-linux-android/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=x86_64-linux-android24-clang \
    OPENSSL_DIR=/opt/openssl-3.1.3/x86_64 cargo +nightly build -Z build-std \
    --target x86_64-linux-android --release
RUN llvm-strip ../target/x86_64-linux-android/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=armv7a-linux-androideabi24-clang \
    OPENSSL_DIR=/opt/openssl-3.1.3/armv7 cargo +nightly build -Z build-std \
    --target armv7-linux-androideabi --release
RUN llvm-strip ../target/armv7-linux-androideabi/release/librust.so

RUN AR=llvm-ar LD=ld RANLIB=llvm-ranlib CC=i686-linux-android24-clang \
    OPENSSL_DIR=/opt/openssl-3.1.3/x86 cargo +nightly build -Z build-std \
    --target i686-linux-android --release
RUN llvm-strip ../target/i686-linux-android/release/librust.so
