#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

test_suite=$1
if [[ "${test_suite}" == "ALL" ]]; then
  test_suite="";
fi

./scripts/yarn_react-native_node_server.sh

detox_target="android.emu.${arch}"
yarn detox build -c $detox_target
yarn detox test -c $detox_target $test_suite
