# HH One · One Agent / One Sync / Léna Service Center

**Priority 1, agreed 2026-10-14.** This is a staged migration plan, NOT a claim that HH One is already installed.

## Non-negotiable outcome

Exactly **one** actively maintained and installed HealthHub collection agent per registered physical phone, owned by Zsolt or Mónika. Preserve the existing Connect Android package ID `hu.zsoltmonika.healthhubbridge`, stored profile and token state, working Health Connect records and historical data.

Avoid requiring the family to keep installing Screen Time PILOT, Health Connect PILOT and Samsung PILOT as separate permanent collectors. Migration is completed only after the same physical phone runs a single signed agent with all accepted capabilities and the previous pilot data has been safely handled.

## Existing assets confirmed in repository

- HealthHub Connect 0.14.0: native Android health collector, internet/Dropbox credentials, Health Connect, remote commands through OrchestratorWorker, update checks and signed-APK OTA client.
- Central Sync Orchestrator v305 + device registry v401: unique enrolled Android device IDs and owner selection; command queue; status/heartbeat metadata. The current Android `full` path **skips** some scopes and does NOT collect Screen Time usage or guarantee fresh Sleep/Samsung records.
- Screen Time pilot 0.3.0 source (PR #204): Usage Access observation, optional app detail consent, local hourly/30-day ledgers, WorkManager daily slots and foreground manual collection. **Separate offline Android package**, NOT automatically merged into Connect.
- Existing unmerged draft PR #162 has an experimental 0.15 Thin Collector, Samsung source gates and Admin RAG. Review and rebase selectively rather than shipping conflicting branches. Samsung proprietary licensed AAR, real Samsung authorization and APK signing must be confirmed.
- Main HealthHub is a bundled SPA; Digital Health has a standalone web document. Both need the same easily reachable ecosystem indicator without introducing duplicate dashboards.

## Canonical native agent

- Retain the already deployed Connect application identity and proven permanent signing certificate. **Do not change Android applicationId**; product label/icon may become HH One in a signed update.
- Source adapters:
  1. Health Connect: Health, Activity, Sleep and supported vital records, preserving provenance and source timestamps. These are separate consumers but share their source adapter; do not read Samsung proprietary data merely by assuming it is in Health Connect.
  2. Android Usage Access: coarse completed-hour foreground observations, ChatGPT app engagement, optional app details; explicit per-owner consent and no access to app messages or URLs.
  3. Optional Samsung licensed adapter: only if the SDK/partner authorization and signing identity pass review; this is NOT the authoritative source until verified.
- **One coordinator**: source-specific jobs with a single serialized scheduler and deduplicated observation windows; configurable 6/12/24-hour baseline and up to eight local target times. Android background wake times are inexact. A local Collect Now action returns actual success/error from each requested module.
- No secret Dropbox or service tokens in APK source, GitHub Pages or external admin logs.
- Default data handling: on-device private coarse 90-day / detailed 30-day retention from pilot, no automatic app identity upload. Distinct revocable consent for sensitive collection, transfer, service diagnostics, and remote operation.
- Offline resilient: local data first, bounded retry and battery-aware batching, never fabricate missing time as zero.

## One central connection, OTA and diagnostics

- Existing OTA validation requires matching package ID, incremental version, signer, SHA-256 and user-controlled Android install consent. **Never promise fully silent system updates** or survival after irreparable install/certificate/data corruption.
- Build reproducible signed releases and staged rollout (Zsolt test -> Mónika), store rollback metadata and last-known-good with no signing key in Git. Investigate current installed certificate *before* any APK replacement/uninstall.
- Remote requests must be device-ID and owner-profile bound and authorized, with nonce/requestId, TTL, idempotent replay protection, least-privileged action, revocation, audit, and actual device acknowledgements. Queueing != completion.
- Actions: `collect.health`, `collect.activity`, `collect.sleep`, `collect.digital`, `collect.all`, `sync.pending`, `diagnostics.read`, `ota.check`, `config.update`. Each module reports `queued/accepted/running/collected/uploaded/failed/unsupported`; parent all-success requires all approved requested modules to finish.
- The Léna Service Center should expose technical-only logs, version, battery/permission and adapter freshness, failure reason and OTA state. Medical results and app identity histories must not appear in generic technical telemetry.
- **Assistant access is not automatic**: the Service Center data are accessible to Léna only through an explicitly connected, appropriately authorized tool/connector; a webpage or unrestricted diagnostic URL does not confer persistent assistant access.

## RAG ecosystem status on every page

- Global fixed badge available in the main SPA and standalone Digital Health; other independent standalone modules follow via shared include when audited.
- **GREEN:** authenticated vault and both distinct registered, explicitly owner-bound phones have fresh heartbeat without active failure; this indicates recent **connectivity only**, NOT all health data synced.
- **AMBER:** partial/unverified/aging heartbeat, commands pending, offline standalone context without authenticated status, or only one eligible phone.
- **RED:** verified cloud connection absent/failed or both phones missing/unreachable; distinguish cloud failure from stale phone in details. RAG should not classify missing verification as success.
- Tap opens **HH One / Léna Service Center** with per-phone owner, last-seen, last actual health upload, current command state, last error, source freshness where reported.
- Owner-confirmed `SYNC KIJELÖLT TELEFONOK` button may initially issue **existing Health + Activity** jobs only, through v305's verified v401 registry. The UI must call that scope what it is, not `FULL`. Existing queued/partial/done statuses are NOT sufficient proof of all source freshness. A real `ALL MODULES` operation requires the new native Agent and per-source proof first.
- Standalone Digital Health without authenticated vault shows `nem ellenőrzött` and links to authenticated Home Service Center; it must not reuse an old green icon.

## Release and verification gates

1. Audit installed package IDs, certificates, current Connect features and legacy data/consent on **both** phones. No uninstallation.
2. Integrate Screen Time pilot collector into original signed Connect app *without breaking existing Health Connect/OTA flows*; test permissions, profile isolation, lock/race and background scheduling.
3. Add device-bound command/status/schema v3 and secure diagnostics with acknowledgement; create end-to-end synthetic tests for two devices, profile mismatch, offline/replay/timeout and no false DONE.
4. Verify a reproducibly signed update that Android accepts on Zsolt's device without clearing data; then repeat on Mónika after approval.
5. Activate one-button all-module sync only after actual two-phone handshake, per-source data upload and readback. Remove separate pilot apps **only after** explicitly verified data-preserving migration and user approval.

## Practical known blockers

- Existing Connect APK signing identity on each phone is not yet verified against a deployable long-term signing certificate.
- Existing Connect remote `full` reports `done` even when `structured/profile/devices/lena` are `skipped`. Correct semantics before exposing a real all-module success check.
- Old pilot has deliberately no INTERNET permission. A cross-package broadcast would not be safe or sufficient as the long-term architecture.
- Samsung licensed SDK integration and phone QA remain gated; no vendor data may be invented.
- Android WorkManager cannot guarantee exact wall-clock execution when Doze/battery restrictions apply.
