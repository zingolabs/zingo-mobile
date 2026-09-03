# Disable obfuscation — keep class names readable for crash reports
-dontobfuscate

# UniFFI-generated Kotlin bindings (every uniffi.* package).
# These are loaded reflectively by JNA from the Rust side at runtime;
# R8 cannot see the usage statically.
#
# Deliberately the whole `uniffi.**` tree rather than one rule per crate.
# The earlier `uniffi.zingo.**` covered that package and its subpackages
# only, leaving the sibling `uniffi.zingo_nym_proxy_ffi` unprotected: R8
# stripped 55 of its 112 classes from the release APK, RustBuffer.ByReference
# and UniffiRustCallStatus.ByValue among them. Every call into the shim then
# died with a NoClassDefFoundError, which guardingLinkage reported as "the
# nym proxy shim is unavailable" — so Mixnet Mode was dead on every CI build
# while every local debug build (no R8) worked. A per-crate rule would have
# to be remembered for each new UniFFI crate; this one cannot be forgotten.
-keep class uniffi.** { *; }
-keepclassmembers class uniffi.** { *; }

# JNA — used by UniFFI to call into libuniffi_zingo.so and
# libzingo_nym_proxy_ffi.so
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

# kotlin.io file helpers: the release test APK takes its stdlib from the app APK,
# and the app no longer reads whole files itself, so the tests need these kept.
-keep class kotlin.io.FilesKt** { *; }

# androidx.security.crypto: the app only reads legacy encrypted files now, the
# release test APK still writes them as fixtures.
-keep class androidx.security.crypto.** { *; }

# The release test APK calls into the app classes by name, including Kotlin
# internal accessors, so the app package keeps every member, as the test rules do.
-keep class org.ZingoLabs.Zingo.** { *; }
-keepclassmembers class org.ZingoLabs.Zingo.** { *; }
