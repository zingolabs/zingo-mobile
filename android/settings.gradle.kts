pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings")
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.10.0"
}
extensions.configure<com.facebook.react.ReactSettingsExtension> { autolinkLibrariesFromCommand() }

rootProject.name = "Zingo"
include(":app")
includeBuild("../node_modules/@react-native/gradle-plugin")
