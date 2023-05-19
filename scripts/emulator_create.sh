#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
avd_device=`cat ./${output_dir}/target_avd_device.txt`
arch=`cat ./${output_dir}/target_arch.txt`

avd_name="${avd_device}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"

sdkmanager --version &>> /dev/null
if [ ! $? -eq 0 ]; then
  echo "sdkmanager not found" >&2
  exit 1
fi

echo -e "\nCreating AVD..."
avdmanager create avd --force --name "${avd_name}" --package "${sdk}" --device "${avd_device}" |& tee "${output_dir}/emulator_create.txt"
