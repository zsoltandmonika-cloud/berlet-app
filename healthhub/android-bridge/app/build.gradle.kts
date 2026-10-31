plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "hu.zsoltmonika.healthhubbridge"
    compileSdk = 36

    defaultConfig {
        applicationId = "hu.zsoltmonika.healthhubbridge"
        minSdk = 26
        targetSdk = 35
        versionCode = 40
        versionName = "0.15.13"
        // v0.15.13/build40: candidate native external-browser PKCE login; signed OTA promotion is separately gated.
        // Actual signed publication remains separately approved and certificate-gated.
        // No signed OTA is published by merging: release requires manual approval.
    }

    buildFeatures {
        buildConfig = true
    }

    // OTA key is created once, stored only in GitHub Actions encrypted secrets.
    // Unsigned release builds are deliberately never published as OTA updates.
    signingConfigs {
        if (listOf(
                System.getenv("HH_OTA_KEYSTORE_PATH"),
                System.getenv("HH_OTA_KEYSTORE_PASSWORD"),
                System.getenv("HH_OTA_KEY_ALIAS"),
                System.getenv("HH_OTA_KEY_PASSWORD")
            ).all { !it.isNullOrBlank() }) {
            create("ota") {
                storeFile = file(System.getenv("HH_OTA_KEYSTORE_PATH"))
                storePassword = System.getenv("HH_OTA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("HH_OTA_KEY_ALIAS")
                keyPassword = System.getenv("HH_OTA_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (signingConfigs.findByName("ota") != null) {
                signingConfig = signingConfigs.getByName("ota")
            }
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
    implementation("com.google.android.gms:play-services-location:21.3.0")
    // Keep Activity Result lifecycle compatible with transitive Play services fragments.
    implementation("androidx.fragment:fragment:1.7.1")
    testImplementation("junit:junit:4.13.2")
}
