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

# Setup working directory
if [ ! -d "./android/app" ];
then
    echo "Failed. Run './scripts/integration_tests.sh' from zingo-mobile root directory."
    exit 1
fi
cd android

rm -rf app/build/outputs/integration_test_reports
mkdir app/build/outputs/integration_test_reports

echo -e "\nBuilding APKs..."
./gradlew assembleDebug assembleAndroidtest

echo -e "\nDownloading system images..."
sdk="system-images;android-30;google_atd;arm64-v8a"
sdkmanager --install emulator --channel=3
sdkmanager --install $sdk --channel=3 
sdkmanager --licenses

echo -e "Creating AVDs..."
avdmanager create avd --force --name test_arm64-v8a --package $sdk --abi arm64-v8a

echo -e "\nWaiting for emulator to launch..."
emulator -avd test_arm64-v8a -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -read-only -no-boot-anim \
&> app/build/outputs/integration_test_reports/emulator.txt &
wait_for 6000 emulator_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for 6000 boot_complete
echo "Boot completed"
adb -H localhost -P 5037 -s emulator-5554 shell getprop &> app/build/outputs/integration_test_reports/getprop.txt

# Kill emulator
adb -s emulator-5554 emu kill
