#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

timeout_seconds=180

echo "starting node reboot process" #dbg

function check_metro_server() {
    metro_status=$(cat ${output_dir}/react-native_start.txt | grep Metro)
    if [[ "${metro_status}" == *"Metro"* ]]; then
        return 0;
    else
        return 1;
    fi
}

function wait_for() {
    timeout_seconds=$1
    shift 1
    until [[ $timeout_seconds -le 0 ]] || ("$@" &> /dev/null); do
        sleep 1
        timeout_seconds=$(( timeout_seconds - 1 ))
    done
    if [[ $timeout_seconds -le 0 ]]; then
        echo -e "\nError: Timeout" >&2
        exit 1
    fi
}

if killall -9 node &> /dev/null; then
    echo -e "\nAll node processes killed."
    echo -e "\nRestarting react native..."
fi
nohup yarn react-native start &> "${output_dir}/react-native_start.txt" &

echo -e "\nWaiting for react-native/node/metro..."
wait_for $timeout_seconds check_metro_server
