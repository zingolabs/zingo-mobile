These e2e tests depend on emulating or attaching a device.
If you want to understand deeper, read the shell files.

0) install prerequisites
# 1) docker
# 2) sdkmanager (android commandline tools: https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip)
# yarn

1) build rust + typescript + kotlin. requires docker

`./scripts/build_apk.sh`

2) choose a build target to run against. currently works against x86 and x86_64. download and create emulator with sdkmanager.

`./scripts/flow_emulator_setup.sh -a x86`

if you already have the emulator created, you can target it without recreating it: `./scripts/emulator_target -a x86_64`

3) start yarn react-native (node) server and run yarn detox

`./scripts/run_e2e.sh`
to run a specific test): `./scripts/run_e2e.sh new_wallet`

