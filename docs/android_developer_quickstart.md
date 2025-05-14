#### Build the Rust kernel for the application

`pushd rust && ./build.sh && popd`

#### Install android-studio using your distro's package manager

e.g. `paru -S android-studio`

#### Build the devcontainer environment "zingoapp-dev"

[With docker in place](https://www.docker.com/) run:

  `docker build -t zingoapp-dev ./.devcontainer`

#### Run the image as an interactive container

  `docker run -it -v "$(pwd):/workspace" -w /workspace zingoapp-dev bash`

##### Manage development dependencies

1. `corepack yarn install`

#### In a new terminal

`android-studio`

Setup the environemnt to emulate a React Native app:

https://reactnative.dev/docs/0.78/set-up-your-environment?os=linux

Go to the "Install Android Studio" section

# Set environment variables to allow React Native tools to build apps with native code

###############################################
Earlier draft



## Prerequisites

Start by installing docker, and Android studio on your dev system.

* https://developer.android.com/studio
* https://www.docker.com/

### Next, build a development container with fixed resources:

From the root directoty of the project run:
`docker build -t zingoapp-dev ./.devcontainer`

Note: Order is not strict, you can build the app independently of the dev-environment

## The "devcontainer"
1. A development environment with a fixed set of resources.
   * We currently offer that as a devcontainer that can be built locally.
        #TODO:  Publish devcontainer images
2. The Android Studio IDE to develop the App with a full set of standard tools
   * This runs...   uhhh  *INSIDE*, *ADJACENT TO*, *UNDERNEATH* the devcontainer?
3. The compiled Rust "kernel" a rustc binary linked against Android Native libnraries
4. (Optional) An Android Virtual Device Emulator, this is connected to other pieces via spaghetti noodles of
darkmatter, woven into our reality with arrays of quantum-calibrated tachyon beams.

# Android
The React Native tools require some environment variables to be set up in order to build apps with
native code. <br />
Add the following lines to your `$HOME/.bash_profile` or `$HOME/.profile` config file: <br />
`PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"` <br />
`PATH="$PATH:$ANDROID_HOME/platform-tools"` <br />
`PATH="$PATH:$ANDROID_HOME/emulator"` <br />
Add the following lines to your `$HOME/.bashrc` config file: <br />
`export ANDROID_SDK_ROOT="$HOME/Android/Sdk"` <br />
Also, make sure your JAVA_HOME is set, for example: <br />
`export JAVA_HOME="/usr/lib/jvm/jdk-18.0.2"`


## Launching the app
### Android Studio
1. For Android emulations, you can create a new AVD, compatible with your CPU architecture 
   i.e. x86_64 (https://developer.android.com/studio/run/managing-avds). The recommended API is API 
   30 (Android 11). Alternatively, you can connect to a physical device
   (https://reactnative.dev/docs/running-on-device).
2. In `File > Settings`, navigate to `Build, Execution and Deployment > Build Tools > Gradle` and
   check the `Gradle JDK` matches your JDK version.
2. In a terminal, run: <br />
   `yarn start`
3. Open the `android` directory in Android Studio as a project, select 'app' and the previously
   created AVD in the upper toolbar and click the "Run 'app'" button.
   Alternatively, launch an AVD and in a separate terminal, run: <br />
   `yarn android` 
   
### Android SDK Command-line Tools (Standalone)
You can also emulate android from the command line without using Android Studio.
1. Check that the Android SDK cmdline-tools binaries are in the following directory path: <br />
   `$ANDROID_HOME/cmdline-tools/latest/bin`
2. From the root directory run: <br />
   `scripts/start_interactive.sh -a x86` <br />
   Outputs are generated in `android/app/build/outputs/emulator_output`


## Check The State of An Environment

Confirm utilities are available in a "zingo-app" devcontainer:

`docker run -it --rm zingoapp-dev which sdkmanager`

Should be:

`/usr/local/android-sdk/cmdline-tools/latest/bin/sdkmanager`
