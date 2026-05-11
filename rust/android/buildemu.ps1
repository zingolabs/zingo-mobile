# podman build --tag zingo/android:latest docker

podman run --rm -v ${PWD}/..:/opt/zingo zingo/android:latest bash -c "cd /opt/zingo/android && CC=i686-linux-android26-clang OPENSSL_DIR=/opt/openssl-1.1.1e/x86 cargo build --target i686-linux-android --release && i686-linux-android-strip ../target/i686-linux-android/release/librust.so"

cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
