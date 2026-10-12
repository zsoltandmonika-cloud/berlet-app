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
