#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

detox_target="android.emu.${arch}"
echo 'ready to detox build'  #dbg
yarn detox build -c $detox_target
echo 'detox built'  #dbg
