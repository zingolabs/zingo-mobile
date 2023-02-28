These e2e tests depend on emulating or attaching a device.

if you have all the emulators, simply run
`$ e2e/runall.sh`


or to run with specifications

set up and build the project.
from the root of the project (e2e/..)
`$ sh scripts/setup.sh`

check installed emulators with 
`$ emulator -list-avds`
compare to the configuration aliases in `.detoxrs`
pick a test called `e2e/TESTNAME.test.js`
`yarn detox build TESTNAME -c CONFIGURATION`
`yarn detox tests TESTNAME -c CONFIGURATION`

