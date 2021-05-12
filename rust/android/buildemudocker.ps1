# docker build --tag zecwalletmobile/android:latest docker

docker run --rm -v ${PWD}/..:/opt/zecwalletmobile zecwalletmobile/android:latest bash -c "
    cd /opt/zecwalletmobile/android && \
    CC=i686-linux-android24-clang OPENSSL_DIR=/opt/openssl-1.1.1e/x86 cargo build --target i686-linux-android --release && i686-linux-android-strip ../target/i686-linux-android/release/librust.so"


cp ../target/i686-linux-android/release/librust.so   ../../android/app/src/main/jniLibs/x86/
