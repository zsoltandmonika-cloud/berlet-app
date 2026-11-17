# PRIVATE Samsung Health Data SDK (do not commit binary)

Download the Samsung Health Data SDK AAR from Samsung Developer, then **on the build machine only** place it here as `samsung-health-data-api.aar`.

This directory is allowlisted for its README only. No AAR, Android keystore or credentials belong in the public Git repository.

Use `./gradlew :app:assembleDebug -PhhSamsungDirectPilot=true` after granting read access to the Samsung Health Data SDK in the manufacturer's developer mode. This builds a **private test APK**, not the signed OTA. See `SAMSUNG_HEALTH_DATA_SDK.md` for required Samsung app registration before distribution.
