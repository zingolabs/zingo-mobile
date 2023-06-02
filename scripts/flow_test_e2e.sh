#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)
source ./scripts/emulator_read_target.sh

echo 'started flow script'

test_suite=$1
if [[ "${test_suite}" == "ALL" ]]; then
  test_suite="";
fi

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
./scripts/node_reboot.sh
||||||| parent of 4c39a0e1 (ci try 9)
./scripts/yarn_react-native_node_server.sh
=======
||||||| parent of 2927d61c (ci try 5)
=======
<<<<<<< HEAD
>>>>>>> 2927d61c (ci try 5)
||||||| parent of 25b96e5c (ci try 9)
<<<<<<< HEAD
=======
>>>>>>> 25b96e5c (ci try 9)
echo 'going to react-native'
./scripts/yarn_react-native_node_server.sh
echo 'ran react-native'
>>>>>>> 4c39a0e1 (ci try 9)

detox_target="android.emu.${arch}"
echo 'ready to detox'
yarn detox build -c $detox_target
echo 'detox build'
yarn detox test -c $detox_target $test_suite
echo 'detox test'
