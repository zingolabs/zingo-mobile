### instruction for using these bash scripts to simplify testing

# prerequisites
# -Android Commandline Tools: sdkmanager. https://developer.android.com/tools/sdkmanager

# set target abi. use -h for more options. this sets up parameters for the following commands

./scripts/emulator_target.sh -a x86_64

# use android command line tools to fetch dependencies
./emulator_dependencies.sh

# .. create emulator
./emulator_create.sh



