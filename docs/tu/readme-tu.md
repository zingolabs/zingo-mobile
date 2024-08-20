# Zingo Mobil Dokumentation
## 🌍 Dil Menüsü
> Dokümantasyon için tercih ettiğiniz dil seçeneğini seçin:

- 🇬🇧 [English](../../README.md)  
  Comprehensive guide to using Zingo Mobile in English.
- 🇩🇪 [Deutsch](../de/readme-de.md)
  Umfassender Leitfaden zur Verwendung von Zingo Mobile auf Deutsch.
- 🇪🇸 [Español](../es/README-es.md)
  Guía completa para usar Zingo Mobile en español.

## Zingo Android ve iOS uygulamaları
App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## Güvenlik Açığı Bildirimi

Bir güvenlik sorunu keşfettiğinizi düşünüyorsanız, lütfen bizimle şu adresten iletişime geçin:

zingodisclosure@proton.me

## iOS
### Ön Koşullar
1. Yarn
2. NodeJS (önerilen sürüm 17+)
3. Rust ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install))
4. Rustup iOS hedefleri (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cocaopods (`sudo gem install cocoapods`)

### Fiziksel Cihaz İçin Derleme
1. Depoyu klonlayın.
2. Klonlanan depoya gidin `cd zingo-mobile`.
3. `rust/ios` dizininde şunu çalıştırın: <br />
   `./build.sh` <br />
   Bu adım uzun sürebilir.
4. Projenin kökünden şunu çalıştırın: <br />
   `yarn`
5. `ios` dizininde şunu çalıştırın: <br />
   `pod install`

### Simülatör İçin Derleme
1. Depoyu klonlayın.
2. Klonlanan depoya gidin `cd zingo-mobile`.
3. `rust/ios` dizininde şunu çalıştırın: <br />
   `./buildsimulator.sh` <br />
   Bu adım uzun sürebilir.
4. Projenin kökünden şunu çalıştırın: <br />
   `yarn`
5. `ios` dizininde şunu çalıştırın: <br />
   `pod install`

### Uygulamayı Başlatma
1. Bir terminalde şunu çalıştırın: <br />
   `yarn start`
2. Ayrı bir terminalde şunu çalıştırın: <br />
   `yarn ios` <br />
   Ayrıca `ios` dizinini XCode'da açıp oradan da çalıştırabilirsiniz.

## Android
### Ön Koşullar
1. Yarn
2. NodeJS (önerilen sürüm 17+)
3. Rust ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install))
4. Docker (Docker Engine)
5. OpenJDK 18 ([https://jdk.java.net/archive/](https://jdk.java.net/archive/))

    1. curl [https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz](https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz) -o openjdk-18.0.2_linux-x64_bin.tar.gz
    2. tar -xzvf openjdk-18.0.2_linux-x64_bin.tar.gz

6. Android SDK Command-line Tools <br />
   Android Studio SDK Manager aracılığıyla yükleyin: <br />
   [https://developer.android.com/studio/install](https://developer.android.com/studio/install) <br />
   veya bağımsız olarak: <br />
   [https://developer.android.com/tools](https://developer.android.com/tools)  
7. Cargo nextest ([https://nexte.st/book/installing-from-source.html](https://nexte.st/book/installing-from-source.html))

React Native araçları, yerel kodlu uygulamalar oluşturabilmek için bazı ortam değişkenlerinin ayarlanmasını gerektirir. <br />
`$HOME/.bash_profile` veya `$HOME/.profile` yapılandırma dosyanıza aşağıdaki satırları ekleyin: <br />
`PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"` <br />
`PATH="$PATH:$ANDROID_HOME/platform-tools"` <br />
`PATH="$PATH:$ANDROID_HOME/emulator"` <br />
`$HOME/.bashrc` yapılandırma dosyanıza aşağıdaki satırları ekleyin: <br />
`export ANDROID_SDK_ROOT="$HOME/Android/Sdk"` <br />
Ayrıca, JAVA_HOME'unuzun ayarlandığından emin olun, örneğin: <br />
`export JAVA_HOME="/usr/lib/jvm/jdk-18.0.2"`

### Derleme
1. Depoyu klonlayın.
2. Klonlanan depoya gidin `cd zingo-mobile`.
3. `rust` dizininde şunu çalıştırın: <br />
   `./build.sh` <br />
   Bu adım uzun sürebilir.
4. Projenin kökünden şunu çalıştırın: <br />
   `yarn`

### Uygulamayı Başlatma
#### Android Studio
1. Android emülasyonları için, CPU mimarinizle uyumlu yeni bir AVD oluşturabilirsiniz, 
   örneğin, x86_64 ([https://developer.android.com/studio/run/managing-avds](https://developer.android.com/studio/run/managing-avds)). Önerilen API, API 
   30'dur (Android 11). Alternatif olarak, fiziksel bir cihaza bağlanabilirsiniz
   ([https://reactnative.dev/docs/running-on-device](https://reactnative.dev/docs/running-on-device)).
2. `File > Settings` içinde, `Build, Execution and Deployment > Build Tools > Gradle`'a gidin ve
   `Gradle JDK`'nın JDK sürümünüzle eşleştiğini kontrol edin.
2. Bir terminalde şunu çalıştırın: <br />
   `yarn start`
3. `android` dizinini Android Studio'da bir proje olarak açın, üst araç çubuğundan 'app' ve daha önce
   oluşturulan AVD'yi seçin ve "Run 'app'" düğmesine tıklayın.
   Alternatif olarak, bir AVD başlatın ve ayrı bir terminalde şunu çalıştırın: <br />
   `yarn android` 
   
#### Android SDK Command-line Tools (Bağımsız)
Android Studio kullanmadan Android'i komut satırından da emüle edebilirsiniz.
1. Android SDK cmdline-tools binary dosyalarının aşağıdaki dizin yolunda olduğunu kontrol edin: <br />
   `$ANDROID_HOME/cmdline-tools/latest/bin`
2. Kök dizinden şunu çalıştırın: <br />
   `scripts/start_interactive.sh -a x86` <br />
   Çıktılar `android/app/build/outputs/emulator_output` içinde oluşturulur

### Test Etme
#### Ön Koşullar
Entegrasyon testleri ve uçtan uca testler bir regtest sunucusu gerektirir. Linux hostlarda bunlar 
yerel olarak lightwalletd, zcashd ve zcash-cli binary dosyalarını yükleyerek çalıştırılabilir
([https://github.com/zingolabs/zingolib#regtest](https://github.com/zingolabs/zingolib#regtest)). `rust/android/regtest/bin/` dizininden şunu çalıştırın: <br />
`ln -s path/to/lightwalletd/binary path/to/zcashd/binary path/to/zcash-cli/binary ./` <br />
`rust/android/lightwalletd_bin` dizininden şunu çalıştırın: <br />
`ln -s path/to/lightwalletd/binary ./`

Alternatif olarak, entegrasyon testleri ve uçtan uca testler Linux olmayan hostlarda Regchest ile çalıştırılabilir
([https://github.com/zingolabs/zingo-regchest](https://github.com/zingolabs/zingo-regchest)). Regchest, bir docker container içinde zcash/lightwalletd regtest 
ağını yönetir. Testleri çalıştırmadan önce, en son Regchest imajını docker'dan çekin: <br />
`docker pull zingodevops/regchest:007`

#### Yarn Testleri
1. Kök dizinden şunu çalıştırın: <br />
   `yarn test`

#### Entegrasy