# HealthHub Connect 0.15.0 — First implementation checkpoint

**Status:** implemented on draft PR only. **No production or phone installation performed.**

## Baseline

- Existing native Connect app ID: `hu.zsoltmonika.healthhubbridge`
- Existing release baseline: v0.14.0 / versionCode 20
- Proposed consolidated release: v0.15.0 / versionCode 21
- Existing Connect behavior (Health Connect, Dropbox, OTA, HealthHub commands, resilient sync) remains in place.
- Samsung Beta's separate dev `applicationIdSuffix = ".samsungbeta"` is **not** used in the consolidated app.

## Changes already present in the development branch

1. Port native Samsung Health Data SDK 1.1.0 daily/step/exercise reader to optional source set; `SamsungSdkDailyReader.available = false` in no-vendor fallback builds.
2. Add `SamsungCollectorScheduler`, with explicitly enabled 4-hour WorkManager tasks, rather than a second Android app.
3. Add `SamsungCollectorWorker` with strict device-owner/profile guard, independent `{profile}-samsung-health.json` file, revision freshness and upload readback verification.
4. Add opt-in Samsung authorization, first read + verified upload + auto scheduling from the existing Connect interface. No background permission dialog. HC sync always preserved.
5. Preserve current Dropbox token storage in Connect; no second OAuth registration needed for the integrated app when its existing Vault token is valid.
6. Keep OTA version manifest, checksums and Android installation consent. Explicitly block signing/publishing unified v0.15 release if authorized Samsung SDK AAR is absent.
7. Introduce PR-only fallback compilation; first run compiles a normal Connect without vendor AAR and confirms the original package name.

## What this milestone does *not* prove

- An SDK-enabled APK has **not yet** been compiled against a privately supplied Samsung AAR.
- No 0.15 APK has been signed, released or installed on any phone.
- The installed 0.14.0 APK signing certificate has not been compared with the signing certificate for the next OTA release.
- The existing Connect package/signature has not yet been granted and verified Samsung Health Data SDK access.
- Automatic background Samsung SDK collection on a real phone has **not yet** passed the 4-hour/overnight test.
- The cloud-first control plane and A/B remote configuration have architectural blueprints, but this initial native merge does **not** implement them yet.
- Reduced APK size has not been measured; combining SDK dependencies may initially increase binary size. Thin refers to responsibilities, not a verified small APK.

## Release gates

- [ ] Obtain vendor AAR through an authorized private build process; no public redistribution.
- [ ] Compile **real SDK** build with same package ID and long-lived release signing identity.
- [ ] Check Samsung authorization for `hu.zsoltmonika.healthhubbridge` and current release certificate fingerprint.
- [ ] Confirm installed Connect signing certificate matches OTA APK. If not, user-assisted migration is required, and previously granted Android permissions may need to be reauthorized.
- [ ] Validate the existing Connect's Dropbox OAuth refresh token survives installation, or provide safe re-consent without deleting central data.
- [ ] Verify owner/profile binding before every upload and after asynchronous operations.
- [ ] Compare Samsung SDK metrics against Samsung Health and the pre-migration Beta for the same date and timestamp, without adding duplicated steps/sessions.
- [ ] Observe two unattended SDK read + verified upload cycles with no manual taps. Confirm *data timestamps*, not merely file update timestamps.
- [ ] Stage signed OTA rollout to one approved pilot only. Preserve existing Connect and Samsung Beta as rollback reference until success.
- [ ] After verified parity, migrate to the remotely managed cloud-first thin collector and A/B last-good config, without adding a new subscription.

## CI and OTA behavior

- `.github/workflows/healthhub-connect-unified-pr-ci.yml`: compiles HC fallback on PR; debug artifacts are not deployed as updates.
- `.github/workflows/healthhub-connect-ota-release.yml`: signing + release remains main-only and now **fails closed** for 0.15.x without the Samsung vendor AAR.
- `app/libs/samsung-health-data-api.aar`: private build input; Git-ignored and excluded from the public source.
- Real signing secrets remain under GitHub Actions secrets and must never be exposed in source or chat.

## Test matrix

| Case | Expected |
| --- | --- |
| SDK absent fallback | HC/Dropbox still works; Samsung is clearly unavailable |
| SDK installed but consent missing | No background read; explicit on-device Samsung permission request only |
| Dropbox disconnected | No false successful cloud sync; HC unaffected |
| Wrong owner | Reject read/upload and leave existing vault files untouched |
| Newer Samsung file already in Dropbox | Do not replace it with an older export |
| Upload network interruption | Retry under WorkManager rules, no mistaken success |
| Upload completes | Readback validates profile and export timestamp |
| App reboot / background restrictions | Worker resumes opportunistically, lateness and errors observable |
| Phone OTA signing mismatch | Android rejects in-place update; do not delete production app automatically |
