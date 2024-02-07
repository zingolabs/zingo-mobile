#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh
timeout_seconds=1800  # default timeout set to 30 minutes

function check_launch() {
    emulator_status=$(adb devices | grep "emulator-5554" | cut -f1)
    if [ "${emulator_status}" = "emulator-5554" ]; then
        return 0;
    else
        return 1;
    fi
}

function check_boot() {
    boot_status=$(adb -s emulator-5554 shell getprop sys.boot_completed)
    if [ "${boot_status}" = "1" ]; then
        return 0;
    else
        return 1;
    fi
}

function check_device_online() {
    device_status=$(adb devices | grep emulator-5554 | cut -f2)
    if [ "${device_status}" = "offline" ]; then
        return 1;
    fi
    return 0;
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

./scripts/kill_emulators.sh

echo -e "\n\nWaiting for emulator to launch..."
nohup emulator -avd "${avd_name}" -netdelay none -netspeed full -no-boot-anim -no-snapshot-save -read-only -port 5554 &> "${output_dir}/emulator_boot.txt" &

adb kill-server
adb start-server

wait_for $timeout_seconds check_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for $timeout_seconds check_boot
wait_for $timeout_seconds check_device_online
echo $(adb -s emulator-5554 emu avd name | head -1)
echo "Device online" && sleep 1

