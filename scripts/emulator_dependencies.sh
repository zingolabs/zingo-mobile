#!/bin/bash

output_dir="android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
arch=`cat ./${output_dir}/target_arch.txt`

sdk="system-images;android-${api_level};${api_target};${arch}"
platform="platforms;android-${api_level}"

sdkmanager --version &>> /dev/null
if [ ! $? -eq 0 ]; then
  echo "sdkmanager not found" >&2
  exit 1
fi

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;33.0.2' platform-tools emulator --channel=0 "${sdk}" "${platform}" |& tee "${output_dir}/emulator_dependencies.txt"
