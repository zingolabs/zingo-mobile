#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
avd_device=`cat ./${output_dir}/target_avd_device.txt`
arch=`cat ./${output_dir}/target_arch.txt`
abi=`cat ./${output_dir}/target_abi.txt`

avd_name="${avd_device}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
platform="platforms;android-${api_level}"

./scripts/emulator_run.sh

./scripts/emulator_install_apk.sh

./scripts/emulator_launch_app.sh

# cd android

# output_dir="app/build/outputs/emulator_output"

# echo -e "\nChecking for AVD..."
# if [ $(emulator -list-avds | grep -ow "${avd_name}" | wc -w) -ne 1 ]; then
#     echo "Error: AVD not found" >&2
#     echo -e "\n\nTo create a quick-boot AVD snapshot use the '-s' flag" >&2
#     echo "Try '$(basename $0) -h' for more information." >&2
#     exit 1
# fi
# echo "AVD found: ${avd_name}"
    
# echo -e "\nRunning yarn install..."
# yarn install

# echo -e "\nBuilding APKs..."
# ./gradlew assembleDebug -Psplitapk=true

# echo -e "\n\nWaiting for emulator to launch..."
# emulator -avd "${avd_name}" -netdelay none -netspeed full -no-boot-anim -no-snapshot-save -read-only -port 5555 -gpu swiftshader_indirect |& tee "${output_dir}/emulator.txt" &
# wait_for $timeout_seconds check_launch
# echo "$(adb devices | grep "emulator-5555" | cut -f1) launch successful"

# echo -e "\nWaiting for AVD to boot..."
# wait_for $timeout_seconds check_boot
# wait_for $timeout_seconds check_device_online
# echo $(adb -s emulator-5555 emu avd name | head -1)
# echo "Device online" && sleep 1

# echo -e "\nInstalling APKs..."
# i=0
# step_complete=false
# until [[ $step_complete == true ]]; do
#     if adb -s emulator-5555 install -r -t -d --abi "${abi}" \
#             "app/build/outputs/apk/debug/app-${abi}-debug.apk" &> "${output_dir}/apk_installation.txt"; then
#         step_complete=true
#         echo "Successfully installed APKs"
#     fi              
#     if [[ $i -ge 100 ]]; then
#         echo "Error: Failed to install APKs" >&2
#         echo "For more information see 'android/${output_dir}/apk_installation.txt'" >&2
#         exit 1
#     fi
#     i=$((i+1))
#     sleep 1
# done

# # Store emulator info and start logging
# adb -s emulator-5555 shell getprop &> "${output_dir}/getprop.txt"
# adb -s emulator-5555 shell cat /proc/meminfo &> "${output_dir}/meminfo.txt"
# adb -s emulator-5555 shell cat /proc/cpuinfo &> "${output_dir}/cpuinfo.txt"
# nohup adb -s emulator-5555 shell logcat -v threadtime -b main &> "${output_dir}/logcat.txt" &

# # Start react-native
# if killall node &> /dev/null; then
#     echo -e "\nAll node processes killed."
#     echo -e "\nRestarting react native..."
# fi
# nohup yarn react-native start &> "${output_dir}/react_native.out" &
    
# echo -e "\nLaunching App..."
# adb shell am start -n "org.ZingoLabs.Zingo/org.ZingoLabs.Zingo.MainActivity" -a android.intent.action.MAIN \
#     -c android.intent.category.LAUNCHER &> "${output_dir}/launch_app.out"

# echo -e "\nTest reports saved: android/${output_dir}"        

