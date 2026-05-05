# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================
# Capacitor Core - Keep ALL Capacitor classes
# R8 must not rename or remove these classes
# ============================================
-keep,allowoptimization class com.getcapacitor.** { *; }
-keep,allowoptimization interface com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keepnames class com.getcapacitor.**
-keepnames interface com.getcapacitor.**

# Keep Capacitor Plugin annotations and reflection metadata
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Prevent R8 from optimizing Capacitor's permission system
-keep class com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.PluginHandle { *; }
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.annotation.** { *; }

# Keep all Plugin subclasses and their methods
-keep class * extends com.getcapacitor.Plugin {
    *;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    *;
}

# ============================================
# Capacitor Voice Recorder Plugin
# ============================================
-keep class com.tchvu3.capacitorvoicerecorder.** { *; }
-keepclassmembers class com.tchvu3.capacitorvoicerecorder.** { *; }
-keepnames class com.tchvu3.capacitorvoicerecorder.**

# ============================================
# Capawesome Foreground Service Plugin
# ============================================
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keepclassmembers class io.capawesome.capacitorjs.plugins.** { *; }
-keepnames class io.capawesome.capacitorjs.plugins.**

# ============================================
# WebView JavaScript Interface
# ============================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================
# AndroidX and Support Libraries
# ============================================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ============================================
# Kotlin metadata (needed for some plugins)
# ============================================
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
