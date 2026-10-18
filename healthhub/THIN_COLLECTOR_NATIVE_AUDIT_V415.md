# Thin Collector v0.15.0 — Native audit and first integration gate (2026-10-13)

## Verified repository baseline

- Connect Android source: `healthhub/android-bridge/`, application ID `hu.zsoltmonika.healthhubbridge`, versionCode `20`, versionName `0.14.0`, compileSdk 36, targetSdk 35.
- Connect Gradle dependencies include Health Connect `1.1.0` and WorkManager `2.11.2` but **no Samsung Health Data SDK dependency**.
- Connect schedules independent background jobs in `MainActivity.onCreate()`: `SyncScheduler`, `ResilientHealthSync`, `OrchestratorScheduler` (and other daily/OTA tasks). Their timing alone cannot demonstrate fresh Samsung measurements.
- Connect has an OTA signing-config path controlled by GitHub Actions secrets; debug APK signatures are not production OTA signatures.
- A previous manual Samsung Beta round-trip showed Samsung records in HealthHub, but does not verify automatic Samsung reads or signing compatibility.

## Unverified and blocking

1. **RESOLVED (2026-10-13): HH Samsung Beta native source located in draft PR #114 (branch `feature/healthhub-v372-samsung-sdk-native-collector-20261010`) and expanded in draft PR #118 (`feature/healthhub-v375-samsung-advanced-data-20261010`).** The real `SamsungSdkDailyReader.kt` exists in `app/src/samsungSdk/java/hu/zsoltmonika/healthhubbridge/`; source stubs, worker and scheduler are also present in #114. Confirm the final installed Beta package/signature separately.
2. **BLOCKED:** Verify Samsung Health Data SDK entitlement and the Connect signing/package pair before requesting an SDK-based read. Beta's access cannot be assumed to transfer. The official SDK v1.1.0 AAR was previously available privately to the user but is intentionally excluded from public GitHub.
3. Reconcile Samsung JSON with `healthhub/live-v371-samsung.js` schema contract, including local-day boundaries and missing vs zero metrics.
4. Migrate secure Dropbox tokens only through supported user-consented/OS-controlled paths; never copy opaque app-private credentials or embed secrets.
5. Build a separately signed pilot, retain both current apps and the existing browser source merge until native and unattended parity is confirmed.

## Pre-existing full unification draft discovered (2026-10-13)

- **PR #162** (`feature/healthhub-connect-v0150-unified-collector-20261012`) already contains a considerably more complete native v0.15 implementation: Samsung SDK reader/stub, opt-in `SamsungCollectorScheduler`, `SamsungCollectorWorker`, telemetry, remote config, and Admin Center RAG. Its `CONNECT_V0150_MIGRATION.md` lists native vendor-AAR, Connect signing and SDK authorization as unverified blockers.
- Treat PR #162 as the **primary integration candidate**. Do **not** merge this v415 foundation blindly into it: `MainActivity.kt` overlaps and the `CollectorAvailability` stub would duplicate existing capability checks.
- The #162 no-vendor fallback build does **not** prove Samsung-enabled build or access. Do not release or uninstall Beta.

## Foundation implemented on this branch

- `CollectorAvailability.kt`: typed separate status for Health Connect and Samsung; SDK-available does not mean permission-granted or read-fresh. Samsung returns **NOT_INTEGRATED** unconditionally until the actual native dependency and entitlement pass.
- `MainActivity.kt`: read-only source status section. Existing Health Connect workers, Dropbox uploads, OTA and schedules unchanged.
- This is an integration **foundation, not the 0.15.0 completed collector**. No Samsung data is read, no new APK should replace v0.14.0.

## Next development slice

1. Review the existing native SDK reader and worker in PR #162 against the real Beta #118 reader; resolve discrepancies without duplicating code.
2. Implement profile-checked source-specific staging and read/upload/verify timestamps without conflating them.
3. Run Samsung entitlement and device-side permission tests on a signed pilot APK.
4. Run same-day source provenance tests and two unattended overnight cycles.
