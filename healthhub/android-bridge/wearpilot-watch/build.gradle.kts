plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "hu.zsoltmonika.watchpilot"
    compileSdk = 36
    defaultConfig {
        // MUST match the handheld module and its signing certificate.
        applicationId = "hu.zsoltmonika.watchpilot"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "0.1-pilot"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("com.google.android.gms:play-services-wearable:20.0.1")
}
