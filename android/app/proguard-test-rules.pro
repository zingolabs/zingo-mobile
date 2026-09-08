# Rules for the test APK (testBuildType=release in CI).
# Jackson's KotlinModule detects primary constructors by reading @kotlin.Metadata.
# Without -keepattributes *Annotation*, R8 strips that annotation from test data
# classes and KotlinModule falls back to BeanDeserializer with "no Creators".
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Keep all data classes in the test package used for Jackson deserialization.
-keep class org.ZingoLabs.Zingo.** { *; }
-keepclassmembers class org.ZingoLabs.Zingo.** { *; }

# Jackson and Kotlin reflection, used by the instrumented tests only.
-keep class kotlin.Metadata { *; }
-keep class kotlin.reflect.** { *; }
-keep class kotlin.jvm.internal.** { *; }
-keep class com.fasterxml.jackson.module.kotlin.** { *; }
-keep class com.fasterxml.jackson.databind.** { *; }
-keep class com.fasterxml.jackson.core.type.TypeReference { *; }
-keep class * extends com.fasterxml.jackson.core.type.TypeReference
-keepclassmembers class * extends com.fasterxml.jackson.core.type.TypeReference {
    <init>(...);
}
-dontwarn java.beans.**
