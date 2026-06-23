import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("com.facebook.react")
    id("org.jetbrains.kotlin.android")
}

/**
 * This is the configuration block to customize your React Native Android app.
 * By default you don't need to apply any configuration, just uncomment the lines you need.
 */
react {
    /* Folders */
    //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")
    //   The cli.js file which is the React Native CLI entrypoint. Default is ../../node_modules/react-native/cli.js
    // cliFile = file("../../node_modules/react-native/cli.js")

    /* Variants */
    //   The list of variants to that are debuggable. For those we're going to
    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
    //   If you add flavors like lite, prod, etc. you'll have to list your debuggableVariants.
    // debuggableVariants = ["liteDebug", "prodDebug"]

    /* Bundling */
    //   A list containing the node command and its flags. Default is just 'node'.
    // nodeExecutableAndArgs = ["node"]
    //
    //   The command to run when bundling. By default is 'bundle'
    // bundleCommand = "ram-bundle"
    //
    //   The path to the CLI configuration file. Default is empty.
    // bundleConfig = file(../rn-cli.config.js)
    //
    //   The name of the generated asset file containing your JS bundle
    // bundleAssetName = "MyApplication.android.bundle"
    //
    //   The entry file for bundle generation. Default is 'index.android.js' or 'index.js'
    // entryFile = file("../js/MyApplication.android.js")
    //
    //   A list of extra flags to pass to the 'bundle' commands.
    //   See https://github.com/react-native-community/cli/blob/main/docs/commands.md#bundle
    // extraPackagerArgs = []

    /* Hermes Commands */
    //   The hermes compiler command to run. By default it is 'hermesc'
    // hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"
    //
    //   The list of flags to pass to the Hermes compiler. By default is "-O", "-output-source-map"
    // hermesFlags = ["-O", "-output-source-map"]

    /* Autolinking */
    autolinkLibrariesWithApp()
}

/**
 * Set this to true to Run Proguard on Release builds to minify the Java bytecode.
 */
val enableProguardInReleaseBuilds = true

/**
 * The preferred build flavor of JavaScriptCore (JSC).
 *
 * For example, to use the international variant, you can use:
 * `val jscFlavor = "io.github.react-native-community:jsc-android-intl:2026004.+"`
 *
 * The international variant includes ICU i18n library and necessary data
 * allowing to use e.g. `Date.toLocaleString` and `String.localeCompare` that
 * give correct results when using with locales other than en-US.  Note that
 * this variant is about 6MiB larger per architecture than default.
 */
val jscFlavor = "io.github.react-native-community:jsc-android:2026004.+"

/**
 * Whether to enable building a separate APK for each ABI.
 *
 * Defaults to false but can be set to true with the project properties flag
 * e.g. ./gradlew assembleDebug -PsplitApk=true
 *
 * Additional option to include a universal APK
 * e.g. ./gradlew assembleRelease -PsplitApk=true -PincludeUniversalApk=true
 */
val splitApk = (project.findProperty("splitApk") as? String)?.toBoolean() ?: false
val includeUniversalApk = (project.findProperty("includeUniversalApk") as? String)?.toBoolean() ?: false

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("local.zingo.jks.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    ndkVersion = rootProject.extra["ndkVersion"] as String

    compileSdk = rootProject.extra["compileSdkVersion"] as Int

    namespace = "org.ZingoLabs.Zingo"
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    java {
        toolchain {
            languageVersion = JavaLanguageVersion.of(17)
        }
    }

    defaultConfig {
        applicationId = "org.ZingoLabs.Zingo" // Real
        minSdk = rootProject.extra["minSdkVersion"] as Int
        targetSdk = rootProject.extra["targetSdkVersion"] as Int
        versionCode = 309 // Real (prod baseline; beta flavor overrides below)
        versionName = "2.0.20" // Real
        testBuildType = System.getProperty("testBuildType", "debug")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        externalNativeBuild {
            ndkBuild {
                arguments(
                    "V=1",
                    "APP_CFLAGS+=-ffile-prefix-map=${rootDir}=. -fno-ident -g0 -gno-record-gcc-switches -frandom-seed=1 -Wno-builtin-macro-redefined -D__DATE__= -D__TIME__= -D__TIMESTAMP__= -no-canonical-prefixes",
                    "APP_CXXFLAGS+=-ffile-prefix-map=${rootDir}=. -fno-ident -g0 -gno-record-gcc-switches -frandom-seed=1 -Wno-builtin-macro-redefined -D__DATE__= -D__TIME__= -D__TIMESTAMP__= -no-canonical-prefixes",
                    "APP_LDFLAGS+=-Wl,--build-id=none -Wl,--no-relax -Wl,--pack-dyn-relocs=none -Wl,--sort-common -Wl,--sort-section=name -Wl,--hash-style=gnu"
                )
            }
            cmake {
                cppFlags("-ffile-prefix-map=${rootDir}=.", "-fno-ident", "-g0 -gno-record-gcc-switches")
                arguments(
                    "-DCMAKE_VERBOSE_MAKEFILE=ON",
                    "-DCMAKE_C_FLAGS=-ffile-prefix-map=${rootDir}=. -fno-ident -g0 -gno-record-gcc-switches -frandom-seed=1 -Wno-builtin-macro-redefined -D__DATE__= -D__TIME__= -D__TIMESTAMP__= -no-canonical-prefixes",
                    "-DCMAKE_CXX_FLAGS=-ffile-prefix-map=${rootDir}=. -fno-ident -g0 -gno-record-gcc-switches -frandom-seed=1 -Wno-builtin-macro-redefined -D__DATE__= -D__TIME__= -D__TIMESTAMP__= -no-canonical-prefixes",
                    "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,--build-id=none -Wl,--no-relax -Wl,--pack-dyn-relocs=none -Wl,--sort-common -Wl,--sort-section=name -Wl,--hash-style=gnu"
                )
            }
        }
    }

    flavorDimensions += "channel"
    productFlavors {
        create("prod") {
            dimension = "channel"
            resValue("string", "app_name", "Zingo")
            // Privacy/anti-tamper controls from the Least Authority audit.
            // Prod enforces them; beta disables them so testers can take
            // screenshots, record video, and so screen-recorder overlays
            // don't drop touches. Toggling per-flavor (instead of editing
            // MainActivity for releases) keeps prod safe by default — any
            // future flavor MUST define this bool or compile will fail.
            resValue("bool", "enforce_privacy_controls", "true")
        }
        create("beta") {
            dimension = "channel"
            applicationIdSuffix = ".Beta"
            versionCode = 315 // beta override
            versionName = "2.0.21" // beta override
            resValue("string", "app_name", "Zingo Beta")
            resValue("bool", "enforce_privacy_controls", "false")
        }
    }

    splits {
        abi {
            isEnable = splitApk
            reset()
            include("armeabi-v7a", "x86", "arm64-v8a", "x86_64")
            isUniversalApk = includeUniversalApk
        }
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        create("release") {
            if (System.getenv("KEYSTORE_PASSWORD") != null) {
                println("****** ENV SIGNING APK ******")
                storeFile = file("Zingo.jks")
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            } else if (keystoreProperties.getProperty("KEYSTORE_PASSWORD") != null) {
                println("****** LOCAL SIGNING APK ******")
                storeFile = file("Zingo.jks")
                storePassword = keystoreProperties.getProperty("KEYSTORE_PASSWORD")
                keyAlias = keystoreProperties.getProperty("KEY_ALIAS")
                keyPassword = keystoreProperties.getProperty("KEY_PASSWORD")
            } else {
                println("****** DEBUG SIGNING APK ******")
                storeFile = file("debug.keystore")
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig = signingConfigs.getByName("release")
            // this may cause problems
            //vcsInfo.include false
            isMinifyEnabled = enableProguardInReleaseBuilds
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
            testProguardFiles("proguard-test-rules.pro")
        }
    }

    buildFeatures {
        buildConfig = false // Avoids build timestamp in BuildConfig.java
        viewBinding = true
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true  // Ensures stable binary layout
        }
    }

    testOptions {
        managedDevices {
            val pixel2api29 = localDevices.create("pixel2api29_x86") {
                device = "Pixel 2"
                apiLevel = 29
                systemImageSource = "aosp"
                require64Bit = false
            }
            val pixel2api30 = localDevices.create("pixel2api30_x86_64") {
                device = "Pixel 2"
                apiLevel = 30
                systemImageSource = "aosp"
                require64Bit = true
            }
            groups {
                create("x86_Archs") {
                    targetDevices.add(pixel2api29)
                    targetDevices.add(pixel2api30)
                }
            }
        }
    }
}

// to make the build reproducible...
tasks.withType<AbstractArchiveTask>().configureEach {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}

// Map for the version code that gives each ABI a value.
val abiCodes = mapOf("armeabi-v7a" to 1, "x86" to 2, "arm64-v8a" to 3, "x86_64" to 4)

// For each APK output variant, override versionCode with a combination of
// abiCodes * 10000 + variant.versionCode.
// variant.versionCode is equal to defaultConfig.versionCode.
// If you configure product flavors that define their own versionCode,
// variant.versionCode uses that value instead.
androidComponents {
    onVariants { variant ->
        // Capture the variant's effective versionCode (flavor override applied) before
        // we start overwriting per-ABI outputs. Falls back to defaultConfig for safety.
        val effectiveVersionCode = variant.outputs.firstOrNull()?.versionCode?.orNull
            ?: android.defaultConfig.versionCode ?: 1
        // Hard ceiling for the `abi * 10000 + build` encoding. Past 9999 the
        // build digits would collide with another ABI's prefix space (e.g. a
        // universal APK 10000 is indistinguishable from a split armv7 with
        // build 0), breaking both Play's per-ABI delivery ordering and the
        // JS-side decode in app/utils/ZingoAppData.ts. Switching schemes is a
        // deliberate choice — fail loudly here instead of shipping garbage.
        check(effectiveVersionCode <= 9999) {
            "versionCode $effectiveVersionCode exceeds 9999, the limit of the " +
            "split-APK encoding (abi * 10000 + build). Either bump the multiplier " +
            "(and update ABI_BY_PREFIX in app/utils/ZingoAppData.ts) or rework " +
            "the scheme before raising the build number further."
        }
        variant.outputs.forEach { output ->
            val abiFilter = output.filters.find {
                it.filterType == com.android.build.api.variant.FilterConfiguration.FilterType.ABI
            }
            val baseAbiVersionCode = abiCodes[abiFilter?.identifier] ?: return@forEach
            output.versionCode.set(baseAbiVersionCode * 10000 + effectiveVersionCode)
        }
    }
}

// change this to build.sh script
androidComponents {
    onVariants { variant ->
//        val t = tasks.register("generate${variant.name.replaceFirstChar { it.uppercase() }}UniFFIBindings", Exec::class) {
//            workingDir("${rootProject.projectDir}/../rust")
//            commandLine("cargo", "run", "--release", "--features=uniffi/cli", "--bin", "uniffi-bindgen",
//            "generate", "../rust/lib/src/zingo.udl", "--language", "kotlin",
//            "--out-dir", "${layout.buildDirectory.get()}/generated/source/uniffi/${variant.name}/java")
//        }
        // UniFFI bindings are generated by `node rust/android/build_android.mjs` into
        // build/generated/source/uniffi/{debug,release}/java. They depend only on the
        // build type, not on the product flavor, so we key on buildType to keep all
        // flavors (prod/beta) pointing at the same generated source.
        variant.sources.java?.addStaticSourceDirectory(
            layout.buildDirectory.dir("generated/source/uniffi/${variant.buildType}/java").get().asFile.absolutePath
        )
    }
}

dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")

    androidTestImplementation("com.wix:detox:20.51.4")
    implementation("androidx.appcompat:appcompat:1.7.0")

    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation(project(":react-native-device-info")) {
        exclude(group = "com.google.firebase")
        exclude(group = "com.google.android.gms")
        exclude(group = "com.android.installreferrer")
    }
    implementation("com.facebook.soloader:soloader:0.10.5")

    // Detox tests getAttributes() needs this
    debugImplementation("com.google.android.material:material:1.12.0")

    // Hermes is always enabled in RN 0.74+
    implementation("com.facebook.react:hermes-android")

    implementation("org.jetbrains.kotlin:kotlin-stdlib:${rootProject.extra["kotlinVersion"] as String}")
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")

    val workVersion = "2.10.0"

    // (Java only)
    implementation("androidx.work:work-runtime:$workVersion")

    // Kotlin + coroutines
    implementation("androidx.work:work-runtime-ktx:$workVersion")

    // optional - RxJava2 support
    implementation("androidx.work:work-rxjava2:$workVersion")

    // optional - Test helpers
    androidTestImplementation("androidx.work:work-testing:$workVersion")

    // optional - Multiprocess support
    implementation("androidx.work:work-multiprocess:$workVersion")

    // google truth testing framework
    androidTestImplementation("com.google.truth:truth:1.1.3")

    // JSON parsing
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.18.3")

    // JUnit test runners
    androidTestImplementation("androidx.test.ext:junit:1.2.1")

    // Kotlin extensions for androidx.test.ext.junit
    androidTestImplementation("androidx.test.ext:junit-ktx:1.2.1")

    // uniffi needs this
    implementation("net.java.dev.jna:jna:5.18.1@aar")

    // back navigation implementation
    implementation("androidx.activity:activity:1.10.1")

    // encrypted file storage
    implementation("androidx.security:security-crypto:1.0.0")
}
