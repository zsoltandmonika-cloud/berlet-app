# HH One Connection Stability vNext · Architecture Release Gate

Date: 2026-10-25
Status: proposal / blocking diagnosis; **NOT a release**.

## Findings from repository
- Main Android Gradle source currently reports `versionCode=30`, `versionName=0.15.3`. Published `healthhub/data/bridge-ota.json` advertises **0.15.2 / code 29** to both family profiles. This does not prove either phone's installed version.
- `DropboxVaultClient.ensureCredentialVersion()` deletes both `dropbox_refresh_token` and `dropbox_access_token` when the stored `dropbox_client_id_v2` differs from the current application key, including missing-marker legacy installs. This is a credible cause of unexpected reconnect; first determine whether the marker is missing or changed on affected devices, without revealing tokens.
- Native `Sh9GpsService` requests periodic location updates but does not publish Family Guard positions; browser watcher stops when page is backgrounded.
- `ResilientHealthSync` uses WorkManager with network constraints/backoff; idle delays must be distinguished from OAuth revocation.

## Stability architecture
1. **Credential vault**: single serialized native token authority for OAuth refresh. Do not delete valid refresh credentials solely because a local version marker is missing. On actual client ID mismatch, preserve credentials securely until explicit verified migration/consent; never silently reuse credentials with a different OAuth client. Expose nonsecret credential-state codes only.
2. **Durable outbox**: each user entry is locally transactionally queued with immutable owner ID, idempotency key, created timestamp and pending/sent/confirmed states. A save is labelled backed-up only after Dropbox success. On reconnect retry safely and prevent duplicate writes; leave existing records intact.
3. **Sync supervisor**: one unique WorkManager catch-up job per owner with CONNECTED constraints and exponential backoff. Serialize writes; update separate counters for network error, transient 5xx/429, expired access token, invalid grant and user-required authorization. Never busy-loop or promise hard real-time background execution.
4. **GPS**: keep the native location foreground service opt-in, clearly label native receiver and Family Guard publishing as separate states. Background Family Live sharing is a distinct privacy/security project and must require explicit consent and Android review.
5. **Admin Center**: expose per-device state for last heartbeat, last confirmed Dropbox write, outbox size, token refresh state, WorkManager result and browser/native GPS status. No coordinates, access tokens or health record payloads in diagnostics.
6. **Security & rollout**: keep package ID and signing identity; do not alter production OTA manifest until debug builds, regression tests, consent review, and on-device pilot have passed. Pilot Zsolt S24 Ultra first, then Mónika with explicit approval. Rollback/forward-recovery must preserve local entries and Dropbox snapshots.

## Immediate release blocker
**Do not publish v0.15.3 from source just because the OTA machinery exists.** First:
- Verify last healthy phone APK versions, relevant manifest behavior and any concurrent web Dropbox connector expiry.
- Investigate `ensureCredentialVersion` destructive path and whether it runs against preexisting valid refresh grants.
- Reproduce idle reconnect, report HTTP class without sensitive body, and verify pending writes.
- Add unit/instrumentation tests for migration from missing marker, token expiry, simultaneous workers, offline queue, retry/restart, profile isolation, and work cancellation.
- Confirm whether HealthHub's new-entry form uses native Dropbox credentials or independent browser OAuth, because fixing one does not automatically fix the other.

Acceptance: no manual reconnect after idle with valid refresh credential, no silently lost input, stale states explicitly labelled, current signed release unaffected until gates pass.
