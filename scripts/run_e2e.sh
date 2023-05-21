### instruction for using these bash scripts to simplify testing

# prerequisites
# - docker
# - Android Commandline Tools: sdkmanager. https://developer.android.com/tools/sdkmanager

# build native rust
echo -e "\nBuild native rust..."
./rust/build.sh

# download typescript libraries?
yarn install

echo -e "\nBuilding APKs..."
./gradlew assembleDebug

# set target abi. use -h for more options. this sets up parameters for the following commands
./scripts/emulator_target.sh -a x86_64

# use android command line tools to fetch dependencies
./scripts/emulator_dependencies.sh

# .. create emulator
./scripts/emulator_create.sh

# .. run emulator
./scripts/emulator_run.sh

# .. install apk to emulator
./scripts/emulator_install_apk.sh

# .. launch app
./scripts/emulator_launch_app.sh

