#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

source ./scripts/emulator_read_target.sh

timeout_seconds=1800  # default timeout set to 30 minutes

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
    until [ $timeout_seconds -le 0 ] || ("$@" &> /dev/null); do
        sleep 1
        timeout_seconds=$(( timeout_seconds - 1 ))
    done
    if [ $timeout_seconds -le 0 ]; then
        echo -e "\nError: Timeout" >&2
        exit 1
    fi
}

# Store emulator info and start logging
adb -s emulator-5554 shell getprop &> "${output_dir}/getprop.txt"
adb -s emulator-5554 shell cat /proc/meminfo &> "${output_dir}/meminfo.txt"
adb -s emulator-5554 shell cat /proc/cpuinfo &> "${output_dir}/cpuinfo.txt"
adb -s emulator-5554 shell logcat -v threadtime -b main &> "${output_dir}/logcat.txt" &

# Start react-native
./scripts/node_reboot.sh

echo -e "\nWaiting for react-native/node/metro..."
wait_for $timeout_seconds check_metro_server

echo -e "\nLaunching App..."
adb shell am start -n "org.ZingoLabs.Zingo/org.ZingoLabs.Zingo.MainActivity" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER &> "${output_dir}/launch_app.txt"

echo -e "\nOutputs saved: ${output_dir}"        

