# Disable obfuscation — keep class names readable for crash reports
-dontobfuscate

# UniFFI-generated Kotlin bindings (uniffi.zingo package).
# These are loaded reflectively by JNA from the Rust side at runtime;
# R8 cannot see the usage statically.
-keep class uniffi.zingo.** { *; }
-keepclassmembers class uniffi.zingo.** { *; }

# JNA — used by UniFFI to call into libuniffi_zingo.so
-keep class com.sun.jna.** { *; }
-keepclassmembers class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.Library { *; }
-keepclassmembers class * extends com.sun.jna.Structure { *; }

# Kotlin metadata and reflection — required by jackson-module-kotlin to introspect
# data class primary constructors. Both main APK and test APK run in the same
# process on Android; stripping kotlin.reflect causes jacksonObjectMapper() to
# fail with "no Creators" on any Kotlin data class.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keep class kotlin.Metadata { *; }
-keep class kotlin.reflect.** { *; }
-keep class kotlin.jvm.internal.** { *; }

# Jackson Kotlin module — keep the module class and its ServiceLoader registration
-keep class com.fasterxml.jackson.module.kotlin.** { *; }
-keep class com.fasterxml.jackson.databind.** { *; }

# Jackson core TypeReference — the inline reified `mapper.readValue<T>()` in
# Kotlin generates anonymous subclasses whose generic Signature must survive
# R8 optimisation, otherwise Jackson's TypeReference(...) constructor throws
# "Internal error: TypeReference constructed without actual type information"
# on release builds (seen in background sync on Play Store / signed APKs).
-keep class com.fasterxml.jackson.core.type.TypeReference { *; }
-keep class * extends com.fasterxml.jackson.core.type.TypeReference
-keepclassmembers class * extends com.fasterxml.jackson.core.type.TypeReference {
    <init>(...);
}

# Guava — the androidTest APK asserts with Google Truth, which needs Guava
# (e.g. ImmutableList) at runtime. Because the app ships Guava (a notifee
# dependency, also declared for WorkManager's ListenableFuture), AGP excludes
# Guava from the test APK and the instrumentation classpath borrows the
# app's copy — but the app itself reaches only a sliver of Guava, so R8
# strips the rest and Truth dies with NoClassDefFoundError on device.
# Keep Guava intact so the tested APK can serve the test APK's needs.
-keep class com.google.common.** { *; }
-dontwarn com.google.common.**

# JNA references AWT classes that don't exist on Android — suppress R8 warnings
-dontwarn java.awt.**
-dontwarn com.sun.jna.Native$AWT

# Jackson's Java7SupportImpl references java.beans annotations not present on Android
-dontwarn java.beans.**

# kotlinx.datetime references kotlinx.serialization internally
-dontwarn kotlinx.serialization.**
