#!/bin/bash

function check_kill() {
    last_emulator=$(adb devices | grep emulator | tail -1 | cut -f1)
    if [ "$last_emulator" != "$1" ]
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
      echo "Failed due to timeout"
      return 1;
  fi
}

# Kill all emulators
until ! adb devices | grep -q emulator
do
    emulator_id=$(adb devices | grep emulator | tail -1 | cut -f1)
    adb -s $emulator_id emu kill &> /dev/null
    echo -e "\nWaiting for ${emulator_id} to shutdown..."
    if wait_for 10 check_kill $emulator_id
    then
        echo "Successfully shutdown ${emulator_id}."
    fi
done
