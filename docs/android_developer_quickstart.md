# Android
## Prerequisites
1. Yarn
2. NodeJS (recommended version 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Docker (Docker Engine)
5. OpenJDK 18 (https://jdk.java.net/archive/)

    1. curl https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz -o openjdk-18.0.2_linux-x64_bin.tar.gz
    2. tar -xzvf openjdk-18.0.2_linux-x64_bin.tar.gz

6. Android SDK Command-line Tools <br />
   Install via Android Studio SDK Manager: <br />
   https://developer.android.com/studio/install <br />
   or as standalone: <br />
   https://developer.android.com/tools  
7. Cargo nextest (https://nexte.st/book/installing-from-source.html)

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

## Building
1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. In the `rust` directory, run: <br />
   `./build.sh` <br />
   This step may take a long time.
4. From the root of the project, run: <br />
   `yarn`

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
