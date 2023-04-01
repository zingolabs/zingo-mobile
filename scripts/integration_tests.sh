#!/bin/bash

function emulator_launch() {
  emu_status=$(adb devices | grep "emulator-5554" | cut -f1)
  if [ "${emu_status}" = "emulator-5554" ]
  then
      return 0;
  else
      return 1;
  fi
}

function boot_complete() {
  boot_status=$(adb -s emulator-5554 shell getprop sys.boot_completed)
  if [ "${boot_status}" = "1" ]
  then
      return 0;
  else
      return 1;
  fi
}

function wait_for() {
  timeout=$1
  shift 1
  until [ $timeout -le 0 ] || ("$@" &> /dev/null)
  do
      sleep 1
      timeout=$(( timeout - 1 ))
  done
  if [ $timeout -le 0 ]
  then
      echo -e "\nFailed due to timeout"
      exit 1
  fi
}

while getopts 'a:h' OPTION; do
    case "$OPTION" in
        a)
            abi="$OPTARG"
            case "$abi" in
                x86_64)
                    sdk="system-images;android-30;default;x86_64"                    
                    avd_target="default"
                    ;;
                x86) 
                    sdk="system-images;android-29;default;x86"                    
                    avd_target="default"
                    ;;
                *)
                    echo "Invalid ABI." >&2
                    echo "Try '$(basename $0) -h' for more information." >&2
                    exit 1
                    ;;
            esac
            ;;
        h)
            echo "Run integration tests."
            echo -e "\n  -a\t\tSelect target ABI (required)"
            echo -e "    \t\tOptions:"
            echo -e "    \t\tx86_64"
            echo -e "    \t\tx86"
            echo "Example:"
            echo "  $(basename $0) -a x86_64"
            exit 1
            ;;
        ?)
            echo "Try '$(basename $0) -h' for more information." >&2
            exit 1
            ;;
    esac
done
if [ $OPTIND -eq 1 ]
then 
    echo "Error: Required options missing" >&2
    echo "Try '$(basename $0) -h' for more information." >&2
    exit 1
fi

# Setup working directory
if [ ! -d "./android/app" ];
then
    echo "Failed. Run './scripts/integration_tests.sh' from zingo-mobile root directory."
    exit 1
fi
cd android

echo -e "\nBuilding APKs..."
./gradlew assembleDebug assembleAndroidtest

# Create integration test report directory
test_report_dir="app/build/outputs/integration_test_reports/${abi}"
rm -rf $test_report_dir
mkdir -p $test_report_dir

echo -e "\nInstalling latest build tools, platform tools, and platform..."
sdkmanager --install 'build-tools;33.0.2' platform-tools

echo -e "\nInstalling latest emulator..."
sdkmanager --install emulator --channel=0

echo -e "\nInstalling system images..."
sdkmanager --install $sdk
yes | sdkmanager --licenses

echo -e "Creating AVDs..."
echo no | avdmanager create avd --force --name "${avd_target}_${abi}" --package $sdk --abi "${avd_target}/${abi}"

echo -e "\n\nWaiting for emulator to launch..."
emulator -avd "${avd_target}_${abi}" -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -read-only -no-boot-anim \
&> "${test_report_dir}/emulator.txt" &
wait_for 600 emulator_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for 600 boot_complete
echo $(adb -s emulator-5554 emu avd name | head -1)
echo "Boot completed"

# Disable animations
adb shell input keyevent 82
adb shell settings put global window_animation_scale 0.0
adb shell settings put global transition_animation_scale 0.0
adb shell settings put global animator_duration_scale 0.0

echo -e "\nInstalling APKs..."
adb -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Store emulator info and start logging
adb -s emulator-5554 shell getprop &> "${test_report_dir}/getprop.txt"
adb -s emulator-5554 shell cat /proc/meminfo &> "${test_report_dir}/meminfo.txt"
adb -s emulator-5554 shell cat /proc/cpuinfo &> "${test_report_dir}/cpuinfo.txt"
adb -s emulator-5554 shell logcat -v threadtime -b main &> "${test_report_dir}/logcat.txt" &

# Create additional test output directory
adb -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"
adb -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"

echo -e "\nRunning integration tests..."
adb -s emulator-5554 shell am instrument -w -r -e class org.ZingoLabs.Zingo.IntegrationTestSuite \
-e additionalTestOutputDir /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output \
-e testTimeoutSeconds 31536000 org.ZingoLabs.Zingo.test/androidx.test.runner.AndroidJUnitRunner \
| tee "${test_report_dir}/test_results.txt"

# Store additional test outputs
if [ -n "$(adb -s emulator-5554 shell ls -A /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output 2>/dev/null)" ]
then
    adb -s emulator-5554 shell cat /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output/* \
    &> "${test_report_dir}/additional_test_output.txt"
fi

# Kill emulator
adb -s emulator-5554 emu kill

echo -e "\nTest reports saved: zingo-mobile/android/${test_report_dir}"
