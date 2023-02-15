#! /usr/bin/env bash

cd rust
./build.sh
cd ..
yarn install
yarn detox build -c android.emu.debug
killall node
nohup yarn react-native start &
yarn detox test -c android.emu.debug
killall node
