// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  extra.apply {  
    set("kotlinVersion", "1.9.0")
    set("buildToolsVersion", "34.0.0")
    set("minSdkVersion", 24)
    set("compileSdkVersion", 34)
    set("targetSdkVersion", 34)
    set("ndkVersion", "23.2.8568313")    
  }

  val kotlinVersion = extra["kotlinVersion"]

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
