#!/bin/bash
set -Eeuo pipefail

set_abi=false
set_test_name=false
test_name_default="OfflineTestSuite"
timeout_seconds=1800  # default timeout set to 30 minutes

while getopts 'a:e:x:h' OPTION; do
    case "$OPTION" in
        a)
            abi="$OPTARG"
            set_abi=true
            ;;
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
            echo -e "\nRun e2e tests. Requires Android SDK Command-line Tools."
            echo -e "\n  -a\t\tSelect ABI (required)"
            echo -e "      \t\t  Options:"
            echo -e "      \t\t  'x86_64' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'x86' - default system image: API 30 google_apis_playstore x86"
            echo -e "      \t\t  'arm64-v8a' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'armeabi-v7a' - default system image: API 30 google_apis_playstore x86"
            echo -e "\n  -e\t\tSelect test name or test suite (optional)"
            echo -e "      \t\t  Default: OfflineTestSuite"
            echo -e "\n  -x\t\tSet timeout in seconds for emulator launch and AVD boot-up (optional)"
            echo -e "      \t\t  Default: 1800"
            echo -e "      \t\t  Must be an integer"
            echo -e "\nFor a full list of system images run 'sdkmanager --list'"
            exit 1
            ;;
        ?)
            echo "Try '$(basename $0) -h' for more information." >&2
            exit 1
            ;;
    esac
done
if [[ $set_abi == false ]]; then 
    echo "Error: ABI not specified" >&2
    echo "Try '$(basename $0) -h' for more information." >&2
    exit 1
fi

# Set defaults
if [[ $set_test_name == false ]]; then
    test_name=$test_name_default
fi

# Setup working directory
if [ ! -d "./android/app" ]; then
    echo "Error: Incorrect working directory" >&2
    echo "Try './scripts/$(basename $0)' from zingo-mobile root directory." >&2
    exit 1
fi

cd android

# Create e2e test report directory
test_report_dir="app/build/outputs/e2e_test_reports/${abi}"
rm -rf "${test_report_dir}"
mkdir -p "${test_report_dir}"

echo -e "\nInstalling Test APK..."
i=0
step_complete=false
until [[ $step_complete == true ]]; do
    if adb -s emulator-5554 install -r -t -d \
            "app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk" &> "${test_report_dir}/apk_installation.txt"; then
        step_complete=true
        echo "Successfully installed Test APK"
    fi              
    if [[ $i -ge 100 ]]; then
        echo "Error: Failed to install Test APK" >&2
        echo "For more information see 'android/${test_report_dir}/apk_installation.txt'" >&2
        exit 1
    fi
    i=$((i+1))
    sleep 1
done

echo -e "\nInstalling ABI APK..."
i=0
step_complete=false
until [[ $step_complete == true ]]; do
    if adb -s emulator-5554 install -r -t -d --abi "${abi}" \
            "app/build/outputs/apk/debug/app-${abi}-debug.apk" &> "${test_report_dir}/apk_installation.txt"; then
        step_complete=true
        echo "Successfully installed ABI APK"
    fi              
    if [[ $i -ge 100 ]]; then
        echo "Error: Failed to install ABI APK" >&2
        echo "For more information see 'android/${test_report_dir}/apk_installation.txt'" >&2
        exit 1
    fi
    i=$((i+1))
    sleep 1
done

# Store emulator info and start logging
adb -s emulator-5554 shell getprop &> "${test_report_dir}/getprop.txt"
adb -s emulator-5554 shell cat /proc/meminfo &> "${test_report_dir}/meminfo.txt"
adb -s emulator-5554 shell cat /proc/cpuinfo &> "${test_report_dir}/cpuinfo.txt"
nohup adb -s emulator-5554 shell logcat -v threadtime -b main &> "${test_report_dir}/logcat.txt" &

# Create additional test output directory
adb -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_e2e_test_output"
adb -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_e2e_test_output"

echo -e "\nRunning e2e tests..."
nohup yarn start &> "${test_report_dir}/metro.txt" &
yarn detox test -c android.att.debug.${abi} ${test_name}.test.js --reuse
success_status=$?

# Store additional test outputs
if [ -n "$(adb -s emulator-5554 shell ls -A /sdcard/Android/media/org.ZingoLabs.Zingo/additional_e2e_test_output 2>/dev/null)" ]; then
    adb -s emulator-5554 shell cat /sdcard/Android/media/org.ZingoLabs.Zingo/additional_e2e_test_output/* \
        &> "${test_report_dir}/additional_e2e_test_output.txt"
fi

echo -e "\nTest reports saved: android/${test_report_dir}"
    
if [ $success_status -ne 0 ]; then
    echo -e "\ne2e tests FAILED"

    # Kill all emulators
    ../scripts/kill_emulators.sh

    exit 1
fi

echo -e "\ne2e tests PASSED"

# Kill all emulators
../scripts/kill_emulators.sh