#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

avd_device="pixel_2"
set_abi=false
set_api_level=false
set_api_target=false
create_snapshot=false
valid_api_levels=("23" "24" "25" "26" "27" "28" "29" "30" "31" "32" , "34")
valid_api_targets=("default" "google_apis" "google_apis_playstore" "google_atd" "google-tv" \
    "aosp_atd" "android-tv" "android-desktop" "android-wear" "android-wear-cn")

while getopts 'a:l:t:h' OPTION; do
    case "$OPTION" in
        a)
            a="$OPTARG"
            case "$a" in
                x86_64)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86_64"
                    abi="x86_64"
                    ;;
                x86) 
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86"
                    abi="x86"
                    ;;
                xarm64-v8a)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86_64"
                    abi="arm64_v8a"
                    ;;
                xarmeabi-v7a)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="x86"
                    abi="armeabi-v7a"
                    ;;
                arm64-v8a)
                    api_level_default="30"
                    api_target_default="google_apis_playstore"
                    arch="arm64_v8a"
                    abi="arm64_v8a"
                    ;;
                armeabi-v7a)
                    api_level_default="25"
                    api_target_default="google_apis"
                    arch="armeabi-v7a"
                    abi="armeabi-v7a"
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
        h)
            echo -e "\nSets up target to emulate from the command line."
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
            echo -e "\nRecommended system images for testing ARM ABIs:"
            echo -e "  armeabi-v7a:"
            echo -e "    \"system-images;android-30;google_apis_playstore;x86\" - default"
            echo -e "    \"system-images;android-30;google-tv;x86\""
            # TODO: add list of supported images for arm64-v8a
            echo -e "\nFor a full list of system images run 'sdkmanager --list'"
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

output_dir="${PWD}/android/app/build/outputs/emulator_output"
mkdir -p "${output_dir}"

echo $abi > "${output_dir}/target_abi.txt"
echo $api_level > "${output_dir}/target_api_level.txt"
echo $api_target > "${output_dir}/target_api.txt"
echo $avd_device > "${output_dir}/target_avd_device.txt"
echo $arch > "${output_dir}/target_arch.txt"

