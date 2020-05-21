#!/bin/bash

cd /tmp

FILE=openssl-1.1.1e.tar.gz
if [ -f "$FILE" ]; then
    echo "$FILE exists"
else 
    wget https://www.openssl.org/source/old/1.1.1/openssl-1.1.1e.tar.gz
    tar xvf openssl-1.1.1e.tar.gz
fi

cd openssl-1.1.1e/

rm -rf x86
mkdir x86

rm -rf armv7
mkdir armv7

rm -rf aarch64
mkdir aarch64

make clean
make distclean

#export ANDROID_NDK_HOME=/home/adityapk/Android/Sdk/ndk/20.1.5948944
#export PATH=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin:$ANDROID_NDK_HOME/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin:$PATH

# For Mac
export ANDROID_NDK_HOME=/Users/adityapk/Library/Android/sdk/ndk/20.1.5948944
export PATH=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin:$ANDROID_NDK_HOME/toolchains/arm-linux-androideabi-4.9/prebuilt/darwin-x86_64/bin:$PATH

./Configure --prefix=/tmp/openssl-1.1.1e/aarch64  android-arm64 -D__ANDROID_API__=26
make -j$(nproc)
make -j$(nproc) install

make clean
make distclean


./Configure --prefix=/tmp/openssl-1.1.1e/armv7  android-arm -D__ANDROID_API__=26
make -j$(nproc)
make -j$(nproc) install

make clean
make distclean


./Configure --prefix=/tmp/openssl-1.1.1e/x86  android-x86 -D__ANDROID_API__=26
make -j$(nproc)
make -j$(nproc) install

make clean
make distclean