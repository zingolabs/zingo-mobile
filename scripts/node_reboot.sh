#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

for i in 1 2 3 4 5; do
    if killall -9 node &> /dev/null; then
        echo -e "\nAll node processes killed."
        echo -e "Restarting react native..."
    fi
    nohup yarn react-native start &> "${output_dir}/react-native_start.txt" &

    echo -e "Starting react-native/node/metro..."
    sleep 5
    metro_status=$(cat ${output_dir}/react-native_start.txt | grep Metro)
    if [[ "${metro_status}" == *"Metro"* ]]; then
        break
    else
        echo -e "react-native/node/metro. did not launch. Rebooting"
    fi
done
# wait_for $timeout_seconds check_metro_server
