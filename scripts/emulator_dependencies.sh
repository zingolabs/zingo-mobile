#!/bin/bash
set -e

source ./scripts/emulator_read_target.sh

sdkmanager --version &>> /dev/null
if [ ! $? -eq 0 ]; then
  echo "sdkmanager not found" >&2
  exit 1
fi

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;33.0.2' platform-tools emulator --channel=0 "${sdk}" "${platform}" |& tee "${output_dir}/emulator_dependencies.txt"
