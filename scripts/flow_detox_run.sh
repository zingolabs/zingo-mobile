#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

test_suite=$1
if [[ "${test_suite}" == "ALL" ]]; then
  test_suite="";
fi

detox_target="android.emu.${arch}"
echo 'ready to detox test ${detox_target} ${test_suite}' #dbg
yarn detox test -c $detox_target $test_suite
echo 'detox test' #dbg
