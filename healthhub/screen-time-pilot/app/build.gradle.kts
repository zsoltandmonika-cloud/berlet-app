plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "hu.zsoltmonika.healthhub.screentimepilot"
    compileSdk = 36

    defaultConfig {
        // DISTINCT from the production HealthHub Connect package.
        applicationId = "hu.zsoltmonika.healthhub.screentimepilot"
        minSdk = 29
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0-pilot"
    }

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
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    testImplementation("junit:junit:4.13.2")
}
