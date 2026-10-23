plugins { id("com.android.application") }
android {
    namespace = "hu.zsoltmonika.sh9light"
    compileSdk = 35
    defaultConfig {
        applicationId = "hu.zsoltmonika.sh9light"
        minSdk = 29
        targetSdk = 35
        versionCode = 3
        versionName = "0.1.2-test3"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes { release { isMinifyEnabled = false } }
}
