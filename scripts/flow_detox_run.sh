#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

test_suite=$1
if [[ "${test_suite}" == "ALL" ]]; then
  test_suite="";
fi

echo 'going to react-native'
./scripts/node_reboot.sh
echo 'ran react-native'

detox_target="android.emu.${arch}"
echo 'ready to detox test ${detox_target} ${test_suite}'
yarn detox test -c $detox_target $test_suite
echo 'detox test'
