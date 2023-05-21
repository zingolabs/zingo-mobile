#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
avd_device=`cat ./${output_dir}/target_avd_device.txt`
arch=`cat ./${output_dir}/target_arch.txt`

avd_name="${avd_device}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
platform="platforms;android-${api_level}"
timeout_seconds=1800  # default timeout set to 30 minutes

function check_launch() {
    emulator_status=$(adb devices | grep "emulator-5555" | cut -f1)
    if [ "${emulator_status}" = "emulator-5555" ]; then
        return 0;
    else
        return 1;
    fi
}

function check_boot() {
    boot_status=$(adb -s emulator-5555 shell getprop sys.boot_completed)
    if [ "${boot_status}" = "1" ]; then
        return 0;
    else
        return 1;
    fi
}

function check_device_online() {
    device_status=$(adb devices | grep emulator-5555 | cut -f2)
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

echo -e "\n\nWaiting for emulator to launch..."
emulator -avd "${avd_name}" -netdelay none -netspeed full -no-boot-anim -no-snapshot-save -read-only -port 5555 |& tee "${output_dir}/emulator_run.txt" &

wait_for $timeout_seconds check_launch
echo "$(adb devices | grep "emulator-5555" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for $timeout_seconds check_boot
wait_for $timeout_seconds check_device_online
echo $(adb -s emulator-5555 emu avd name | head -1)
echo "Device online" && sleep 1

