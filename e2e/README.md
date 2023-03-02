These e2e tests depend on emulating or attaching a device.

1) setup android stack. optionally you can do this with android studio, just make sure to name your emulators the way i did (29_gaps_32 and 30_ga_64)
however, these command-line tools are easier to work with, once they're set up
i followed these instructions
https://web.archive.org/web/20230301233955/https://guides.codepath.com/android/installing-android-sdk-tools
https://web.archive.org/web/20230301234131/https://stackoverflow.com/questions/65262340/cmdline-tools-could-not-determine-sdk-root/71765298

to maintain shared resources with android studio (which had a java-error throwing version of sdkmanager)
i installed the tools to `~/Android/Sdk/cmdline-tools/latest`
so my `.bashrc` includes this:
`export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin`

2) install emulators
`$ sh scripts/install_emulators.sh`

3) build zingo-mobile
`$ sh scripts/setup.sh`

4) run e2e tests
`$ sh scripts/run_e2e.sh`

or to run with specifications:
check installed emulators with 
`$ emulator -list-avds`
compare to the configuration aliases in `.detoxrs`
pick a test called `e2e/TESTNAME.test.js`
`yarn detox build TESTNAME -c CONFIGURATION`
`yarn detox tests TESTNAME -c CONFIGURATION`

