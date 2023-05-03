#!/bin/bash
set -Eeuo pipefail

avd_skin="pixel_2"

set_abi=false
set_api_level=false
set_api_target=false
create_snapshot=false
valid_api_levels=("23" "24" "25" "26" "27" "28" "29" "30" "31" "32" "33")
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

while getopts 'a:l:t:sx:h' OPTION; do
    case "$OPTION" in
        a)
            abi="$OPTARG"
            case "$abi" in
                x86_64)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86_64"
                    ;;
                x86) 
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86"
                    ;;
                arm64-v8a)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86_64"
                    ;;
                armeabi-v7a)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86"
                    ;;
                *)
                    echo "Error: Invalid ABI" >&2
                    echo "Try '$(basename $0) -h' for more information." >&2
                    exit 1
                    ;;
            esac
            set_abi=true
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
            echo -e "\nEmulate app from the command line. Requires Android Studio cmdline-tools."
            echo -e "\n  -a\t\tSelect ABI (required)"
            echo -e "      \t\t  Options:"
            echo -e "      \t\t  'x86_64' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'x86' - default system image: API 30 google_apis_playstore x86"
            echo -e "      \t\t  'arm64-v8a' - default system image: API 30 google_apis_playstore x86_64"
            echo -e "      \t\t  'armeabi-v7a' - default system image: API 30 google_apis_playstore x86"
            echo -e "\n  -l\t\tSelect API level (optional)"
            echo -e "      \t\t  Minimum API level: 23"
            echo -e "\n  -t\t\tSelect API target (optional)"
            echo -e "      \t\t  See examples on selecting system images below"
            echo -e "\n  -s\t\tCreate an AVD and snapshot for quick-boot (optional)"
            echo -e "      \t\t  Does not run app"
            echo -e "\n  -x\t\tSet timeout in seconds for emulator launch and AVD boot-up (optional)"
            echo -e "      \t\t  Default: 1800"
            echo -e "      \t\t  Must be an integer"
            echo -e "\nExamples:"
            echo -e "  '$(basename $0) -a x86_64 -s'\tCreates an AVD and quick-boot snapshot for x86_64 ABI"
            echo -e "  '$(basename $0) -a x86_64'   \tEmulates app for x86_64 ABI from snapshot"
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

# Set defaults
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
cd android

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;33.0.2' platform-tools

echo "Installing latest emulator..."
sdkmanager --install emulator --channel=0

echo "Installing system image..."
avd_name="${avd_skin}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
sdkmanager --install "${sdk}"
sdkmanager --licenses

# Kill all emulators
../scripts/kill_emulators.sh

if [[ $create_snapshot == true ]]; then
    echo -e "\nCreating AVD..."
    echo no | avdmanager create avd --force --name "${avd_name}" --package "${sdk}" --device "${avd_skin}"

    echo -e "\n\nWaiting for emulator to launch..."
    emulator -avd "${avd_name}" -netdelay none -netspeed full -no-window -no-audio -gpu host -no-boot-anim \
        -no-snapshot-load -port 5554 &> /dev/null &
    wait_for $timeout_seconds check_launch
    echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

    echo -e "\nWaiting for AVD to boot..."
    wait_for $timeout_seconds check_boot
    wait_for $timeout_seconds check_device_online
    echo $(adb -s emulator-5554 emu avd name | head -1)
    echo "Boot completed" && sleep 1
    echo -e "\nSnapshot saved"

    # Kill emulator
    ../scripts/kill_emulators.sh
else
    echo -e "\nChecking for AVD..."
    if [ $(emulator -list-avds | grep -ow "${avd_name}" | wc -w) -ne 1 ]; then
        echo "AVD not found"
        echo -e "\nCreating AVD..."
        echo no | avdmanager create avd --force --name "${avd_name}" --package "${sdk}" --device "${avd_skin}"
        echo -e "\n\nTo create a quick-boot snapshot use the '-s' flag"
        echo "Try '$(basename $0) -h' for more information."
    else
        echo "AVD found: ${avd_name}"
    fi
        
    echo -e "\nRunning yarn install..."
    yarn install

    echo -e "\nBuilding APKs..."
    ./gradlew assembleDebug -Psplitapk=true

    # Create integration test report directory
    test_report_dir="app/build/outputs/emulate_app_reports/${abi}"
    rm -rf "${test_report_dir}"
    mkdir -p "${test_report_dir}"

    echo -e "\n\nWaiting for emulator to launch..."
    emulator -avd "${avd_name}" -netdelay none -netspeed full -gpu host -no-boot-anim \
        -no-snapshot-save -read-only -port 5554 &> "${test_report_dir}/emulator.txt" &
    wait_for $timeout_seconds check_launch
    echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

    echo -e "\nWaiting for AVD to boot..."
    wait_for $timeout_seconds check_boot
    wait_for $timeout_seconds check_device_online
    echo $(adb -s emulator-5554 emu avd name | head -1)
    echo "Device online" && sleep 1

    echo -e "\nInstalling APKs..."
    i=0
    step_complete=false
    until [[ $step_complete == true ]]; do
        if adb -s emulator-5554 install -r -t -d --abi "${abi}" \
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
    adb -s emulator-5554 shell logcat -v threadtime -b main &> "${test_report_dir}/logcat.txt" &
    
    # Start react-native
    if killall node; then
        echo -e "\nAll node processes killed."
        echo -e "\nRestarting react native..."
    fi
    nohup yarn react-native start > "${test_report_dir}/react_native.out" &> /dev/null &
        
    echo -e "\nLaunching App..."
    nohup adb shell am start -n "org.ZingoLabs.Zingo/org.ZingoLabs.Zingo.MainActivity" -a android.intent.action.MAIN \
        -c android.intent.category.LAUNCHER > "${test_report_dir}/launch_app.out" &> /dev/null &

    echo -e "\nTest reports saved: android/${test_report_dir}"        
fi

