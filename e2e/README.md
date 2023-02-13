to run e2e tests:

start an instance of the emulator, which should be documented in the regular development README
Then, run:

>$ yarn start react-native start

in another terminal:
>$ yarn detox build -c android.emu.debug 
>$ yarn detox test -c android.emu.debug 

For more verbose test output, `-l verbose` or `-l trace` may be added to the test invocation

instructions at https://wix.github.io/Detox/docs/introduction/project-setup/#1-command-line-tools-detox-cli