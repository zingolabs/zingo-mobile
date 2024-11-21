#!/bin/bash
set -Eeuo pipefail

set_abi=false
set_test_name=false
set_api_level=false
set_api_target=false
intel_host_os=true
create_snapshot=false
test_name_default="OfflineTestSuite"
valid_api_levels=("23" "24" "25" "26" "27" "28" "29" "30" "31" "32" "33" "34")
valid_api_targets=("default" "google_apis" "google_apis_playstore" "google_atd" "google-tv" \
    "aosp_atd" "android-tv" "android-desktop" "android-wear" "android-wear-cn")
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

while getopts 'a:Al:e:t:sx:h' OPTION; do
    case "$OPTION" in
        a)
            abi="$OPTARG"
            set_abi=true
            ;;
        A)
            intel_host_os=false
            ;;
        e)
            test_name="$OPTARG"
            set_test_name=true
            ;;
        l)
            api_level="$OPTARG"

            # Check API level is valid
            # tr -d '-' is used to remove all hyphons as they count as word boundaries for grep
            if [[ $(echo ${valid_api_levels[@]} | tr -d '-' | grep -ow "$(echo ${api_level} | tr -d '-')" | wc -w) != 1 ]]; then
                echo "Error: Invalid API level" >&2
                echo "Try '$(basename $0) -h' for more information." >&2
                exit 1
            fi
                        
            set_api_level=true
            ;;
        t)
            api_target="$OPTARG"

            # Check API target is valid
            # tr -d '-' is used to remove all hyphons as they count as word boundaries for grep
            if [[ $(echo ${valid_api_targets[@]} | tr -d '-' | grep -ow "$(echo ${api_target} | tr -d '-')" | wc -w) != 1 ]]; then
                echo "Error: Invalid API target" >&2
                echo "Try '$(basename $0) -h' for more information." >&2
                exit 1
            fi
                        
            set_api_target=true
            ;;
        s)
            create_snapshot=true
            ;;
        x)
            timeout_seconds="$OPTARG"
            
            if [ -z "${timeout_seconds##*[!0-9]*}" ]; then
                echo "Error: Timeout must be an integer" >&2
                exit 1
            fi
            ;;
        h)
            echo -e "\nRun integration tests. Requires Android SDK Command-line Tools."
            echo -e "\n  -a\t\tSelect ABI (required)"
            echo -e "      \t\t  Options:"
            echo -e "      \t\t  'x86_64' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'x86' - default system image: API 30 google_apis_playstore x86"
            echo -e "      \t\t  'arm64-v8a' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'armeabi-v7a' - default system image: API 30 google_apis_playstore x86"
            echo -e "\n  -A\t\tSets default system image of arm abis to arm instead of x86 (optional)"
            echo -e "      \t\t  Use this option if the host OS is arm"
            echo -e "\n  -e\t\tSelect test name or test suite (optional)"
            echo -e "      \t\t  Default: OfflineTestSuite"
            echo -e "\n  -l\t\tSelect API level (optional)"
            echo -e "      \t\t  Minimum API level: 23"
            echo -e "\n  -t\t\tSelect API target (optional)"
            echo -e "      \t\t  See examples on selecting system images below"
            echo -e "\n  -s\t\tCreate an AVD and snapshot for quick-boot (optional)"
            echo -e "      \t\t  Does not run integration tests"
            echo -e "\n  -x\t\tSet timeout in seconds for emulator launch and AVD boot-up (optional)"
            echo -e "      \t\t  Default: 1800"
            echo -e "      \t\t  Must be an integer"
            echo -e "\nExamples:"
            echo -e "  '$(basename $0) -a x86_64 -s'\tCreates an AVD and quick-boot snapshot for x86_64 ABI"
            echo -e "  '$(basename $0) -a x86_64'   \tRuns integration tests for x86_64 ABI from snapshot"
            echo -e "  '$(basename $0) -a x86 -l 29 -t google_apis'"
            echo -e "                             \t\tSelect system image \"system-images;android-29;google_apis;x86\""
            echo -e "\nRecommended system images for testing ARM ABIs:"
            echo -e "  armeabi-v7a:"
            echo -e "    \"system-images;android-30;google_apis_playstore;x86\" - default"
            echo -e "    \"system-images;android-30;google-tv;x86\""
            # TODO: add list of supported images for arm64-v8a
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

case "$abi" in
    x86_64)
        api_level_default="30"
        api_target_default="google_apis_playstore"
        if [ $intel_host_os == true ]; then       
            arch="x86_64"
        else
            arch="arm64-v8a"
        fi
        ;;
    x86) 
        api_level_default="30"
        api_target_default="google_apis_playstore"
        if [ $intel_host_os == true ]; then       
            arch="x86"
        else
            arch="arm64-v8a"
        fi
        ;;
    arm64-v8a)
        api_level_default="30"
        api_target_default="google_apis_playstore"
        if [ $intel_host_os == true ]; then       
            arch="x86_64"
        else
            arch="arm64-v8a"
        fi
        ;;
    armeabi-v7a)
        api_level_default="30"
        api_target_default="google_apis_playstore"
        if [ $intel_host_os == true ]; then       
            arch="x86"
        else
            arch="arm64-v8a"
        fi
        ;;
    *)
        echo "Error: Invalid ABI" >&2
        echo "Try '$(basename $0) -h' for more information." >&2
        exit 1
        ;;
esac

# Set defaults
if [[ $set_test_name == false ]]; then
    test_name=$test_name_default
fi
if [[ $set_api_level == false ]]; then
    api_level=$api_level_default
fi
if [[ $set_api_target == false ]]; then
    api_target=$api_target_default
fi

# Setup working directory
if [ ! -d "./android/app" ]; then
    echo "Error: Incorrect working directory" >&2
    echo "Try './scripts/$(basename $0)' from zingo-mobile root directory." >&2
    exit 1
fi

echo -e "\nYarn install directory removed..."
rm -rf ./node_modules

echo -e "\nRunning yarn install..."
yarn global add node-gyp
yarn install

cd android

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;34.0.0' platform-tools

echo "Installing latest emulator..."
sdkmanager --install emulator --channel=0

echo "Installing system image..."
avd_name="android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
sdkmanager --install "${sdk}"
echo y | sdkmanager --licenses

# Kill all emulators
../scripts/kill_emulators.sh

if [[ $create_snapshot == true ]]; then
    echo -e "\nCreating AVD..."
    echo no | avdmanager create avd --force --name "${avd_name}" --package "${sdk}"

    echo -e "\n\nWaiting for emulator to launch..."
    nohup emulator -avd "${avd_name}" -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -no-boot-anim \
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
else
    echo -e "\nChecking for AVD..."
    if [ $(emulator -list-avds | grep -ow "${avd_name}" | wc -w) -ne 1 ]; then
        echo "AVD not found"
        echo -e "\nCreating AVD..."
        echo no | avdmanager create avd --force --name "${avd_name}" --package "${sdk}"
        echo -e "\n\nTo create a quick-boot snapshot for faster integration tests use the '-s' flag"
        echo "Try '$(basename $0) -h' for more information."
    else
        echo "AVD found: ${avd_name}"
    fi

    echo -e "\nBuilding APKs..."
    ./gradlew assembleDebug assembleAndroidTest -PsplitApk=true

    # Create integration test report directory
    test_report_dir="app/build/outputs/integration_test_reports/${abi}"
    rm -rf "${test_report_dir}"
    mkdir -p "${test_report_dir}"

    echo -e "\n\nWaiting for emulator to launch..."
    nohup emulator -avd "${avd_name}" -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -no-boot-anim \
        -no-snapshot-save -read-only -port 5554 &> "${test_report_dir}/emulator.txt" &
    wait_for $timeout_seconds check_launch
    echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

    echo -e "\nWaiting for AVD to boot..."
    wait_for $timeout_seconds check_boot
    wait_for $timeout_seconds check_device_online
    echo $(adb -s emulator-5554 emu avd name | head -1)
    echo "Device online"
    sleep 1

    # Disable animations
    adb shell input keyevent 82
    adb shell settings put global window_animation_scale 0.0
    adb shell settings put global transition_animation_scale 0.0
    adb shell settings put global animator_duration_scale 0.0

    echo -e "\nInstalling APKs..."
    i=0
    step_complete=false
    until [[ $step_complete == true ]]; do
        if adb -s emulator-5554 install-multi-package -r -t -d --abi "${abi}" \
                "app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk" \
                "app/build/outputs/apk/debug/app-${abi}-debug.apk" &> "${test_report_dir}/apk_installation.txt"; then
            step_complete=true
            echo "Successfully installed APKs"
        fi              
        if [[ $i -ge 100 ]]; then
            echo "Error: Failed to install APKs" >&2
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
    adb -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"
    adb -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"

    echo -e "\nRunning integration tests..."
    adb -s emulator-5554 shell am instrument -w -r -e class org.ZingoLabs.Zingo.$test_name \
        -e additionalTestOutputDir /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output \
        -e testTimeoutSeconds 31536000 org.ZingoLabs.Zingo.test/androidx.test.runner.AndroidJUnitRunner \
        | tee "${test_report_dir}/test_results.txt"

    # Store additional test outputs
    if [ -n "$(adb -s emulator-5554 shell ls -A /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output 2>/dev/null)" ]; then
        adb -s emulator-5554 shell cat /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output/* \
            &> "${test_report_dir}/additional_test_output.txt"
    fi

    echo -e "\nTest reports saved: android/${test_report_dir}"
        
    if [[ $(cat "${test_report_dir}/test_results.txt" | grep INSTRUMENTATION_CODE | cut -d' ' -f2) -ne -1 || \
            $(cat "${test_report_dir}/test_results.txt" | grep 'FAILURES!!!') ]]; then
        echo -e "\nIntegration tests FAILED"

        # Kill all emulators
        ../scripts/kill_emulators.sh

        exit 1
    fi

    echo -e "\nIntegration tests PASSED"
fi

# Kill all emulators
../scripts/kill_emulators.sh