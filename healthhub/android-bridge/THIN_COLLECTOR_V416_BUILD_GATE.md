# HealthHub Thin Collector v416: Samsung SDK build gate

**Status: local build procedure prepared, licensed vendor SDK binary still required.**

This branch builds on the existing consolidated **draft #162**, not on production main. It does **not** merge or release an Android APK.

## Safe SDK-enabled build on Windows

1. Use a private, legitimately acquired **Samsung Health Data SDK 1.1.0** AAR or original ZIP (same SDK family used for the previously working Beta). Never upload the licensed binary or secret keys to the public repository.
2. With Android SDK 36, JDK 17 and Gradle 8.13 already installed, check out this branch.
3. From PowerShell, run:

```powershell
cd healthhub/android-bridge
powershell -ExecutionPolicy Bypass -File tools/test-samsung-sdk-build.ps1 -SdkPath "C:\private\SamsungHealthDataSdk.zip"
```

4. The script unpacks/copies the AAR only temporarily, compiles the **Samsung SDK-enabled** `app-debug.apk`, prints SDK/APK SHA-256 values, and removes the temporary vendor AAR even on failure.
5. The output is **DEBUG-signed by the local build environment**. It is **not** a production APK and **must not** be installed as an update over the existing HealthHub Connect.

## Explicit release blockers

- Verify the SDK AAR from the private copy is supported and compiles against the native Samsung reader.
- Verify signing identity of the **installed** HealthHub Connect v0.14.0 and of the intended v0.15.0 release, without exposing private keys. Debug builds are not signing-identity evidence.
- Verify Samsung Health's permission/partner authorization for the **unified Connect application ID** and **same release signing certificate**. Beta's separate application ID grants do not automatically transfer.
- Use a separately authorized pilot release to test Health Connect + Samsung source reads, independent cloud uploads and metadata. Leave Samsung Beta installed.
- Require at least two genuine unattended Samsung background read/verified upload cycles before retiring Beta. Successful builds and cloud file timestamps alone are insufficient.

## Existing code

- Draft #162 contains the Samsung SDK reader, background worker/scheduler, source-separated upload, admin telemetry and remote scheduling.
- Draft #114 / #118 retain the prior standalone Samsung Beta history.
- Draft #167 was an earlier audit/foundation branch. Prefer reusing #162 instead of redeveloping the reader.
