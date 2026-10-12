# HealthHub Connect v0.15.0 · Android collector unification blueprint

**Status:** DESIGN / IMPLEMENTATION NOT STARTED. Documentation only.  
**Baseline observed on 2026-10-12:** HealthHub Connect `0.14.0`, HH Samsung Beta `0.14.0-beta`. Shared version numbers do **not** establish shared Kotlin/Java code, identical package identifiers, signing keys, or SDK permission. They must be inspected.

## 1. Outcome

Ship **one upgradable HealthHub Connect native Android APK**, with two independent data collectors and one reliable uploader; eliminate the need for the HH Samsung Beta only **after verified parity**.

```text
Samsung Health / Galaxy Watch  -> Samsung Health Data SDK collector --+
                                                                     |
Android Health Connect         -> Health Connect collector -----------+--> source-separated staging
                                                                           -> validation + provenance
                                                                           -> deduplication + upload queue
                                                                           -> Dropbox profile archive
                                                                           -> HealthHub Activity display
```

The collectors must not count the same steps, activity minutes, or exercise session twice. Preserve each original source row and provenance.

## 2. Verified functional baseline

### Beta 0.14.0-beta (observed app UI)

- Read current Samsung Health daily data (manual action).
- Save Samsung result to own JSON (UI action may be disabled until data read).
- Authorize Dropbox Vault for the Beta application.
- Upload latest Samsung data now.
- Toggle periodic automatic Samsung sync (UI indicates approximately every four hours).
- Trigger a background sync trial now.
- Show success/failure and timestamp from the app; Android battery restrictions may delay work.

### Connect 0.14.0 / HealthHub web components

- Health Connect native source with device registration, background access, permission and profile checks.
- Central Dropbox command/status protocol; Android background execution subject to OS scheduling.
- HealthHub browser Activity imports profile-specific Health Connect JSON and optionally Samsung SDK JSON; `healthhub/live-v191.js` renders the combined view.
- `healthhub/live-v371-samsung.js` reads `/HealthHub/profiles/{profile}-samsung-health.json`, validates schema `healthhub.samsung.daily/1*`, handles stale export data and enriches the Health Connect view without blindly overriding fresher values.
- `healthhub/live-v306.js` exposes Health Connect phone state, last HC read, last cloud sync, diagnostics and remote sync controls.
- `healthhub/live-v373-samsung-import.js` supports user-confirmed manual Samsung JSON import.
- **Observed manual round trip**: Samsung steps matched the HealthHub display after Beta read and upload; source-specific calorie/distance indicators still need semantic reconciliation. This smoke test does not prove unattended scheduling.
- Export time alone does not establish the timestamp or completeness of underlying Health Connect measurements.

## 3. Modules to consolidate

| Module | From | Target |
| --- | --- | --- |
| Health Connect reader/permissions | Connect native | Retain unchanged initially; adapt interface only |
| Samsung Health Data SDK reader | Samsung Beta native | Move to isolated `SamsungCollector` implementation |
| Samsung JSON serializer | Samsung Beta native | Preserve currently accepted schema until validated migration |
| Dropbox OAuth / vault upload | Both apps currently | One account/session implementation, secure local credentials, separate files per source and profile |
| Periodic scheduler | Both native apps | One WorkManager-based (or current proven equivalent) scheduler and retry queue |
| Sync now, diagnostics | Connect UI | One dashboard; source-specific substatus + shared sync action |
| Profile guard | Both + HealthHub browser | Explicit source profile; reject mismatch, no cross-profile writes |
| Web source resolution | `live-v191.js`, `live-v371-samsung.js` | Preserve compatibility with existing uploaded JSON until new Connect is proven |
| Historical local cache | browser/Connect | Migrate without deleting old records or re-counting duplicate sessions |

## 4. Security and feasibility gates BEFORE coding

1. Obtain and inspect actual native source projects for **both** APKs, not just their version numbers or screenshots. Locate `AndroidManifest.xml`, `applicationId`, signing configuration, SDK dependencies, build variant and WorkManager/periodic job definitions. Native source locations have **not yet been verified** in the currently checked repository paths.
2. Confirm Samsung Health Data SDK access and distribution entitlements for the **Connect package and signing certificate**; do not assume Beta's approval or test access transfers automatically. Validate dependencies with actual project configuration and vendor terms.
3. Verify Health Connect read permission scopes, optional background read capability, Android version/API limitations, and re-consent requirements after installation/update.
4. Confirm Dropbox OAuth behavior when merging applications: secure token storage, token ownership, profile authorization and refresh/reconnect. Do not hardcode private keys or credentials in the GitHub repository.
5. Protect existing APK install signatures: in-place update of the current Connect requires matching application identity and signing certificate; otherwise plan an explicit user-approved migration.
6. Keep the existing Beta installed and enabled as a **known-good reference** until the replacement passes unattended tests.

## 5. Native design (proposed, not implemented)

```text
HealthHubConnect
 ├─ HealthConnectCollector: available source scopes and last read result
 ├─ SamsungCollector: SDK availability, permission, daily/interval/workout payload
 ├─ CollectorRegistry: activate supported, authorized sources only
 ├─ SourceValidator: patient profile, date range, units, record counts, hash
 ├─ DataReconciler: source priority per metric; deduplicate exercises/steps
 ├─ SyncCoordinator: encrypted durable queue, idempotency keys, retry/backoff
 ├─ VaultUploader: store {profile}-health-connect.json and {profile}-samsung-health.json
 ├─ SyncJournal: last measurement/read/export/upload/ack for each source
 ├─ Scheduler: battery-aware periodic work, manual trigger also supported
 └─ ConnectSettings: source permissions, status, error details, controls
```

- Preserve raw source data and lineage; do not replace Health Connect's JSON with Samsung output.
- Keep the storage contract `/HealthHub/profiles/{profile}-samsung-health.json` compatible with `live-v371-samsung.js` during migration.
- Upload source files with atomic or collision-safe replacement and verify successful readback/acknowledgement; never mark green after merely scheduling a job.
- Distinguish event times: last **measurement** vs last **collector read** vs last **file upload** vs last **HealthHub display**.
- Treat missing calories as **missing**, not zero and not guessed measurement; derived estimates must stay labeled.
- For today, use a selected source only if it is legitimately newer in terms of data collection **and** the same metric; freshness of a file does not prove freshness of recorded values.
- Local time boundary for the profiles is Europe/Budapest; retain source UTC timestamps and normalize presentation, not the underlying events.
- Schedules are approximate: Android can defer periodic jobs. Document actual execution latency and recovery after sleep, reboot and loss of network.

## 6. Safe rollout

**Phase A — Native source audit (blocking):** inspect both Android projects, SDK package entitlement and signing. Produce module-by-module extraction map and hard blocker list.

**Phase B — SDK integration:** compile a separate Connect `0.15.0-dev` APK containing SamsungCollector; no Beta uninstall. Make native SDK status and permissions visible.

**Phase C — Unified scheduler/uploader:** connect sources through shared queue and profile-checked Dropbox OAuth. Preserve existing cloud paths and web reader for backwards compatibility.

**Phase D — Canary on the first pilot device:** keep both installed. Compare source records on the same day and timestamp; prevent duplicate upload/double counting. Test intermittent network, device restart, battery saver and profile switching.

**Phase E — Unattended validation:** observe at least two independent periodic sync successes over an overnight/24-hour period without any manual tap. Confirm measured activity changed and source timestamps advanced; distinguish a stale successful upload from a fresh reading. Verify webhook/no-interaction HealthHub refresh upon opening and foregrounding.

**Phase F — Gradual retirement:** only after signed APK and Samsung SDK authorization are verified, deploy same safe Connect on the second pilot device. Beta stays as rollback until success there too. Remove Beta by deliberate user action only, no automatic uninstall.

## 7. Acceptance checklist

- [ ] Connect 0.15.0 launches, installed/upgraded without losing profile and prior data.
- [ ] Health Connect reads succeed with authorized permissions.
- [ ] Samsung SDK reads steps, daily active calories, active minutes, floors and supported exercise/distance with accurate provenance.
- [ ] Same-day duplicate steps or overlapping exercise intervals are not added twice.
- [ ] Dropbox saves distinct profile/source files; no cross-profile exposure.
- [ ] Uploaded source hash and sample record timestamps are verified.
- [ ] UI displays *last measurement*, *last collector read*, *last successful upload*, *last local display refresh* separately.
- [ ] At least two autonomous periodic cycles pass without opening Beta or pressing a sync button.
- [ ] Foreground HealthHub Activity shows the latest verified source, or an honest stale/error state.
- [ ] No false green status when SDK permission, cloud upload, source freshness or profile identity fails.
- [ ] Rollback to original Connect + Beta is available.

## 8. Decision and scope boundary

**Approved direction:** one native HealthHub Connect, two data providers, one verified coordinator.  
**Not completed:** native code migration, Samsung entitlement check, build, APK signing, installation, autonomous cycle test.

Do not start changing the production browser bootstrap to compensate for a missing native Android integration. It cannot provide proprietary SDK access or OS-scheduled background execution.

## 9. Remote managed collector and A/B self-healing design (v0.15.0 scope refinement)

**Goal:** Once installed, the minimal Android collector should accept safe, authenticated, limited remote maintenance and configuration without routine physical phone interaction. The cloud handles the orchestration, transformation and observability; the device keeps only the hardware-bound data acquisition, local queue and scheduler.

### 9.1 Clear update classes and platform boundaries

| Update class | Remotely deployable without a new APK? | Mechanism |
| --- | --- | --- |
| Interval, sync window, retry/backoff, logging level, source-preference policy | Yes (when device checks in and command is valid) | Versioned, signed remote configuration |
| Enable/disable supported collector, select safe diagnostic request, refresh cloud credentials | Yes, within existing capabilities | Strict allowlisted commands with expiry/ack, user-approved permissions |
| Server normalization, conflict resolution and dashboard presentation | Yes | GitHub + server-side deployments within existing cloud stack |
| Kotlin/Java code, native Samsung SDK dependency, Android permissions/manifest | No; real signed APK update required | Verified release package, certificate/package continuity |
| Unattended APK installation | **Not promised** | Normally Android installation consent or a special eligible installer/update channel; see Android PackageInstaller rules |

**Never** implement generic remote shell, fetched executable scripts, code evaluation, dynamic dex loading, unrestricted file browser or permission escalation. No remote control of other applications or phone settings without user action.

**Vendor and OS caveat:** Android PackageInstaller allows no-user-action installation only under enumerated installer/ownership/permission/target SDK conditions. A sideloaded APK and ad hoc GitHub download do **not** automatically satisfy them. On unsupported setups, show a safe update notification and obtain user confirmation.

### 9.2 Device-initiated remote channel (no inbound port, no paid service prerequisite)

- Use current authenticated Dropbox command queue or the existing Supabase backend as transport; choose one **after** confirming authentication, cost and authorization. Do not create a new account/subscription during development.
- Phone initiates TLS polling during reliable local background jobs, on foreground and on connectivity return; server does not require inbound access to a home/mobile network.
- Registered device identity, profile binding, credentials stored in Android secure storage; rotate and revoke on loss. Use least-privilege backend service keys and enforce RLS. Do not treat a Google/Dropbox OAuth session alone as authority to execute admin commands.
- Commands contain a UUID, device ID, profile ID, action enum, schema version, issued/expiry timestamps, monotonic sequence, operator/approval, optional payload digest, and authenticated signature/HMAC. Reject replay, unknown command, wrong device/profile, stale/expired, oversized payload, unknown schema. Log hash/command status, not sensitive medical values.
- Restrict to: `read_source`, `enqueue_sync`, `refresh_config`, `diagnostic_summary`, `rotate_token`, `report_health`, `check_release`. Sensitive scope or device permission changes remain a local confirmation step.
- Outbound states: `received` -> `validated` -> `queued` -> `running` -> `uploaded` -> `verified` / `failed` with retry reason. No green state for a merely queued command.

### 9.3 A/B LAST-KNOWN-GOOD configuration slots (not two Android boots)

- One signed installed collector binary, two atomic local **configuration** slots: A (active) and B (last-known-good, if valid).
- Download schema-versioned config to inactive slot; verify authenticity, checksum, profile, supported feature flags and expiry.
- Dry-run parse and validate constraints; activate only after healthcheck / an actual successful read+verified upload within an agreed observation window.
- If crash-loop, repeated invalid JSON, job timeout, auth error or upload failure is due to new config, revert active pointer to known-good slot and report to cloud.
- Keep a non-overwritable minimal safe built-in configuration that retries and uploads when connectivity returns. Never erase pending measurements when reverting.
- A/B config is **not** a full application binary rollback. For signed APK, preserve old verified release, offer explicit user-assisted rollback/upgrade plan; Android package downgrade may be blocked.
- Separate config version from APK version; no attempts to run new native SDK behavior via cloud configuration if binary does not support it.

### 9.4 Self-healing, durability and actual guarantees

- WorkManager or current verified native equivalent for unique periodic jobs, persisted after app/device restart, with sensible backoff and allowed battery/network constraints; no duplicate recurrent workers.
- Reschedule/check on boot and app update within Android broadcast/background execution restrictions; on screen-open perform opportunistic sync if stale.
- Encrypted at-rest local queue with idempotent item keys, retention limits, upload receipts; do not delete queued data until server acknowledged a digest or record manifest.
- Fail clearly on permission revoked, forced stop, app uninstall, storage exhaustion, damaged secure token, battery policy lockout or Samsung SDK block. A collector cannot bypass these constraints.
- Android WorkManager periodic execution is inexact under Doze and battery optimization; server may request, but cannot guarantee immediate device wake.
- Server health monitor triggers alert when last *actual source read* or verified upload exceeds policy, not when just a file timestamp advances.
- Keep a plain-language diagnostic screen on device as a last-resort recovery path.

### 9.5 Update/release safety

1. Admin publishes a **signed versioned manifest**, with SHA-256 APK digest, minimum compatible collector version, target device ring, release notes, permissions diff and rollback instructions.
2. Canary on one opted-in test device, confirm permissions, source read, upload, profile safety and battery drain.
3. Expand to remaining devices only after verified autonomous sync and no regression; freeze and stop rollout if error thresholds exceed limits.
4. For pure remote config, A/B rollback on local validation/healthcheck failure; for APK updates, require appropriate Android-supported verified installation flow and user approval whenever required.
5. Never publish signing keys, Dropbox secrets, OAuth refresh tokens, health record content or device unique identifiers to a public GitHub repo.

### 9.6 Acceptance criteria to add

- [ ] Remote config applies on next device check-in, validated and acked without physical interaction.
- [ ] Corrupt remote config rejected; proven last-good config survives app restart and Android reboot.
- [ ] 1 revoked/expired/wrong-profile remote command causes zero data mutation or privileged action.
- [ ] Collector keeps durable measurements offline and safely uploads on reconnection without duplicates.
- [ ] Server displays last check-in, last source read, last data event, upload receipt and last applied config separately.
- [ ] Application binary updates and Android permissions are never claimed to be silently remotely installable without satisfying platform rules.
- [ ] Operating costs remain within existing GitHub/Supabase/Dropbox accounts during family development; no additional recurring service by default.

Official Android references:
- https://developer.android.com/develop/background-work/background-tasks/persistent
- https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work
- https://developer.android.com/reference/android/content/pm/PackageInstaller.SessionParams
