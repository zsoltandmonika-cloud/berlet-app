plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The Samsung vendor AAR is deliberately NOT in the public repo.
// Without it, compile the ordinary working Health Connect build unchanged.
val samsungSdkAar = file("libs/samsung-health-data-api.aar")
val withSamsungSdk = samsungSdkAar.isFile
if (withSamsungSdk) {
    pluginManager.apply("kotlin-parcelize")
}

android {
    namespace = "hu.zsoltmonika.healthhubbridge"
    compileSdk = 36

    defaultConfig {
        applicationId = "hu.zsoltmonika.healthhubbridge"
        minSdk = 26
        targetSdk = 35
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
        implementation("com.google.code.gson:gson:2.11.0")
    }
}
