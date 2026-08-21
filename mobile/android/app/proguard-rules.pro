# Keep the NyumbaLink application classes (hand-rolled JSON models, no codegen).
-keep class com.nyumbalink.nyumbalink_mobile.** { *; }

# Flutter / engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.services.** { *; }
-keep class io.flutter.facade.** { *; }

# Networking / DI libraries commonly rely on reflection.
-keep class dio.** { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers class * {
    @org.greenrobot.eventbus.Subscribe <methods>;
}

-dontwarn org.slf4j.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn android.databinding.**

# Preserve line numbers for clearer crash reports.
-keepattributes SourceFile,LineNumberTable
