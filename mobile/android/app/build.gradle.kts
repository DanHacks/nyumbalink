plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.nyumbalink.nyumbalink_mobile"
    // We installed Android platform / build-tools 34 on the build machine.
    compileSdk = 34
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.nyumbalink.nyumbalink_mobile"
        // API 21 keeps the app installable on affordable Kenyan Android devices (spec #60).
        minSdk = 21
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Release signing is read from key.properties (generated locally).
    signingConfigs {
        create("release") {
            val keystorePropsFile = rootProject.file("key.properties")
            if (keystorePropsFile.exists()) {
                val keystoreProps = java.util.Properties()
                keystoreProps.load(java.io.FileInputStream(keystorePropsFile))
                storeFile = file(keystoreProps["storeFile"] as String)
                storePassword = keystoreProps["storePassword"] as String
                keyAlias = keystoreProps["keyAlias"] as String
                keyPassword = keystoreProps["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // Shrink the DEX and unused resources to hit the ~11 MB target (spec #60).
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    // Android App Bundle: Google Play delivers only the resources each device needs.
    bundle {
        abi {
            enableSplit = true
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
