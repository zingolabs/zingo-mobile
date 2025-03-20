FROM registry.gitlab.com/fdroid/fdroidserver:buildserver-bookworm

WORKDIR /opt/zingo/rust/lib/

# add the local rust code into the container
COPY android/ /opt/zingo/rust/android/
COPY lib/ /opt/zingo/rust/lib/
COPY Cargo.lock /opt/zingo/rust/Cargo.lock
COPY Cargo.toml /opt/zingo/rust/Cargo.toml
COPY zingomobile_utils/ /opt/zingo/rust/zingomobile_utils/
COPY build_fdroid.sh /opt/zingo/rust/build_fdroid.sh

RUN ../build_fdroid.sh

RUN ls -la /opt/zingo/rust/target/x86_64-linux-android/release/libzingo.so
RUN ls -la /opt/zingo/rust/target/i686-linux-android/release/libzingo.so
RUN ls -la /opt/zingo/rust/target/armv7-linux-androideabi/release/libzingo.so
RUN ls -la /opt/zingo/rust/target/aarch64-linux-android/release/libzingo.so
RUN ls -la /opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt
RUN ls -la /opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt