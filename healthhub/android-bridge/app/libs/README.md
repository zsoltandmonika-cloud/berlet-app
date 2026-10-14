# Private vendor SDK for unified HealthHub Connect

The Samsung Health Data SDK 1.1.0 `.aar` is not part of this public repository.

For an authorized **local SDK-enabled test build**, download the official Samsung Health Data SDK from Samsung Developer under the applicable terms. Place its vendor library in this directory, named `samsung-health-data-api.aar`, *locally only*.

The root app Gradle build selects the real Samsung SDK reader when this file exists; otherwise it compiles the honest no-SDK stub. Both use the same Connect package ID `hu.zsoltmonika.healthhubbridge`.

**Important:** Do not distribute or upload Samsung's binary to public GitHub. Do not upload signed test APKs using an unrelated certificate to devices already running Connect 0.14.0.

A signed `0.15.0` OTA release is blocked unless the authorized SDK library is provided in its build environment. Verify vendor partner authorization for the existing Connect package name and signing fingerprint before enabling it on a user device.
