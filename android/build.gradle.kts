// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  val kotlinVersion = "1.9.0"
  val buildToolsVersion = "34.0.0"
  val minSdkVersion = 24
  val compileSdkVersion = 34
  val targetSdkVersion = 34
  val ndkVersion = "23.2.8568313"

  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath("com.android.tools.build:gradle:8.1.1")
    classpath("com.facebook.react:react-native-gradle-plugin")
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
  }
}

allprojects {
  repositories {
    google()
    maven("$rootDir/../node_modules/detox/Detox-android")
    maven("https://www.jitpack.io")
  }
 }

// this is not the best solution, but while the libraries have no namespace...
// https://discuss.gradle.org/t/namespace-not-specified-for-agp-8-0-0/45850/5

//subprojects {
//   afterEvaluate { project ->
//       if (project.hasProperty('android')) {
//           project.android {
//               if (namespace == null) {
//                   namespace project.group
//               }
//           }
//       }
//   }
//}
