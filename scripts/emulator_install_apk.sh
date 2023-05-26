#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

source ./scripts/emulator_read_target.sh

echo -e "\nInstalling APKs..."
i=0
step_complete=false
until [[ $step_complete == true ]]; do
    if adb -s emulator-5554 install -r -t -d --abi "${abi}" "android/app/build/outputs/apk/debug/app-${abi}-debug.apk" &> "${output_dir}/emulator_install_apk.txt"; then
        step_complete=true
        echo "Successfully installed APKs"
    fi              
    if [[ $i -ge 100 ]]; then
        echo "Error: Failed to install APKs" >&2
        echo "For more information see '${output_dir}/emulator_install_apk.txt'" >&2
        exit 1
    fi
    i=$((i+1))
    sleep 1
done

