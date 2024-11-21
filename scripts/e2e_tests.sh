#!/bin/bash
set -Eeuo pipefail

set_test_name=false
timeout_seconds=1800  # default timeout set to 30 minutes
api_level="30"
api_target="google_apis_playstore"
arch="x86_64"
device="pixel_7"

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

while getopts 'e:sx:h' OPTION; do
    case "$OPTION" in
        e)
            test_name="$OPTARG"
            set_test_name=true
            ;;
        x)
            timeout_seconds="$OPTARG"
            
            if [ -z "${timeout_seconds##*[!0-9]*}" ]; then
                echo "Error: Timeout must be an integer" >&2
                exit 1
            fi
            ;;
        h)
            echo -e "\nRun end-to-end tests. Requires Android SDK Command-line Tools."
            echo -e "\n  -e\t\tSelect test name"
            echo -e "\n  -x\t\tSet timeout in seconds for emulator launch and AVD boot-up (optional)"
            echo -e "      \t\t  Default: 1800"
            echo -e "      \t\t  Must be an integer"
            ;;
        ?)
            echo "Try '$(basename $0) -h' for more information." >&2
            exit 1
            ;;
    esac
done
if [[ $set_test_name == false ]]; then 
    echo "Error: Test not specified" >&2
    echo "Try '$(basename $0) -h' for more information." >&2
    exit 1
fi

# Setup working directory
cd $(git rev-parse --show-toplevel)

echo -e "\nRunning yarn install..."
# yarn global add node-gyp
yarn install

cd android

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;34.0.0' platform-tools

echo "Installing latest emulator..."
sdkmanager --install emulator --channel=0

echo "Installing system image..."
avd_name="${device}_api-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
sdkmanager --install "${sdk}"
echo y | sdkmanager --licenses

# Kill all emulators
../scripts/kill_emulators.sh

if [ $(emulator -list-avds | grep -ow "${avd_name}" | wc -w) -ne 1 ]; then
    echo -e "\nCreating AVD..."
    echo no | avdmanager create avd --force --name "${avd_name}" --package "${sdk}" --device "${device}"

    echo -e "\n\nWaiting for emulator to launch..."
    nohup emulator -avd "${avd_name}" -netdelay none -netspeed full -gpu swiftshader_indirect -no-boot-anim \
        -no-snapshot-load -port 5554 &> /dev/null &
    wait_for $timeout_seconds check_launch
    wait_for $timeout_seconds check_device_online
    echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

    echo -e "\nWaiting for AVD to boot..."
    wait_for $timeout_seconds check_boot
    echo $(adb -s emulator-5554 emu avd name | head -1)
    echo "Boot completed" 
    sleep 1
    echo -e "\nSnapshot saved"

    # Kill all emulators
    ../scripts/kill_emulators.sh
fi

# Create integration test report directory
test_report_dir="app/build/outputs/e2e_test_reports/${avd_name}"
rm -rf "${test_report_dir}"
mkdir -p "${test_report_dir}"

echo -e "\n\nWaiting for emulator to launch..."
nohup emulator -avd "${avd_name}" -netdelay none -netspeed full -gpu swiftshader_indirect -no-boot-anim \
    -no-snapshot-save -read-only -port 5554 &> "${test_report_dir}/emulator.txt" &
wait_for $timeout_seconds check_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for $timeout_seconds check_boot
wait_for $timeout_seconds check_device_online
echo $(adb -s emulator-5554 emu avd name | head -1)
echo "Device online"
sleep 1

# # Disable animations
# adb shell input keyevent 82
# adb shell settings put global window_animation_scale 0.0
# adb shell settings put global transition_animation_scale 0.0
# adb shell settings put global animator_duration_scale 0.0

# Store emulator info and start logging
adb -s emulator-5554 shell getprop &> "${test_report_dir}/getprop.txt"
adb -s emulator-5554 shell cat /proc/meminfo &> "${test_report_dir}/meminfo.txt"
adb -s emulator-5554 shell cat /proc/cpuinfo &> "${test_report_dir}/cpuinfo.txt"
nohup adb -s emulator-5554 shell logcat -v threadtime -b main &> "${test_report_dir}/logcat.txt" &

# Create additional test output directory
adb -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"
adb -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"

echo -e "\nRunning end-to-end tests..."
nohup yarn start &> "${test_report_dir}/metro.txt" &
yarn detox build -c android.att.debug
yarn detox test -c android.att.debug ${test_name}.test.js
success_status=$?

# Store additional test outputs
if [ -n "$(adb -s emulator-5554 shell ls -A /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output 2>/dev/null)" ]; then
    adb -s emulator-5554 shell cat /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output/* \
        &> "${test_report_dir}/additional_test_output.txt"
fi

echo -e "\nTest reports saved: android/${test_report_dir}"
    
if [ $success_status -ne 0 ]; then
    echo -e "\nEnd-to-end tests FAILED"

    # Kill all emulators
    ../scripts/kill_emulators.sh

    killall node

    exit 1
fi

echo -e "\nEnd-to-end tests PASSED"

# Kill all emulators
../scripts/kill_emulators.sh

killall node