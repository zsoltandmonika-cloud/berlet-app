# HH One v502 · Remote Service Control on existing HealthHub Connect

## Deployed platform vs. on-phone update

This change extends **the existing** `hu.zsoltmonika.healthhubbridge` application
from 0.14.0 (buildCode 20) to proposed **0.14.1 (buildCode 21)**. No new
Android package, separate collector app or different user data path is created.

**Not installed merely by merging source.** Phone rollout requires CI build,
verified matching installed signing certificate, separately published signed
OTA manifest for the correct rollout profile, Android installer approval and
both phones' owner acceptance. Never uninstall the installed Connect or Screen
Time PILOT to force a debug update; doing so could destroy local data.
A private signing key must remain in GitHub Secrets, never public.

## Already supported on Connect 0.14.0

- Dropbox orchestrator `healthhub.orchestrator.command/1` with owner-specific
  device identity and periodic WorkManager ~15-minute background poll. Android
  Doze may delay it further; not an instantaneous push service.
- Remote `health` reads/Dropbox upload, and **remote OTA check** for a signed
  v0.14+ candidate. The phone can display OTA notification. **No unattended APK
  install** or guarantee of successful update merely from a cloud command.
- Existing 401 physical device registry and 305 centralized command path.

## Native improvements proposed for 0.14.1

- Owner-controlled, reversible **HH One remote technical diagnostics**:
  default OFF, explicit consent dialog in the existing Connect app; toggling
  consent requests an orchestrator heartbeat. Revoked when phone owner binding
  is unlocked.
- `OneTechnicalDiagnostics.snapshot` returns metadata only: Agent/OS SDK
  versions, Health Connect availability, permission count, background access,
  last attempted/successful Health read, OTA check timestamp, the presence (not
  value) of a Dropbox refresh token, local sync scheduler states. It includes
  **no** actual clinical values, app usage names, messages, private tokens,
  addresses, stack traces or Health Connect record payloads.
- Heartbeat `capabilities` advertises `diagnostics` only if phone owner bound
  AND diagnostics permission enabled; `ota` is advertised on v0.14.1. Older
  Connect v0.14.0 can still be remote OTA-*checked* by supported buildCode.
- Existing orchestrator validates command target ID, owner-specific profile,
  authorized scope, short bounded issued/expiry timestamps and replay ID.
  Invalid commands produce `rejected`, never silently run.
- Separate service snapshots stored only in command status for the requested
  device; no public GitHub Pages or analytics export.
- Previously `done` could indicate skipped/queued subactions when using
  `full` or `daily`. Now such non-completed subactions return `partial`.
  This does not mean full Health/Sleep/Digital upload is available.

## HH One Service Center / Admin web

- Per registered, owner-bound Android phone: actual OTA check timestamp,
  available signed candidate, errors, command state.
- **OTA CHECK** uses the already supported `ota` scope, including on 0.14.0,
  to ask the phone to check and (if applicable) notify; not to install.
- **Távoli DIAG** enabled only when a v0.14.1+ phone actually advertised
  diagnostics consent. Results are fetched back from status and rendered after
  Android returns `done`. Sending a request shows **QUEUED** until then.
- Both buttons revalidate the v401 registry and owner-ID immediately before
  command dispatch. Each action requires local operator confirmation.
- Full multi-source sync, Android Usage Access collection inside Connect,
  large logfile fetch, automated server-side AI issue diagnosis, OTA approval
  queue and all-phased Self-Healing remain **future gates**. Service Intelligence
  v501 remains read-only advice from actually available metadata.

## Safety/rollout gates

1. Source build and CI static/simulation tests pass.
2. Verify installed v0.14.0 signing certificate is compatible with the
   long-lived OTA signing key; no forced uninstall, no silent replacement.
3. Trial remote OTA CHECK on Zsolt without installing; inspect native ACK,
   update offer and signed package metadata.
4. Install the signed v0.14.1 update on Zsolt with Android confirmation; enable
   diagnosis explicitly; test queued → done or failed and snapshot metadata.
5. Confirm no private values in status; verify revocation, cross-owner,
   expired and replayed command rejection.
6. After success, and with Mónika's consent, stage signed update and repeat.
7. Only after two-phone signoff integrate Screen Time collector into this same
   Connect identity and later remove legacy pilots.

## Android installation safety

Google Play automatic updates rely on the Play Store app's privileged/approved
installer role, policy, and user settings. A self-distributed APK **cannot**
bypass Android's installer consent by imitating Play. HH One can check, download,
verify and request the Android installer, with an explicit phone-owner approval
when the platform requires it. Private managed-device/enterprise installer
capabilities would require separately provisioned management and are not the
planned consumer-phone solution.
