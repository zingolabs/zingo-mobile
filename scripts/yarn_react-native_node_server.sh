#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

if killall -9 node &> /dev/null; then
    echo -e "\nAll node processes killed."
    echo -e "\nRestarting react native..."
fi
nohup yarn react-native start &> "${output_dir}/react-native_start.txt" &
