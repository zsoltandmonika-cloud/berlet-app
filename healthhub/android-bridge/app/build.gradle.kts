plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Samsung's proprietary AAR stays private, never in public GitHub.
// Without it this remains the working HC-only build, with no fabricated Samsung data.
val samsungSdkAar = file("libs/samsung-health-data-api.aar")
val withSamsungSdk = samsungSdkAar.isFile
android {
    namespace = "hu.zsoltmonika.healthhubbridge"
    compileSdk = 36

    defaultConfig {
        applicationId = "hu.zsoltmonika.healthhubbridge"
        minSdk = if (withSamsungSdk) 29 else 26
        targetSdk = 35
        versionCode = 21
        versionName = "0.15.0"
    }

    sourceSets.getByName("main").java.srcDir(
        if (withSamsungSdk) "src/samsungSdk/java" else "src/samsungStub/java"
    )

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
    if (withSamsungSdk) {
        implementation(files(samsungSdkAar))
        implementation("org.jetbrains.kotlin:kotlin-parcelize-runtime:2.0.21")
        implementation("com.google.code.gson:gson:2.11.0")
    }
}
