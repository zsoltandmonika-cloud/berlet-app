# HealthHub v0.15 · Remote Control Center + RAG monitoring

**Implementation status:** Draft PR only; no production deploy or phone APK installation.

## User experience: existing HealthHub Admin Center

The existing **Central Sync Orchestrator** panel is extended in place, not replaced with a new site/app.

- Per registered Android device, show **RAG** indicators for **Phone**, **Health Connect**, **Samsung Health Data SDK** and **Dropbox**.
- Separate Admin cloud badges for **Dropbox vault** and **Supabase health profile access**. A green cloud badge requires a *real* successful Dropbox fetch or a successful authenticated Supabase telemetry write, respectively; mere sign-in is amber.
- Expand per-phone **Adatmonitoring** for source freshness, latest actual measurement day, reads, writes, counts and categorized errors, using only metadata.
- All remote buttons are displayed for v401-registered active physical devices only; newer actions must also appear in the **capabilities advertised by that actual Connect app**.

## RAG rules (v0.15 draft)

| Level | Meaning | Examples |
| --- | --- | --- |
| Green | Verified recent state | Phone checked in within 45 minutes; source read AND upload are within 8h AND latest daily measurements are recent; successful cloud round-trip |
| Amber | Late, pending, or not yet demonstrated | Phone 45 minutes to 8h since check-in, 8–24h old source upload, stale underlying measurement day, no successful upload yet, unauthenticated/unverified cloud connection |
| Red | Requires attention | Phone more than 8h since check-in, enabled source upload over 24h old, missing HC permission/action needed, active error, Dropbox authorization revoked |
| Grey | No claim of health / not applicable | No heartbeat; collector disabled; proprietary SDK absent; data not yet reported |

**No file-export-timestamp or recent UI render is sufficient alone to mark actual measurement freshness green.** HealthHub uses metadata-only source read timestamps, latest underlying measured date and cloud upload receipt.

## Remote actions (existing Dropbox / Orchestrator channel)

| Button | Command | Phone action | Result contract |
| --- | --- | --- | --- |
| ❤️ HC SYNC | `health` | Existing on-device Health Connect read and Dropbox upload | DONE only if succeeded, FAILED/PARTIAL on error |
| ⌚ SAMSUNG | `samsung` | Schedule existing local, previously authorized Samsung reader via WorkManager | QUEUED, then observe later verified upload in source telemetry |
| 🔎 DIAG | `diagnostics` | Upload another metadata-only orchestrator heartbeat | DONE once heartbeat upload returns |
| ↻ RETRY | `retry` | Queue Health Connect resilient worker | QUEUED, then observe later verified health upload |
| 📦 OTA CHECK | `ota` | Check existing signed GitHub APK release metadata; potentially notify owner | DONE for check, but never silently install |
| ↻ STATUS | local | Re-read Dropbox device heartbeats and per-device status | Immediate result from cloud; no remote phone wake required |

**No remote shell, no arbitrary code, no permission grant, no credential export and no silent APK installation.** Android can delay WorkManager and require user permission.

### Remote bounded configuration

Where the Samsung SDK is installed and the device user has expressly opted in to automatic collection, an authorized HealthHub Admin may set the **Samsung periodic interval** to **4, 6, 8, 12 or 24 hours**:

- Admin checks selected physical phone in v401 registry and authenticated Supabase profile access.
- User confirms the target and interval, then a small JSON configuration is written to `/HealthHub/orchestrator/config/{deviceId}.json` in the existing Dropbox vault.
- Device checks profile/device identity, schema, revision, issue/expiry time and allowed fields during its next locally initiated check-in.
- Staged local A/B configuration can roll back after errors or trial timeout. A new remote interval is considered proven only after an actual unattended Samsung read and verified upload.
- Only scheduling parameters change. This is a narrow Dropbox-authorized control, **not a general cryptographically signed remote administration service**. Stronger authorization/signing is a later hardening requirement before public/multi-family scale.

## Privacy and scale

- No clinical measurements, PDFs, names, raw SDK records or API tokens in diagnostic telemetry.
- Dropbox holds latest per-device structured heartbeat.
- Existing HealthHub-Core Supabase uses RLS-protected `hh_collector_telemetry` latest snapshot table, keyed by profile and device.
- Current Supabase mirror is browser-mediated and requires an authenticated HealthHub Admin web session. With all authenticated browsers closed, the phone still emits Dropbox heartbeats, but Supabase latest snapshot replication is not continuous. A secure server bridge is future work.
- Family development: existing GitHub/Supabase/Dropbox plans only. No new subscription created.

## Release / QA gates

- [ ] PR fallback debug build and Admin source RAG regression tests pass (not an SDK-enabled APK).
- [ ] Samsung SDK AAR supplied privately, real SDK build compiled against actual package/signature.
- [ ] OTA signing match checked with installed 0.14.0, Samsung SDK entitlement verified.
- [ ] Pilot observes first real heartbeat, RAG status, authorized command and subsequent actual source upload on device.
- [ ] User-authorized remote scheduling policy tested and rollback verified.
- [ ] Supabase mirror verified after authenticating to HealthHub Admin.
- [ ] Old two-app setup retained until migration proven, especially for background data reads.

**Draft PR #162 remains blocked from production release.**
