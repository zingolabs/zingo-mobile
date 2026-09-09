buildscript {
    extra.apply {
        set("buildToolsVersion", "35.0.0")
        set("minSdkVersion", 26)
        set("compileSdkVersion", 36)
        set("targetSdkVersion", 36)
        set("ndkVersion", "28.2.13676358")
        set("kotlinVersion", "2.1.20")
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}

plugins {
    id("com.facebook.react.rootproject")
    // Kotlin's answer to `cargo shear`: fails the build on declared
    // dependencies nothing compiles against. Advice beyond unused
    // dependencies (scopes, transitives) stays warning-only.
    id("com.autonomousapps.dependency-analysis") version "3.17.0"
}

dependencyAnalysis {
    issues {
        all {
            onUnusedDependencies { severity("fail") }
        }
    }
}

allprojects {
    repositories {
        maven {
            url = uri("$rootDir/../node_modules/detox/Detox-android")
        }
        google()
        mavenCentral()
        maven { url = uri("https://www.jitpack.io") }
    }
}
