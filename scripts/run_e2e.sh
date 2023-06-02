#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

killall node
nohup yarn react-native start &> "${output_dir}/react-native_start.txt" &

detox_target="android.emu.${arch}"
echo $detox_target
yarn detox build -c $detox_target
yarn detox test new_wallet -c $detox_target
