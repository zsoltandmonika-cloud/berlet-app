# Digital Wellbeing · Golden dashboard preview v1

**2026-10-13** · **STATIC PREVIEW / NOT LIVE**. This standalone demo is served under \`/healthhub/digital-wellbeing-preview/\`, with **synthetic data only**. It does not touch or replace the HealthHub homepage, the v433 Sleep interface, private storage, production Android Connect, or authenticated services.

## Screenshot-informed design
A user-shared Samsung Digital Wellbeing screenshot motivated the **layout**:
- Main "Screen time today" total and separately ranked app rows.
- App-category cards and a separate "app timers" section.
- Screen-time goal settings as distinct **configuration**, not a historical measurement.
- **Source reconciliation requirement:** timer-section values can differ from top-card app totals. They may represent different time windows or metrics; **do not assert equality** without direct Android/Samsung validation.

**Do not copy real screenshot timestamps, per-app names/time totals, personal identifiers or other behavioral data into this public source repository.** Use generated synthetic values exclusively in examples and the preview.

**None of the screenshot's numbers have been silently imported into this preview or the user's HealthHub health records.** All dashboard numbers are synthetic and clearly labeled. Screenshot data are not reliable historical machine-readable records and must not seed automatic trends.

## Data access feasibility and explicit source constraints
| Metric | Android source feasibility | Status / caution |
| --- | --- | --- |
| Individual app foreground windows | \`UsageStatsManager.queryEvents\` after explicit Usage Access | Pilot v0.1 supports **aggregated total + ChatGPT**, not comprehensive app list yet |
| Per-app total use by day and hour | Could aggregate allowed foreground events or scoped usage aggregates | Plan v0.2; ensure no double-count, keep source times and coverage |
| Phone screen interactive / keyguard event approximations | Android UsageEvents when available, version/device dependent | Must test; not equal Samsung's displayed total or unlock count |
| ChatGPT app foreground | Android app package usage | Does not reveal ChatGPT message timestamp/text; Edge web usage **not** site-specific |
| Samsung app category labels | No guaranteed public Digital Wellbeing category export | Use HealthHub own reviewable, versioned app taxonomy, mark as derived |
| Samsung app timers and screen-time goals | No guaranteed public API to read their proprietary configured values | Show **HealthHub goals if explicitly configured**; do not invent or claim Android read |
| Notification counts | Requires separately scoped sensitive Notification Listener permission | **Out of scope** of initial pilot; no invasive access by default |
| Ask Léna timestamps | First-party HealthHub event timestamps | Separate user consent; not the same as third-party ChatGPT |
| Longitudinal comparison with Sleep | Health Connect (existing) + separate optional usage-event store | Profile and timestamps must match; correlation is not causality |

## Proposed shared private data contract, future \`healthhub.digital-wellbeing/1\`
- Identity: \`profileKey\`, \`deviceId\`, \`zoneId\`, \`source\`, \`schemaVersion\`, \`collectedAt\`, \`consentVersion\`, \`permissionState\`.
- Observations: \`from\`, \`to\`, \`observedForegroundMs\`, optional \`appBreakdown[]\` with package label and source; hourly/daily aggregates keyed to **Europe/Budapest local calendar** with UTC timestamps intact.
- Quality: \`observedHours\`, \`expectedHours\`, \`firstKnownEvent\`, \`lastKnownEvent\`, \`coverage\`, gap explanations, source limitations.
- Semantic distinction: \`observed_app_foreground\` ≠ \`screen_on_duration\` ≠ \`samsung_digital_wellbeing_total\` ≠ \`healthhub_configured_goal\`. No importing a screenshot as a true aggregate.
- Guardrails: bound owner, opt-in, minimal collected fields, app allow/block filter, local encryption/private vault integration only after explicit approval, export/delete/retention, duplicate hour-source-key overwrite, controlled access to Ask Léna.
- Collection: on-device periodic collection with owner and permission validation, lightweight read-only diagnostics; auto-sync to authenticated private vault **only after** Samsung S24 pilot acceptance and a separate safe Connect integration and OTA rollout gate.
- Presentation: two independent profile views, daily/weekly/monthly trends, ranked apps, categories, 20–24h timeline, opt-in app goals, provenance and freshness, expansion to 7/30/90-day trends. No false sleep diagnosis.

## Preview UX acceptance
- Profile switch: Zsolt / Mónika, controlled mock data with no cross-profile state.
- Period controls: day / 7 day / 30 day.
- Main cards: observed app foreground, evening use, ChatGPT app time, covered hours.
- 24-hour activity timeline, app rankings/donut, weekly bars, own category labels.
- "Léna" analysis is explicitly illustrative, not an AI model response or real medical assessment.
- Source panel accurately says usage permission, Dropbox link, Samsung synchronization and Sleep Intelligence connection **NOT ACTIVE**.
- No network requests, tracking, browser persistence or credentials. Automated Node CI checks JS behavior and the absence of network/persistence.
- Mobile-first S24 layout with dark HealthHub style and profile-specific blue/pink accent.

## Release approach
The dashboard preview can be deployed at a separate unlinked GitHub Pages URL. **Do not change the existing Home Hero, Sleep v433, or production Android Connect** as part of this PR. The new funny Léna Hero generated in conversation is **a candidate**, not the replacement, until user approval and an appropriately optimized image asset is staged and reviewed separately.

Next: compare actual Samsung screen-time data and event coverage on an explicit phone test. Extend the separate \`screen-time-pilot\` collector to app-level aggregate + validated local-clock trend **before** any cloud-sync implementation. Only then wire the shared private event source into Sleep and Digital Wellbeing.
