These e2e tests depend on emulating or attaching a device.

0) install prerequisites
# 1) docker
# 2) sdkmanager (android commandline tools: https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip)

1) set up emulator

`./scripts/start_flow_emulator.sh -a x86_64`

2) run all tests
`yarn detox build -c android.emu.debug`
`yarn detox test -c android.emu.debug`

to run a specific test)
`yarn detox test TESTNAME -c android.emu.debug`

alternative flow for testing a 32-bit architecture. make sure the -c configuration matches the emulator
`./scripts/start_flow_emulator.sh -a armeabi-v7a`
`yarn detox build -c android.emu.32`
`yarn detox test -c android.emu.32`

