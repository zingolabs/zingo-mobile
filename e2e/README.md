These e2e tests depend on emulating or attaching a device.

1) setup android stack
you can do this with android studio. create a api-level 30 x86_64 device and name it 30_ga_64
alternatively, if you dont have android studio, this can help: https://github.com/fluidvanadium/androidstacker

2) install the necessary emulator with scripts/install_emulator_for_e2e.sh

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
`yarn detox test TESTNAME -c CONFIGURATION`

