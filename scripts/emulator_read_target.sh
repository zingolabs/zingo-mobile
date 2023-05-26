#!/bin/bash

# this script needs to be run with export to work.

gbd=`git rev-parse --show-toplevel`
output_dir="${gbd}/android/app/build/outputs/emulator_output"

api_level=`cat ./${output_dir}/target_api_level.txt`
api_target=`cat ./${output_dir}/target_api.txt`
avd_device=`cat ./${output_dir}/target_avd_device.txt`
arch=`cat ./${output_dir}/target_arch.txt`
abi=`cat ./${output_dir}/target_abi.txt`

avd_name="${avd_device}-android-${api_level}_${api_target}_${arch}"
sdk="system-images;android-${api_level};${api_target};${arch}"
platform="platforms;android-${api_level}"

