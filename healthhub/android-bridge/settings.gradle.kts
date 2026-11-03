pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "HealthHubBridge"
include(":app")
// Standalone, manually installed paired test apps. NEVER included in HH One OTA.
include(":wearpilot-phone", ":wearpilot-watch")
