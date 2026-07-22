pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings")
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.10.0"
}
extensions.configure<com.facebook.react.ReactSettingsExtension> { autolinkLibrariesFromCommand() }

// The React Native settings plugin exports Guava 31 into the settings
// classloader, below the floor the Dependency Analysis plugin requires;
// declaring a newer Guava here shadows it for the whole build.
buildscript {
    repositories { mavenCentral() }
    dependencies { classpath("com.google.guava:guava:33.4.0-jre") }
}

rootProject.name = "Zingo"
include(":app")
includeBuild("../node_modules/@react-native/gradle-plugin")
