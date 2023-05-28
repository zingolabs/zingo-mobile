#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

source ./scripts/emulator_read_target.sh

echo -e "\nCreating AVD..."
avdmanager create avd --force --name "${avd_name}" --package "${sdk}" --device "${avd_device}" |& tee "${output_dir}/emulator_create.txt"

