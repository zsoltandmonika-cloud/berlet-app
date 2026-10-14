# HealthHub Digital Wellbeing · HH One 0.14.2 · Integration v507

## Canonical data flow (no parallel cloud)

Android **HH One**, package `hu.zsoltmonika.healthhubbridge`, obtains explicit Android Usage Access and locally aggregates **closed** UsageEvents foreground intervals. Numeric and optional per-app readings share a common reducer; unknown hours are not set to zero.

After separate owner confirmation, the same Dropbox App Folder already used by Health Connect receives:
- `/HealthHub/profiles/zsolt-digital-wellbeing.json`
- `/HealthHub/profiles/monika-digital-wellbeing.json`

These are sibling files to `*-health-connect.json` and never overwrite clinical, sleep, nutrition, or activity payloads. Each is overwritten with its current **30-day** window. Android private ledgers also use 30-day retention. Dropbox provider file revision history may have a separate retention period; this client controls only its active published snapshot.

Schema `healthhub.digital-wellbeing/1`, source `android.usage-events.observed-app-foreground`. Fields: `profileKey`, `collectedAtMs`, `retentionDays=30`, `shared`, `missingIsUnknown`, `hours[]` with UTC-hour start, foreground milliseconds, ChatGPT foreground milliseconds and fragments. Optional `appHours[]` contains app package identifier, hourly duration and fragments **only** if both local detailed collection and separate family detail-sharing consents were recorded; no pre-consent hours. No raw events, messages, browser URLs, or tokens in payload.

## Consent and profiles

1. Phone owner is taken from the existing HH One native `device_owner_profile`, never the browser profile selector.
2. Android Usage Access is special Android permission, disabled until the owner explicitly grants it.
3. Local collection OFF by default. The user independently turns it ON and may stop/delete.
4. Dropbox family sharing OFF by default. The owner explicitly approves transmission and explains that both adults on the same shared account can read the metrics. Revocation writes an empty `shared:false` snapshot and prevents subsequent live reads. When offline, pending revocation waits for network and is displayed to the owner.
5. Detailed app identities need an **additional** local approval and an **additional** separate cloud approval; revoking removes app details from the next live shared snapshot and may erase them locally.
6. The existing device owner cannot be unlocked for a different person while cloud sharing/revocation is still active or pending.
7. This family Dropbox is one shared account, **not** individually enforced record-level ACL. Do not claim per-user RLS inside Dropbox.

## User-facing consumers

Digital Health standalone route uses the existing Dropbox OAuth credential from the same browser origin to read the family vault. Incoming files are validated for schema, source, profile, 30-day window, numeric bounds, deduplication, and separate app-detail sharing; missing/unauthorized/error states are distinct. Day, 7-day and 30-day views, ChatGPT app usage, evenings, time rhythm, observed bins, app ranking/categories only use those real values. No demo totals.

Ask Léna Intelligence v328 reads the same verified source during an explicit Intelligence context refresh; the v330 digital answer cites observed times and does not infer health causality from temporal coincidence. Correlating actual sleep nights with evenings requires adequate paired timestamped observations and must not be asserted from one profile snapshot alone.

## QA gates and staged physical acceptance

Automated tests must pass for source validation, profile isolation, extra detail opt-in, missing-vs-zero, duplicate UTC hours, Budapest DST, no visual demo fallback, and Android JUnit aggregation/sessionization plus debug compile. Preserve the existing signed OTA certificate, all Health Connect data and the existing app package.

Do not count a green CI run as a real on-phone Dropbox sync. Release only a signed owner-approved OTA after code validation. Verify **Zsolt's** 0.14.1 → 0.14.2 in-place update, explicit Usage Access and family sharing consent, two successful measured uploads, dashboard real values and revocation before expanding rollout to **Mónika**. Each person must consent separately. Old isolated pilot data cannot be silently read across Android app sandboxes: keep that pilot intact until its history is explicitly handled; new HH One measures its own events.

**Release state:** DRAFT branch only, not yet main or installed. No production claim until phone + Dropbox + two-profile acceptance.

## v508 read-after-write / privacy regression hardening (2026-10-14)

- A successful Dropbox HTTP upload **is not** reported as an end-to-end success until the authenticated Dropbox download returns exactly the uploaded JSON bytes. Network/revision mismatches remain visible failures and are retried.
- Each explicit local/cloud/detail consent transition increments a persistent version. A background upload that overlaps a revocation cannot clear the newer deletion request or announce a stale success.
- Cloud requests use an append-or-replace work chain rather than cancelling an in-flight HTTP request. A pending tombstone is retried when connectivity returns. This does not remove the Dropbox provider's own historical revisions.
- The Digital Health dashboard immediately clears all previous-profile metrics, app names, graphs and data-source labels **before** fetching a new profile or period. It never caches previously shared profile data across refreshes.
- Automated v508 regression covers simulated concurrent profile switching, missing/error states, out-of-order responses, cloud revision fencing and upload/readback contract. The Android debug build and JVM tests are CI gates. **No real phone, production token, live Dropbox write, release APK, OTA manifest or deployment was used for these simulations.**
