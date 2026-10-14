# Digital Health central trigger and sync · Stage 4 security gate

**Not implemented or activated in the v0.3.0 offline Screen Time Pilot.**

The existing production HealthHub Connect and Admin use a separate device/Dropbox
orchestration path (bridge request schema v2: sync, diagnostics). The standalone
Screen Time Pilot has another package identity, no INTERNET permission and
no shared signing identity with Connect. Sending an existing bridge sync command
does **not** make the Screen Time Pilot collect or upload anything.

## Goals: distinguish remote operations

1. **Collect only:** admin queues a request; an explicitly enrolled **single**
   owner-bound phone pulls it, samples Android UsageEvents locally, writes to its
   existing private ledger, returns run status. NO private usage payload upload.
2. **Collect + sync:** only with a **second explicit on-phone outbound-data consent**,
   a validated time-bounded subset of aggregate hour readings may be sent via an
   authenticated profile-scoped private endpoint. The app-detail/identity ledger
   is separately opt-in and default OFF for transfer.
3. **Local now button:** always independent of cloud availability or remote access;
   no queues or backend are required to sample while the foreground app is open.

## Mandatory handshake before any remote button is enabled

- Provision an authenticated, least-privileged private API, **not GitHub Pages**
  or public Dropbox file/URL. Never embed central Dropbox tokens, service keys,
  or GitHub OAuth tokens in Android APK, HTML or source control.
- Register device ID bound to the verified on-phone owner (zsolt or monika);
  reject mismatch, revoked and unknown devices.
- Show separate OFF-by-default, revocable **Remote collection permitted** toggle,
  and independent **Remote private upload permitted** toggle with a clear scope.
- Requests require server-verified owner authorization, target device, request
  ID, narrow action enum (collect_only or collect_and_sync), creation time,
  short expiry (max 15 min) and one-time nonce. Rate limit by device.
- Device authenticates the server and itself over TLS; enforce signature/nonce
  or server-authenticated one-time command claim. Reject stale, duplicate,
  cross-profile or already completed requests. Never trust client-supplied profile
  IDs without server authorization.
- Poll via WorkManager while explicitly enabled or use authenticated Android
  push in a future build. Background Android execution remains **inexact**;
  the Admin must never promise instantaneous remote collection.
- A device's acknowledgement is separate from completion, and uploading is
  separate from local collection. Show state transitions:
  queued -> acknowledged -> running -> collected_locally -> uploaded (if allowed).
  Terminal alternatives: denied, expired, failed.
- Acknowledgement includes device ID, profile, request ID, collection source,
  completed timestamp, result/error class; no raw app names in the command
  acknowledgement. Keep an auditable, minimum-data command history.
- Existing retention must remain: 90 days coarse, 30 days detailed on-device;
  app identity data never transmitted by default. Device STOP, consent revoke,
  profile invalidation and app-data reset must stop polling and invalidate tokens.

## Acceptance before rollout

- Backend API with authorization and RLS tests (two-owner isolation and wrong
  device rejection), TTL/replay tests, revocation test, duplicate delivery test.
- Two phones, two accounts, real device-bound consent, verified command requests,
  actual phone acknowledgement and **separate** success/failure evidence.
- Device screen off, battery saver, offline/reconnection, DST, repeated commands
  and simultaneous local/remote/periodic collection tests.
- Reproducibly signed update to preserve existing APK installation/data, or an
  explicitly approved privacy-safe migration. CI ephemeral debug APK cannot
  silently update two previously installed packages.

**No "Sync now" control should claim success until the phone reports both
collection completion AND the separately authorized cloud upload.**
