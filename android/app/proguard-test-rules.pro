# Rules for the test APK (testBuildType=release in CI).
# Jackson's KotlinModule detects primary constructors by reading @kotlin.Metadata.
# Without -keepattributes *Annotation*, R8 strips that annotation from test data
# classes and KotlinModule falls back to BeanDeserializer with "no Creators".
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Keep all data classes in the test package used for Jackson deserialization.
-keep class org.ZingoLabs.Zingo.** { *; }
-keepclassmembers class org.ZingoLabs.Zingo.** { *; }
