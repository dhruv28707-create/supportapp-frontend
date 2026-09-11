# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in the Android SDK proguard-android.txt
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native / Hermes (safety net; RN ships consumer rules too)
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Firebase — annotated Java methods are invoked via JNI
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Google Sign-In (@react-native-google-signin/google-signin)
-keep class com.google.android.gms.auth.** { *; }
-keep class com.reactnativegoogleandroidsignin.** { *; }

# Razorpay checkout (react-native-razorpay)
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Keep line numbers for readable crash stacktraces in release builds
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
