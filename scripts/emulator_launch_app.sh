#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
avd_device=`cat ./${output_dir}/target_avd_device.txt`
arch=`cat ./${output_dir}/target_arch.txt`

avd_name="${avd_device}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"

# Store emulator info and start logging
adb -s emulator-5555 shell getprop &> "${output_dir}/getprop.txt"
adb -s emulator-5555 shell cat /proc/meminfo &> "${output_dir}/meminfo.txt"
adb -s emulator-5555 shell cat /proc/cpuinfo &> "${output_dir}/cpuinfo.txt"
nohup adb -s emulator-5555 shell logcat -v threadtime -b main &> "${output_dir}/logcat.txt" &

# Start react-native
if killall node &> /dev/null; then
    echo -e "\nAll node processes killed."
    echo -e "\nRestarting react native..."
fi
yarn react-native start |& tee "${output_dir}/react_native.txt" &
  
echo -e "\nLaunching App..."
adb shell am start -n "org.ZingoLabs.Zingo/org.ZingoLabs.Zingo.MainActivity" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER &> "${output_dir}/launch_app.txt"

echo -e "\nOutputs saved: ${output_dir}"        

