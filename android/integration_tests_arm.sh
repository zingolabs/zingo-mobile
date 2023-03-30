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

# Gradle managed devices integration test
# ./gradlew x86_ArchsGroupDebugAndroidTest \
# -Pandroid.testoptions.manageddevices.emulator.gpu=swiftshader_indirect \
# -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.IntegrationTestSuite

# ADB integration test
rm -rf app/build/outputs/integration_test_reports
mkdir app/build/outputs/integration_test_reports

echo -e "\nBuilding APKs..."
./gradlew assembleDebug assembleAndroidtest

echo -e "\nDownloading system images..."
sdkmanager --install "system-images;android-30;default;arm64-v8a"
sdkmanager --licenses

echo -e "Creating AVDs..."
avdmanager create avd --force --name pixel2_arm64-v8a --package "system-images;android-30;default;arm64-v8a" --device pixel_2 --abi arm64-v8a

echo -e "\nWaiting for emulator to launch..."
emulator -avd pixel2_arm64-v8a -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -read-only -no-boot-anim \
&> app/build/outputs/integration_test_reports/emulator.txt &
wait_for 6000 emulator_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for 6000 boot_complete
echo "Boot completed"
adb -H localhost -P 5037 -s emulator-5554 shell getprop &> app/build/outputs/integration_test_reports/getprop.txt

# echo -e "\nInstalling APKs..."
# adb -H localhost -P 5037 -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# adb -H localhost -P 5037 -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/debug/app-debug.apk

# echo -e "\nStoring emulator info..."
# adb -H localhost -P 5037 -s emulator-5554 shell cat /proc/meminfo &> app/build/outputs/integration_test_reports/meminfo.txt
# adb -H localhost -P 5037 -s emulator-5554 shell cat /proc/cpuinfo &> app/build/outputs/integration_test_reports/cpuinfo.txt

# echo -e "\nLogging..."
# log_date=$(adb -H localhost -P 5037 -s emulator-5554 shell date "+%m-%d %H:%M:%S")
# echo "$log_date"
# adb -H localhost -P 5037 -s emulator-5554 shell logcat -v threadtime -b main -T $log_date

# echo -e "\nCreating additional test output directory..."
# adb -H localhost -P 5037 -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"
# adb -H localhost -P 5037 -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"

# echo -e "\nRunning integration tests..."
# adb -H localhost -P 5037 -s emulator-5554 shell am instrument -w -r -e class org.ZingoLabs.Zingo.IntegrationTestSuite \
# -e additionalTestOutputDir /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output \
# -e testTimeoutSeconds 31536000 org.ZingoLabs.Zingo.test/androidx.test.runner.AndroidJUnitRunner

# Kill emulator
adb -s emulator-5554 emu kill
