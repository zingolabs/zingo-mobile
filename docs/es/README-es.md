# Zingo Mobile Documentation

## 🌍 Language Menu
> Select your preferred language for documentation:

- 🇬🇧 [English](../../README.md)  
  Comprehensive guide to using Zingo Mobile in English.
- 🇩🇪 [Deutsch](./docs/de/readme-de.md)
  Umfassender Leitfaden zur Verwendung von Zingo Mobile auf Deutsch.

## Apps Zingo para Android e iOS
App Store: [https://apps.apple.com/app/zingo/id1668209531](https://apps.apple.com/app/zingo/id1668209531)  
Google Play: [https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)

## Divulgación de Vulnerabilidades de Seguridad

Si crees haber descubierto un problema de seguridad, por favor contáctanos en:
zingodisclosure@proton.me

## iOS
### Prerrequisitos
1. Yarn
2. NodeJS (versión recomendada 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Objetivos de Rustup para iOS (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim`)
5. Cargo-lipo (`cargo install cargo-lipo`)
6. Cocaopods (`sudo gem install cocoapods`)

### Compilar para dispositivo físico
1. Clona el repositorio.
2. Ve al repositorio clonado `cd zingo-mobile`.
3. En el directorio `rust/ios`, ejecuta: <br />
   `./build.sh` <br />
   Este paso puede tomar un tiempo considerable.
4. Desde la raíz del proyecto, ejecuta: <br />
   `yarn`
5. En el directorio `ios`, ejecuta: <br />
   `pod install`

### Compilar para simulador
1. Clona el repositorio.
2. Ve al repositorio clonado `cd zingo-mobile`.
3. En el directorio `rust/ios`, ejecuta: <br />
   `./buildsimulator.sh` <br />
   Este paso puede tomar un tiempo considerable.
4. Desde la raíz del proyecto, ejecuta: <br />
   `yarn`
5. En el directorio `ios`, ejecuta: <br />
   `pod install`

### Iniciar la app
1. En una terminal, ejecuta: <br />
   `yarn start`
2. En una terminal separada, ejecuta: <br />
   `yarn ios` <br />
   También puedes abrir el directorio `ios` en XCode y ejecutarlo desde allí.

## Android
### Prerrequisitos
1. Yarn
2. NodeJS (versión recomendada 17+)
3. Rust (https://www.rust-lang.org/tools/install)
4. Docker (Docker Engine)
5. OpenJDK 18 (https://jdk.java.net/archive/)

    1. curl https://download.java.net/java/GA/jdk18.0.2/f6ad4b4450fd4d298113270ec84f30ee/9/GPL/openjdk-18.0.2_linux-x64_bin.tar.gz -o openjdk-18.0.2_linux-x64_bin.tar.gz
    2. tar -xzvf openjdk-18.0.2_linux-x64_bin.tar.gz

6. Android SDK Command-line Tools <br />
   Instalar a través del Android Studio SDK Manager: <br />
   https://developer.android.com/studio/install <br />
   o de forma independiente: <br />
   https://developer.android.com/tools  
7. Cargo nextest (https://nexte.st/book/installing-from-source.html)

Las herramientas de React Native requieren que se configuren algunas variables de entorno para 
construir aplicaciones con código nativo. <br />
Agrega las siguientes líneas a tu archivo de configuración `$HOME/.bash_profile` o `$HOME/.profile`: <br />
`PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"` <br />
`PATH="$PATH:$ANDROID_HOME/platform-tools"` <br />
`PATH="$PATH:$ANDROID_HOME/emulator"` <br />
Agrega las siguientes líneas a tu archivo de configuración `$HOME/.bashrc`: <br />
`export ANDROID_SDK_ROOT="$HOME/Android/Sdk"` <br />
Además, asegúrate de que tu JAVA_HOME esté configurado, por ejemplo: <br />
`export JAVA_HOME="/usr/lib/jvm/jdk-18.0.2"`

### Compilar
1. Clona el repositorio.
2. Ve al repositorio clonado `cd zingo-mobile`.
3. En el directorio `rust`, ejecuta: <br />
   `./build.sh` <br />
   Este paso puede tomar un tiempo considerable.
4. Desde la raíz del proyecto, ejecuta: <br />
   `yarn`

### Iniciar la app
#### Android Studio
1. Para emulaciones de Android, puedes crear un nuevo AVD, compatible con la arquitectura de tu CPU, 
   por ejemplo, x86_64 (https://developer.android.com/studio/run/managing-avds). La API recomendada 
   es API 30 (Android 11). Alternativamente, puedes conectar un dispositivo físico
   (https://reactnative.dev/docs/running-on-device).
2. En `File > Settings`, navega a `Build, Execution and Deployment > Build Tools > Gradle` y
   verifica que el `Gradle JDK` coincida con tu versión de JDK.
2. En una terminal, ejecuta: <br />
   `yarn start`
3. Abre el directorio `android` en Android Studio como un proyecto, selecciona 'app' y el AVD 
   creado previamente en la barra de herramientas superior y haz clic en el botón "Run 'app'".
   Alternativamente, inicia un AVD y en una terminal separada, ejecuta: <br />
   `yarn android` 
   
#### Android SDK Command-line Tools (Independiente)
También puedes emular Android desde la línea de comandos sin usar Android Studio.
1. Verifica que los binarios de Android SDK cmdline-tools estén en la siguiente ruta de directorio: <br />
   `$ANDROID_HOME/cmdline-tools/latest/bin`
2. Desde el directorio raíz, ejecuta: <br />
   `scripts/start_interactive.sh -a x86` <br />
   Las salidas se generan en `android/app/build/outputs/emulator_output`

### Pruebas
#### Prerrequisitos
Las pruebas de integración y las pruebas de extremo a extremo requieren un servidor regtest. En 
hosts Linux, estas pueden ejecutarse localmente instalando los binarios lightwalletd, zcashd y 
zcash-cli (https://github.com/zingolabs/zingolib#regtest). Desde el directorio 
`rust/android/regtest/bin/`, ejecuta: <br />
`ln -s path/to/lightwalletd/binary path/to/zcashd/binary path/to/zcash-cli/binary ./` <br />
Desde el directorio `rust/android/lightwalletd_bin`, ejecuta: <br />
`ln -s path/to/lightwalletd/binary ./`

Alternativamente, las pruebas de integración y las pruebas de extremo a extremo se pueden ejecutar 
en hosts que no sean Linux con Regchest (https://github.com/zingolabs/zingo-regchest). Regchest 
administra la red zcash/lightwalletd regtest en un contenedor docker. Antes de ejecutar las 
pruebas, obtén la última imagen de Regchest desde docker: <br />
`docker pull zingodevops/regchest:007`

#### Pruebas con Yarn
1. Desde el directorio raíz, ejecuta: <br />
   `yarn test`

#### Pruebas de Integración
1. Crea instantáneas de inicio rápido para acelerar los tiempos de inicio de AVD. Desde el 
   directorio raíz, ejecuta: <br />
   `./scripts/integration_tests.sh -a x86_64 -s` <br />
   `./scripts/integration_tests.sh -a x86 -s` <br />
   Por defecto, esto utiliza imágenes del sistema de Google Playstore API 30. Se pueden utilizar 
   otras imágenes para las pruebas especificando el nivel de API y el objetivo. Sin embargo, el uso 
   de otras imágenes con el ejecutor de pruebas cargo aún está en desarrollo.
2. Para ejecutar las pruebas de integración. Desde el directorio `rust`, ejecuta: <br />
   `cargo nextest run -E 'not test(e2e)'` <br /> 