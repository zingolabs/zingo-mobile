# to run e2e tests:

1. follow build 0-3 instructions in ../README.md

>$ yarn start react-native start

in another terminal:i
>$ yarn detox build -c android.emu.duy
>$ yarn detox test --configuration android.emu.debug

instructions at https://wix.github.io/Detox/docs/introduction/project-setup/#1-command-line-tools-detox-cli