#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

timeout_seconds=180  # default timeout set to 30 minutes

# Store emulator info and start logging
adb -s emulator-5554 shell getprop &> "${output_dir}/getprop.txt"
adb -s emulator-5554 shell cat /proc/meminfo &> "${output_dir}/meminfo.txt"
adb -s emulator-5554 shell cat /proc/cpuinfo &> "${output_dir}/cpuinfo.txt"
adb -s emulator-5554 shell logcat -v threadtime -b main &> "${output_dir}/logcat.txt" &

# Start react-native
./scripts/node_reboot.sh

echo -e "\nLaunching App..."
adb shell am start -n "org.ZingoLabs.Zingo/org.ZingoLabs.Zingo.MainActivity" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER &> "${output_dir}/launch_app.txt"

echo -e "\nOutputs saved: ${output_dir}"        

