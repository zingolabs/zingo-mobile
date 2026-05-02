# Rules for the test APK (testBuildType=release in CI).
# Jackson uses Kotlin reflection to deserialize data classes defined in androidTest.
# R8 would strip their primary constructors without these rules.
-keep class org.ZingoLabs.Zingo.** { *; }
-keepclassmembers class org.ZingoLabs.Zingo.** { *; }
