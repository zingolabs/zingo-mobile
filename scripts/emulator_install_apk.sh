#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

abi=`cat ./${output_dir}/target_abi.txt`

adb -s emulator-5554 install -r -t -d --abi "${abi}" "android/app/build/outputs/apk/debug/app-${abi}-debug.apk" |& tee "${output_dir}/emulator_install_apk.txt"

echo -e "\nInstalling APKs..."
i=0
step_complete=false
until [[ $step_complete == true ]]; do
    if adb -s emulator-5554 install -r -t -d --abi "${abi}" "android/app/build/outputs/apk/debug/app-${abi}-debug.apk" |& tee "${output_dir}/emulator_install_apk.txt"; then
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

