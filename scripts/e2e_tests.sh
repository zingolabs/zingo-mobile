#!/bin/bash
set -Eeuo pipefail

#data which unfortunately bash cant get from the other process
avd_skin="pixel_2"

set_abi=false
set_api_level=false
set_api_target=false
create_snapshot=false
valid_api_levels=("23" "24" "25" "26" "27" "28" "29" "30" "31" "32" "33")
valid_api_targets=("default" "google_apis" "google_apis_playstore" "google_atd" "google-tv" \
    "aosp_atd" "android-tv" "android-desktop" "android-wear" "android-wear-cn")
timeout_seconds=1800  # default timeout set to 30 minutes
reboot_emulator=false

#processing options
abi_option=" -a x86"
api_level_option=""
api_target_option=""
create_snapshot_option=""
timeout_seconds_option=""
while getopts 'e:ba:l:t:sx:h' OPTION; do
    case "$OPTION" in
        e)
            tests_to_run="$OPTARG"
            ;;
        b)
            reboot_emulator=true
            ;;
        a)
            abi="$OPTARG"
            case "$abi" in
                x86_64)
                    api_level="30"
                    api_target="google_apis_playstore"
                    arch="x86_64"
                    ;;
                x86) 
                    api_level="30"
                    api_target="google_apis_playstore"
                    arch="x86"
                    ;;
                arm64-v8a)
                    api_level="30"
                    api_target="google_apis_playstore"
                    arch="x86_64"
                    ;;
                armeabi-v7a)
                    api_level="30"
                    api_target="google_apis_playstore"
                    arch="x86"
                    ;;
                *)
                    echo "Error: Invalid ABI" >&2
                    echo "Try '$(basename $0) -h' for more information." >&2
                    exit 1
                    ;;
            esac
            ;;
        l)
            api_level="$OPTARG"
            ;;
        t)
            api_target="$OPTARG"
            ;;
        s)  
            create_snapshot=true
            create_snapshot_option=" -s"
            ;;
        x)
            timeout_seconds="$OPTARG"
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

#setting variables
if [ ! -d "./android/app" ]; then
    echo "Error: Incorrect working directory" >&2
    echo "Try './scripts/$(basename $0)' from zingo-mobile root directory." >&2
    exit 1
fi

test_report_dir="app/build/outputs/emulate_app_reports/${abi}"
rm -rf "${test_report_dir}"
mkdir -p "${test_report_dir}"

avd_name="${avd_skin}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
platform="platforms;android-${api_level}"

# "preparing emulator"
if ! (adb devices | grep emulator-5554) || "${reboot_emulator}"; then
  emulate_command="./scripts/emulate_app.sh -a ${abi} -l ${api_level} -t ${api_target}${create_snapshot_option} -x ${timeout_seconds} -Y"
  echo $emulate_command
  $emulate_command
else
  if killall node; then
    echo -e "\nAll node processes killed."
    echo -e "Restarting react native..."
  fi
  nohup yarn react-native start > "${test_report_dir}/react_native.out" &> /dev/null &
fi

detox_build_command="yarn detox build -c android.emu.debug -n ${avd_name}"
echo $detox_build_command
$detox_build_command

detox_run_command="yarn detox test -c android.emu.debug -n ${avd_name} ${tests_to_run}"
echo $detox_run_command
$detox_run_command
