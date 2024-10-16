# Zingo Mobile Dokumentation

## 🌍 Sprachmenü
> Wählen Sie Ihre bevorzugte Sprache für die Dokumentation:

- 🇬🇧 [English](../../README.md)  
  Comprehensive guide to using Zingo Mobile in English.
- 🇪🇸 [Español](../es/README-es.md)  
  Guía completa para usar Zingo Mobile en español.
- 🇹🇷 [Türkçe](../tu/readme-tu.md)
  Zingo Mobile'nin Türkçe kullanımı için kapsamlı kılavuz

## Zingo Android- und iOS-Apps
App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## Offenlegung von Sicherheitslücken

Wenn Sie glauben, ein Sicherheitsproblem entdeckt zu haben, kontaktieren Sie uns bitte unter:

zingodisclosure@proton.me

## iOS
### Voraussetzungen
1. Yarn
2. NodeJS (empfohlene Version 17+)
3. Rust ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install))
4. Rustup iOS-Ziele (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cocaopods (`sudo gem install cocoapods`)

### Erstellen für physisches Gerät
1. Klonen Sie das Repository.
2. Gehen Sie zum geklonten Repository `cd zingo-mobile`.
3. Führen Sie im Verzeichnis `rust/ios` Folgendes aus: <br />
   `./build.sh` <br />
   Dieser Schritt kann lange dauern.
4. Führen Sie vom Stammverzeichnis des Projekts aus Folgendes aus: <br />
   `yarn`
5. Führen Sie im Verzeichnis `ios` Folgendes aus: <br />
   `pod install`

### Erstellen für Simulator
1. Klonen Sie das Repository.
2. Gehen Sie zum geklonten Repository `cd zingo-mobile`.
3. Führen Sie im Verzeichnis `rust/ios` Folgendes aus: <br />
   `./buildsimulator.sh` <br />
   Dieser Schritt kann lange dauern.
4. Führen Sie vom Stammverzeichnis des Projekts aus Folgendes aus: <br />
   `yarn`
5. Führen Sie im Verzeichnis `ios` Folgendes aus: <br />
   `pod install`

### Starten der App
1. Führen Sie in einem Terminal Folgendes aus: <br />
   `yarn start`
2. Führen Sie in einem separaten Terminal Folgendes aus: <br />
   `yarn ios` <br />
   Sie können auch das Verzeichnis `ios` in XCode öffnen und dort ausführen.

## Android
### Voraussetzungen
1. Yarn
2. NodeJS (empfohlene Version 17+)
3. Rust ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install))
4. Docker (Docker Engine)
5. OpenJDK 18 ([https://jdk.java.net/archive/](https://jdk.java.net/archive/))

    1. curl [https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz](https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz) -o openjdk-18.0.2_linux-x64_bin.tar.gz
    2. tar -xzvf openjdk-18.0.2_linux-x64_bin.tar.gz

6. Android SDK Command-line Tools <br />
   Installieren über Android Studio SDK Manager: <br />
   [https://developer.android.com/studio/install](https://developer.android.com/studio/install) <br />
   oder als eigenständige Version: <br />
   [https://developer.android.com/tools](https://developer.android.com/tools)  
7. Cargo nextest ([https://nexte.st/book/installing-from-source.html](https://nexte.st/book/installing-from-source.html))

Die React Native-Tools erfordern die Einrichtung einiger Umgebungsvariablen, um Apps mit nativem Code zu erstellen. <br />
Fügen Sie die folgenden Zeilen zu Ihrer Konfigurationsdatei `$HOME/.bash_profile` oder `$HOME/.profile` hinzu: <br />
`PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"` <br />
`PATH="$PATH:$ANDROID_HOME/platform-tools"` <br />
`PATH="$PATH:$ANDROID_HOME/emulator"` <br />
Fügen Sie die folgenden Zeilen zu Ihrer Konfigurationsdatei `$HOME/.bashrc` hinzu: <br />
`export ANDROID_SDK_ROOT="$HOME/Android/Sdk"` <br />
Stellen Sie außerdem sicher, dass Ihr JAVA_HOME festgelegt ist, zum Beispiel: <br />
`export JAVA_HOME="/usr/lib/jvm/jdk-18.0.2"`

### Erstellen
1. Klonen Sie das Repository.
2. Gehen Sie zum geklonten Repository `cd zingo-mobile`.
3. Führen Sie im Verzeichnis `rust` Folgendes aus: <br />
   `./build.sh` <br />
   Dieser Schritt kann lange dauern.
4. Führen Sie vom Stammverzeichnis des Projekts aus Folgendes aus: <br />
   `yarn`

### Starten der App
#### Android Studio
1. Für Android-Emulationen können Sie ein neues AVD erstellen, das mit Ihrer CPU-Architektur kompatibel ist, 
   z. B. x86_64 ([https://developer.android.com/studio/run/managing-avds](https://developer.android.com/studio/run/managing-avds)). Die empfohlene API ist API 
   30 (Android 11). Alternativ können Sie eine Verbindung zu einem physischen Gerät herstellen
   ([https://reactnative.dev/docs/running-on-device](https://reactnative.dev/docs/running-on-device)).
2. Navigieren Sie in `File > Settings` zu `Build, Execution and Deployment > Build Tools > Gradle` und
   überprüfen Sie, ob das `Gradle JDK` mit Ihrer JDK-Version übereinstimmt.
2. Führen Sie in einem Terminal Folgendes aus: <br />
   `yarn start`
3. Öffnen Sie das Verzeichnis `android` in Android Studio als Projekt, wählen Sie 'app' und das zuvor
   erstellte AVD in der oberen Symbolleiste und klicken Sie auf die Schaltfläche "Run 'app'".
   Alternativ starten Sie ein AVD und führen Sie in einem separaten Terminal Folgendes aus: <br />
   `yarn android` 
   
#### Android SDK Command-line Tools (Eigenständig)
Sie können Android auch über die Befehlszeile emulieren, ohne Android Studio zu verwenden.
1. Überprüfen Sie, ob sich die Binärdateien der Android SDK cmdline-tools im folgenden Verzeichnispfad befinden: <br />
   `$ANDROID_HOME/cmdline-tools/latest/bin`
2. Führen Sie vom Stammverzeichnis aus Folgendes aus: <br />
   `scripts/start_interactive.sh -a x86` <br />
   Die Ausgaben werden in `android/app/build/outputs/emulator_output` generiert

### Testen
#### Voraussetzungen
Integrationstests und End-to-End-Tests erfordern einen Regtest-Server. Auf Linux-Hosts können diese
lokal ausgeführt werden, indem die Binärdateien lightwalletd, zcashd und zcash-cli installiert werden
([https://github.com/zingolabs/zingolib#regtest](https://github.com/zingolabs/zingolib#regtest)). Führen Sie vom Verzeichnis `rust/android/regtest/bin/` aus Folgendes aus: <br />
`ln -s path/to/lightwalletd/binary path/to/zcashd/binary path/to/zcash-cli/binary ./` <br />
Führen Sie vom Verzeichnis `rust/android/lightwalletd_bin` aus Folgendes aus: <br />
`ln -s path/to/lightwalletd/binary ./`

Alternativ können Integrationstests und End-to-End-Tests auf Nicht-Linux-Hosts mit Regchest
([https://github.com/zingolabs/zingo-regchest](https://github.com/zingolabs/zingo-regchest)) ausgeführt werden. Regchest verwaltet das zcash/lightwalletd-Regtest-
Netzwerk in einem Docker-Container. Bevor Sie Tests ausführen, ziehen Sie das neueste Regchest-Image von Docker: <br />
`docker pull zingodevops/regchest:007`

#### Yarn-Tests
1. Führen Sie vom Stammverzeichnis aus Folgendes aus: <br />
   `yarn test`

#### Integrationstests
1. Erstellen Sie Quick-Boot-Snapshots, um die Startzeiten von AVD zu beschleunigen. Führen Sie vom Stammverzeichnis aus Folgendes aus: <br />
   `./scripts/integration_tests.sh -a x86_64 -s