# HealthHub v731 | ChatGPT Analytics: Dropbox-first, no redundant Google Drive copy

**Approved architecture (2026-10-20):** The user wants the complete HealthHub health record (Zsolt and Mónika, separately) available for ChatGPT Analytics. Use the existing **private Dropbox HealthHub vault** as the canonical read source. Do **not** activate the experimental Google Drive bulk-mirror v730. It is not part of the shipped runtime.

## Security boundary

- HealthHub -> private Dropbox is **one** authorization. ChatGPT's Dropbox plugin is a **second**, user-controlled authorization, not automatically inherited from HealthHub. Never call this connected merely because HealthHub's Dropbox OAuth is active.
- A connected ChatGPT app only accesses files exposed by that connection and its permissions; verify its ability to read the **Dropbox App Folder /HealthHub** in particular. Do not claim ChatGPT can browse an app-restricted folder until a real connector search/read succeeds.
- No medical records, values, OAuth refresh tokens, API credentials, or permissions are to be added to GitHub, logs, or public endpoints.
- The chatbot reads data on a requested analysis. Plugin connection does not itself run HealthHub sync, trigger a daily background ingestion, or guarantee all folders are indexed. Record freshness is independent from connector availability.
- A file not present in Dropbox must never be marked "synced". Missing/delayed/offline sources must be listed as missing; stale data are labelled with source timestamps, not disguised as current.
- **No destructive migration** of existing health data. Preserve original documents, profile separation, provenance, and revisions. Exclude non-health device-control commands and credentials from analytics output.

## Canonical HealthHub source inventory / coverage audit

| Category | Existing source or typical Dropbox path | Status of ChatGPT Dropbox access |
| --- | --- | --- |
| Profiles, documents, explanations, medications, appointments | `/HealthHub/master/{profiles,documents,explanations,medications,appointments}.json` + `manifest.json` | HealthHub v304 sync exists, connector access not verified |
| Comprehensive combined source | `/HealthHub/master/medical-master.json` | HealthHub v715 conditional 6+1 build exists; connector access not verified |
| Symptoms | `/HealthHub/master/symptoms.json` | HealthHub v307 sync exists; connector access not verified |
| Nutrition, food, drink, BS/AJ, notes | `/HealthHub/profiles/{profile}-nutrition.json` | Nutrition Dropbox sync exists; connector access not verified |
| Health Connect / Samsung-imported activity, sleep, pulse etc. | `/HealthHub/profiles/{profile}-health-connect.json` | Android/web sync path exists; data completeness and connector access not verified |
| Profile vault and measured data | `/HealthHub/profiles/{profile}-vault.json` | Existing sync path exists; data completeness and connector access not verified |
| Digital Wellbeing | `/HealthHub/profiles/{profile}-digital-wellbeing.json` | v507 reader exists; verify actual producer and latest file (read-only alone is not proof of daily upload) |
| Nutrition photos / source imagery | `/HealthHub/profiles/{profile}-nutrition-images/`, `/HealthHub/shared/nutrition-images/` | Private Dropbox binary paths exist; connector content access not verified |
| Health context | `/HealthHub/sync/{profile}-lena-health-context.json` | Event-driven context exporter exists; connector access not verified |
| HealthHub Daily Health factors, personalized AI reports | Private Supabase / device local storage | **Not automatically exported to Dropbox by existing reports code**; needs separate secure opt-in/export design |
| Original medical PDF binaries | IndexedDB and Drive archive in some deployments; Dropbox `/HealthHub/documents/files` designed as canonical binary location | Verify actual Dropbox originals, hash, and readability before claiming completeness |
| Screen-time pilot, raw Samsung/Health Connect and other solely local captures | Android / local browser cache depending on implementation | Treat as missing unless verified in canonical Dropbox; never silently omit |

This inventory describes code-level paths, not claims that all user records currently exist remotely.

## Definition of "everything is synced" (strict)

1. Each module identifies the exact source record, profile, timestamp, retention, schema and Dropbox destination.
2. Verify source -> Dropbox upload/download **per source** including tombstones and revisions; capture counts, missing fields and last success.
3. Verify that ChatGPT's **connected Dropbox plugin** can find and read the same actual files. Connector setup is done by the user.
4. Check both profiles, BS/AJ entries, medication changes, original PDFs and 30-day Digital Wellbeing history. Check Supabase private reports separately.
5. Report explicit pass/fail per source. No broad "ready" state before every required source passes.
6. Only **after** connector visibility is proved, introduce a private metadata/provenance index to make ChatGPT Analytics more efficient. Never copy credentials, raw secrets, publicize clinical data, or silently enable unapproved third-party transfers.

## Update behavior

Dropbox modules are primarily **event-driven, on opening HealthHub or saving data**, not an independent guaranteed daily background job. This makes fresh reads conditional on a sync actually succeeding. A 24/7 schedule, if required, must run in a secured authenticated worker with explicit privacy review; neither ChatGPT connector installation nor a GitHub Pages timer provides that.

## Implementation status

- **DECIDED:** Dropbox-only ChatGPT data access, existing Dropbox remains canonical.
- **IN CODE:** Some module-specific Dropbox writers/readers and Medical Master generator.
- **NOT VERIFIED:** Actual ChatGPT Dropbox connection, folder visibility, cross-source data completeness.
- **NOT DEPLOYED:** Continuous consolidated server-side 24/7 "all health data" synchronization.
- Google Drive v730 prototype exists in the repository but is **not loaded by HealthHub**; do not enable it under Dropbox-first decision.

## Operator next action

Connect Dropbox to ChatGPT via the user's Plugin settings, then issue a targeted connector read of the app-folder `/HealthHub/master/manifest.json` and one non-identifying metadata check on each profile. If folder is not visible, resolve provider permissions or create an explicit secure Dropbox **AI export** folder with approved scope, without silently spreading health records.
