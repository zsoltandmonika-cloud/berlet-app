plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-parcelize")
}

// Proprietary Samsung Health Data SDK is never published in this repository.
// Production APKs remain Health Connect-only unless an owner explicitly builds
// a private, opted-in Samsung Direct pilot using Samsung's local AAR.
val hhSamsungPilotAar = file("private-samsung-sdk/samsung-health-data-api.aar")
val hhSamsungPilotRequested = providers.gradleProperty("hhSamsungDirectPilot").orNull == "true"
// Separate opt-in integrated release *candidate*. Not enabled in normal OTA.
// Must be built locally with the proprietary AAR and the original OTA signing key.
// Never publish/install without Samsung partner registration for exact package+signer.
val hhSamsungIntegratedCandidateRequested =
    providers.gradleProperty("hhSamsungIntegratedCandidate").orNull == "true"
if (hhSamsungPilotRequested && hhSamsungIntegratedCandidateRequested) {
    error("Choose either private Samsung debug Pilot or integrated signed candidate, never both.")
}
if (hhSamsungIntegratedCandidateRequested &&
    gradle.startParameter.taskNames.none {
        it.contains("assembleRelease", ignoreCase = true)
    }) {
    error("Integrated Samsung candidate is RELEASE-only; use :app:assembleRelease -PhhSamsungIntegratedCandidate=true.")
}
// Samsung Direct is only for an isolated DEBUG test APK. Never compile it into
// a signed production release, OTA or a broad task which may build a release.
if (hhSamsungPilotRequested && gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true) ||
    it.contains("bundle", ignoreCase = true) ||
    it.contains("publish", ignoreCase = true) ||
    it.equals("build", ignoreCase = true) ||
    it.equals("assemble", ignoreCase = true)
}) {
    error("Samsung Direct pilot is DEBUG-ONLY. Use :app:assembleDebug -PhhSamsungDirectPilot=true.")
}
if ((hhSamsungPilotRequested || hhSamsungIntegratedCandidateRequested) && !hhSamsungPilotAar.isFile) {
    error("Samsung pilot needs app/private-samsung-sdk/samsung-health-data-api.aar downloaded from Samsung Developer.")
}
val hhSamsungPilotEnabled = hhSamsungPilotRequested && hhSamsungPilotAar.isFile
val hhSamsungIntegratedCandidateEnabled =
    hhSamsungIntegratedCandidateRequested && hhSamsungPilotAar.isFile
val hhSamsungDirectEnabled = hhSamsungPilotEnabled || hhSamsungIntegratedCandidateEnabled
// A candidate bearing the actual HH One package must never be produced unsigned.
// This does NOT establish Samsung partner approval, and it does NOT publish OTA.
if (hhSamsungIntegratedCandidateEnabled &&
    listOf("HH_OTA_KEYSTORE_PATH", "HH_OTA_KEYSTORE_PASSWORD",
           "HH_OTA_KEY_ALIAS", "HH_OTA_KEY_PASSWORD")
        .any { System.getenv(it).isNullOrBlank() }) {
    error("Samsung integrated candidate requires the existing HH One OTA signing credentials.")
}

android {
    namespace = "hu.zsoltmonika.healthhubbridge"
    compileSdk = 36

    defaultConfig {
        applicationId = "hu.zsoltmonika.healthhubbridge"
        minSdk = 26
        // Samsung Health Data SDK 1.1.0 requires API 29. Keep standard HH One
        // minSdk 26; raise it ONLY for the private Samsung Direct debug pilot.
        if (hhSamsungDirectEnabled) {
            minSdk = 29
        }
        targetSdk = 35
        versionCode = 47
        versionName = "0.15.20"
        // v0.15.20/build47: opt-in Hungarian Dropbox account review request (NO remote token switch).
        // Signed OTA promotion is separately approved and certificate-gated.
        // Integrated candidate uses a monotonic upgrade code above Zsolt 0.15.21/build48; NEVER published by this flag.
        if (hhSamsungIntegratedCandidateEnabled) {
            versionCode = 49
            versionName = "0.15.22"
        }
        // Actual signed publication remains separately approved and certificate-gated.
        // No signed OTA is published by merging: release requires manual approval.
    }

    buildFeatures {
        buildConfig = true
    }
    defaultConfig {
        buildConfigField("boolean", "HH_SAMSUNG_DIRECT_PILOT", hhSamsungPilotEnabled.toString())
        buildConfigField("boolean", "HH_SAMSUNG_DIRECT_AVAILABLE", hhSamsungDirectEnabled.toString())
        buildConfigField("boolean", "HH_SAMSUNG_DIRECT_CANDIDATE", hhSamsungIntegratedCandidateEnabled.toString())
    }
    if (hhSamsungDirectEnabled) {
        sourceSets.getByName("main").java.srcDir("src/samsungDirectPilot/kotlin")
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
        debug {
            // Private SDK pilot installs beside HH One rather than replacing its
            // signed package or wiping the owner's Health Connect credentials.
            if (hhSamsungPilotEnabled) {
                applicationIdSuffix = ".samsungpilot"
                versionNameSuffix = "-samsungpilot"
            }
        }
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
    if (hhSamsungDirectEnabled) {
        implementation(files(hhSamsungPilotAar))
        implementation("com.google.code.gson:gson:2.13.1")
    }
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    // Keep Activity Result lifecycle compatible with transitive Play services fragments.
    implementation("androidx.fragment:fragment:1.7.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
