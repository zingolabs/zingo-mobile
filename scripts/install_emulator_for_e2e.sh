# assuming you have sdkmanager and avdmanager in path


yes | sdkmanager --licenses
sdkmanager --install 'build-tools;33.0.2'
sdkmanager --install platform-tools
sdkmanager --install emulator
sdkmanager --install cmake
sdkmanager --install "system-images;android-30;google_apis;x86_64"

avdmanager create avd --path avd/30_ga_64 --force --name 30_ga_64 --package 'system-images;android-30;google_apis;x86_64' -d pixel_6

