to run all e2e tests:
set up an emulator for Pixel_6_API_30
start docker daemon
From the root directory, run:
>$ sh e2e/runall.sh


alternatively, setup and start a node react-native server with
>$ sh e2e/setup.sh

then choose a test to run
>$ yarn detox test SPECIFY -c android.emu.debug