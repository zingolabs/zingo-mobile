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
                    ;;
                x86) 
                    sdk="system-images;android-29;default;x86"                    
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
rm -rf "app/build/outputs/integration_test_reports/${abi}"
mkdir -p "app/build/outputs/integration_test_reports/${abi}"

echo -e "\nDownloading system images..."
sdkmanager --install $sdk
sdkmanager --licenses

echo -e "Creating AVDs..."
avdmanager create avd --force --name "pixel2_${abi}" --package $sdk --device pixel_2 --abi $abi

echo -e "\nWaiting for emulator to launch..."
emulator -avd "pixel2_${abi}" -netdelay none -netspeed full -no-window -no-audio -gpu swiftshader_indirect -read-only -no-boot-anim \
&> "app/build/outputs/integration_test_reports/${abi}/emulator.txt" &
wait_for 600 emulator_launch
echo "$(adb devices | grep "emulator-5554" | cut -f1) launch successful"

echo -e "\nWaiting for AVD to boot..."
wait_for 600 boot_complete
echo $(adb -H localhost -P 5037 -s emulator-5554 emu avd name | head -1)
echo "Boot completed"
adb -H localhost -P 5037 -s emulator-5554 shell getprop &> "app/build/outputs/integration_test_reports/${abi}/getprop.txt"

echo -e "\nInstalling APKs..."
adb -H localhost -P 5037 -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -H localhost -P 5037 -s emulator-5554 install -r -t /home/oscar/src/zingo-mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Store emulator info and start logging
adb -H localhost -P 5037 -s emulator-5554 shell cat /proc/meminfo &> "app/build/outputs/integration_test_reports/${abi}/meminfo.txt"
adb -H localhost -P 5037 -s emulator-5554 shell cat /proc/cpuinfo &> "app/build/outputs/integration_test_reports/${abi}/cpuinfo.txt"
adb -H localhost -P 5037 -s emulator-5554 shell logcat -v threadtime -b main &> "app/build/outputs/integration_test_reports/${abi}/logcat.txt" &

# Create additional test output directory
adb -H localhost -P 5037 -s emulator-5554 shell rm -rf "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"
adb -H localhost -P 5037 -s emulator-5554 shell mkdir -p "/sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output"

echo -e "\nRunning integration tests..."
adb -H localhost -P 5037 -s emulator-5554 shell am instrument -w -r -e class org.ZingoLabs.Zingo.IntegrationTestSuite \
-e additionalTestOutputDir /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output \
-e testTimeoutSeconds 31536000 org.ZingoLabs.Zingo.test/androidx.test.runner.AndroidJUnitRunner \
| tee "app/build/outputs/integration_test_reports/${abi}/test_results.txt"

# Store additional test outputs
if [ -n "$(adb -H localhost -P 5037 -s emulator-5554 shell ls -A /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output 2>/dev/null)" ]
then
    adb -H localhost -P 5037 -s emulator-5554 shell cat /sdcard/Android/media/org.ZingoLabs.Zingo/additional_test_output/* \
    &> "app/build/outputs/integration_test_reports/${abi}/additional_test_output.txt"
fi

# Kill emulator
adb -s emulator-5554 emu kill

echo -e "\nTest reports saved: zingo-mobile/android/app/build/outputs/integration_test_reports/${abi}"
