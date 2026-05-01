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

# Kotlin metadata — needed for Kotlin reflection used by jackson-module-kotlin
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keep class kotlin.Metadata { *; }
