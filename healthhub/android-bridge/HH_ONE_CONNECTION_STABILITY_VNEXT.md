# HH One Connection Stability vNext · Architecture Release Gate

Date: 2026-10-25
Status: **implementation in draft PR #491, NOT a release**. Native Health Connect offline outbox and web Nutrition foreground recovery are implemented on the branch; on-device acceptance is pending.

## Findings from repository
- Main Android Gradle source currently reports `versionCode=30`, `versionName=0.15.3`. Published `healthhub/data/bridge-ota.json` advertises **0.15.2 / code 29** to both family profiles. This does not prove either phone's installed version.
- Original root cause: `DropboxVaultClient.ensureCredentialVersion()` could delete stored OAuth grants when a version marker was missing. Draft patch preserves tokens for a missing marker and refuses a genuinely mismatching client ID without deletion; phone-side confirmation remains outstanding.
- Native `Sh9GpsService` requests periodic location updates but does not publish Family Guard positions; browser watcher stops when page is backgrounded.
- `ResilientHealthSync` uses WorkManager with network constraints/backoff. Native Health Connect snapshot exports are now persisted through `NativeHealthOutbox` before Dropbox delivery, separately from browser Nutrition localStorage. Browser Nutrition now retries on online/foreground with capped backoff and performs a single stale-access-token refresh after HTTP 401. These measures do not guarantee background web execution.

## Stability architecture
1. **Credential vault**: single serialized native token authority for OAuth refresh. Do not delete valid refresh credentials solely because a local version marker is missing. On actual client ID mismatch, preserve credentials securely until explicit verified migration/consent; never silently reuse credentials with a different OAuth client. Expose nonsecret credential-state codes only.
2. **Durable outbox**: each user entry is locally transactionally queued with immutable owner ID, idempotency key, created timestamp and pending/sent/confirmed states. A save is labelled backed-up only after Dropbox success. On reconnect retry safely and prevent duplicate writes; leave existing records intact.
3. **Sync supervisor**: one unique WorkManager catch-up job per owner with CONNECTED constraints and exponential backoff. Serialize writes; update separate counters for network error, transient 5xx/429, expired access token, invalid grant and user-required authorization. Never busy-loop or promise hard real-time background execution.
4. **GPS**: keep the native location foreground service opt-in, clearly label native receiver and Family Guard publishing as separate states. Background Family Live sharing is a distinct privacy/security project and must require explicit consent and Android review.
5. **Admin Center**: expose per-device state for last heartbeat, last confirmed Dropbox write, outbox size, token refresh state, WorkManager result and browser/native GPS status. No coordinates, access tokens or health record payloads in diagnostics.
6. **Security & rollout**: keep package ID and signing identity; do not alter production OTA manifest until debug builds, regression tests, consent review, and on-device pilot have passed. Pilot Zsolt S24 Ultra first, then Mónika with explicit approval. Rollback/forward-recovery must preserve local entries and Dropbox snapshots.

## Remaining release blockers (post-implementation)
**Do not publish v0.15.3 from source just because the OTA machinery exists.** First:
- Verify last healthy phone APK versions, relevant manifest behavior and any concurrent web Dropbox connector expiry.
- Investigate `ensureCredentialVersion` destructive path and whether it runs against preexisting valid refresh grants.
- Reproduce idle reconnect, report HTTP class without sensitive body, and verify pending writes.
- Complete and verify runtime/instrumentation tests for migration from missing marker, token expiry, simultaneous workers, offline queue, retry/restart, profile isolation, and work cancellation. Static source guards exist but are not a substitute for device tests.
- Confirm each HealthHub web entry form's separate browser OAuth and persistence semantics. Native `NativeHealthOutbox` only covers Health Connect snapshots; browser Nutrition uses localStorage and separate refresh tokens. Other web forms remain outside the confirmed durable outbox scope.

Acceptance: no manual reconnect after idle with valid refresh credential, no silently lost input, stale states explicitly labelled, current signed release unaffected until gates pass.
