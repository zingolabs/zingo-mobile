#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

test_suite=$1
if [[ "${test_suite}" == "ALL" ]]; then
  test_suite="";
fi

killall node
nohup yarn react-native start &> "${output_dir}/react-native_start.txt" &

detox_target="android.emu.${arch}"
yarn detox build -c $detox_target
yarn detox test -c $detox_target $test_suite