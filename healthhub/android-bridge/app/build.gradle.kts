plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The Samsung vendor AAR is deliberately NOT in the public repo.
// Without it, compile the ordinary working Health Connect build unchanged.
val samsungSdkAar = file("libs/samsung-health-data-api.aar")
val withSamsungSdk = samsungSdkAar.isFile
android {
    namespace = "hu.zsoltmonika.healthhubbridge"
    compileSdk = 36

    defaultConfig {
        applicationId = "hu.zsoltmonika.healthhubbridge"
        // Vendor AAR 1.1.0 declares minSdk=29; the legacy HC-only APK
        // remains on minSdk 26 for backwards compatibility.
        minSdk = if (withSamsungSdk) 29 else 26
        targetSdk = 35
        // Keep the existing HealthHub Connect installed. SDK development gets
        // its own sandboxed app ID and signing identity, so it cannot overwrite
        // the user's working Dropbox/HC configuration.
        if (withSamsungSdk) applicationIdSuffix = ".samsungbeta"
        manifestPlaceholders["healthHubLabel"] = if (withSamsungSdk) "HH Samsung Beta" else "HealthHub Connect"
        manifestPlaceholders["healthHubScheme"] = if (withSamsungSdk) "healthhubsamsungbeta" else "healthhubconnect"
        versionCode = 18
        versionName = "0.12.0"
    }

    buildFeatures {
        buildConfig = true
    }
    sourceSets.getByName("main").java.srcDir(
        if (withSamsungSdk) "src/samsungSdk/java" else "src/samsungStub/java"
    )

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    if (withSamsungSdk) {
        implementation(files(samsungSdkAar))
        // Samsung Health Data SDK 1.1.0 uses Kotlin Parcelize classes in its
        // Binder/Parcelable responses. This runtime MUST be packaged inside
        // the APK: without kotlinx.parcelize.Parceler Android crashes when
        // ActivitySummary aggregate results are unmarshalled.
        implementation("org.jetbrains.kotlin:kotlin-parcelize-runtime:2.0.21")
        implementation("com.google.code.gson:gson:2.11.0")
    }
}
