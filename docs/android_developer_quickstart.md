# Android
## Prerequisites
1. Yarn
2. NodeJS (recommended version 22.18.0 or higher)
3. Rust (https://www.rust-lang.org/tools/install)
4. Docker (Docker Engine) — required only for `yarn rust:android` (reproducible build).
   Not needed for `yarn rust:android-local`.
5. OpenJDK 18 (https://jdk.java.net/archive/)
   - **macOS**: `brew install openjdk@18` or via SDKMAN: `sdk install java 18.0.2-zulu`
   - **Linux**: download from the link above and extract, or `sudo apt install openjdk-18-jdk`
   - **Windows**: download from the link above, or `choco install openjdk --version=18.0.2`
6. Android SDK Command-line Tools.
   Install via Android Studio SDK Manager: https://developer.android.com/studio/install
   or as standalone: https://developer.android.com/tools
7. Cargo nextest (https://nexte.st/book/installing-from-source.html)

## Environment variables
The React Native tools need `ANDROID_HOME`, `JAVA_HOME` and some entries on `PATH`.
Paths depend on your platform — pick the row that matches yours:

| Platform | `ANDROID_HOME` (default) | `JAVA_HOME` (example) |
|---|---|---|
| macOS   | `$HOME/Library/Android/sdk`  | `/opt/homebrew/opt/openjdk@18` (Homebrew) or `$HOME/.sdkman/candidates/java/current` (SDKMAN) |
| Linux   | `$HOME/Android/Sdk`          | `/usr/lib/jvm/jdk-18` |
| Windows | `%LOCALAPPDATA%\Android\Sdk` | `C:\Program Files\OpenJDK\jdk-18` |

### macOS (zsh) / Linux (bash)
Add to `~/.zshrc` on macOS or `~/.bashrc` on Linux:
```sh
export ANDROID_HOME="<path from table above>"
export JAVA_HOME="<path from table above>"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
```

### Windows
In *System Properties → Environment Variables*, set:
- `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
- `JAVA_HOME` = your JDK 18 install path

And append to `Path`:
- `%ANDROID_HOME%\cmdline-tools\latest\bin`
- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\emulator`

## Building
1. Clone the repository.
2. Go to the cloned repo `cd zingo-mobile`.
3. From the root of the project, install JS deps: `yarn`
4. Build the Rust libraries for the 4 Android ABIs (Docker, reproducible):
   `yarn rust:android` — may take a long time on first run.

For faster iteration during development you can also build natively on the host
(no Docker), optionally restricted to a single ABI:
- `yarn rust:android-local` _(all 4 ABIs)_
- `yarn rust:android-local arm64` _(only arm64-v8a)_

Native mode requires these extras on the host:
- NDK 28.2.13676358 (Android Studio → SDK Manager → SDK Tools → NDK Side-by-side)
- `cargo install --version 4.0.1 cargo-ndk`
- `cargo install --force --locked bindgen-cli`
- `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

## Launching the app
### Android Studio
1. Create an AVD matching your CPU architecture
   (`arm64-v8a` for Apple Silicon Macs, `x86_64` for Intel Mac / Linux / Windows on x86_64).
   Recommended API: API 30 (Android 11) or higher.
   See https://developer.android.com/studio/run/managing-avds.
   Alternatively, connect to a physical device
   (https://reactnative.dev/docs/running-on-device).
2. In `File > Settings`, navigate to `Build, Execution and Deployment > Build Tools > Gradle` and
   check the `Gradle JDK` matches your JDK 18 install.
3. In a terminal, run: `yarn start`
4. Open the `android` directory in Android Studio as a project, select 'app' and the previously
   created AVD in the upper toolbar and click "Run 'app'".
   Alternatively, launch an AVD and in a separate terminal, run: `yarn android`

### Android SDK Command-line Tools (Standalone)
You can also emulate Android from the command line without using Android Studio.
1. Check that the Android SDK cmdline-tools binaries are at
   `$ANDROID_HOME/cmdline-tools/latest/bin` (`%ANDROID_HOME%\cmdline-tools\latest\bin` on Windows).
2. From the root directory run: `scripts/start_interactive.sh -a x86`
   Outputs are generated in `android/app/build/outputs/emulator_output`.
   (This script is bash-only; on Windows use WSL or invoke the equivalent steps manually.)
