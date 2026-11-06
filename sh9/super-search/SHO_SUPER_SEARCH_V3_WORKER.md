# SHO AI Super Search V3 · Private GTFS Worker Shadow

**Status:** isolated development branch, PR #789 (draft), based on PR #788 (draft). **Not deployed or linked from production.**

## Goal
One shared modular search brain for SHO. Smart Trip must eventually return a complete, personalized, verified and saved itinerary in <30 seconds for covered journeys. This release proves a *safe and responsive local GTFS search stage*, **not end-to-end 30-second performance**.

## What V3 adds
- `travel-local-gtfs-shadow-v2.mjs` reads the **existing** MÁV private IndexedDB dataset `sh9-mav-private-gtfs-v2/datasets/household`, only on an explicit user action and only when it already exists on the exact website origin. No auto database creation, no schema updates or writes.
- Strict local-only source rights: `rightsConfirmed:false` and `localOnly:true` expected, feeds verified by existing Fast GTFS v1120 `prepare(...,{allowPrivate:true})`.
- `local-gtfs-worker-v3.mjs` executes this loader and the validated GTFS v1120 engine **inside a dedicated module Web Worker**. Main UI remains responsive during heavy data validation and route search.
- `travel-worker-bridge-v3.mjs` starts the worker lazily on a user-triggered search, hard-caps work at **6500 ms** and terminates the worker on timeout, cancellation or error. A failed local search returns null, allowing the existing Léna/ChatGPT search to remain available as an unchanged fallback.
- `createTripProvider` now forwards the requested date, exact time, and arrive/depart mode to the injected local provider. This is important for real journeys; the original v1 provider interface did not forward time.
- `local-shadow-preview-v3.html` is a **separate premium-glass, profile-colored diagnostic page**, not a production UI modification.
- Only route result envelopes and timing metrics move from the worker to the **same-origin** page. Raw GTFS is never posted over the network, to ChatGPT, Supabase or another device; profile selection changes visuals only.
- Every normalized result is timetable-only, not a claimed live delay/track or a full multimodal door-to-door itinerary.

## Execution and deployment limits
- A `github.com/.../blob/...` URL shows **source**, not a working web application. The preview requires a real same-origin HTTP(S) deployment *after* backup and regression gates. An unrelated PR preview origin does not have access to the private IndexedDB dataset.
- Browsers without module Worker or `indexedDB.databases()` support will fail closed and leave the original handoff intact.
- This pilot handles MÁV station-to-station only, not Volán + BKK + rail through-routes, not GPS/address normalization and not complete first/last mile validation.
- Even if the GTFS stage completes in <6.5 seconds, **GPT-6's web handoff and manually triggered Send**, validation, cloud save and My Trips display time still need to be measured. A worker cannot control ChatGPT browser inference time.
- The private GTFS dataset is cached only as an opaque, in-memory prepared token for up to 10 min inside the worker. The worker is destroyed on page leave, timeout, reset or cancellation; nothing is persisted or uploaded.

## QA results
CI on the dedicated feature branch:
- 49/49 Super Search privacy, source rights, exact GTFS parity, worker-timeout, cancellation, scope, caching and local-preview tests passed.
- 28/28 existing GTFS/provider regressions passed.
- Edge PWA broad QA still reports failures on the repo's earlier baseline; no PWA or live modules are modified by this PR. This wider QA failure must be resolved/compared before mainline release.
- These are **automated tests, not real device performance results**.

## Milestones before live release
1. Finish **complete Supabase database and Storage backup**, verify restoration independently. GitHub source rollback checkpoint exists at `backup/2026-11-06-before-smart-trip-hybrid`, but it is not a private data backup.
2. Validate the browser worker with permitted real GTFS on Zsolt's Samsung and PC, including worst-case full feed, service calendars, DST, p50/p95, memory use and actual timeout.
3. Confirm minimum 5-minute transfer safety and both local endpoints in the multi-provider planner; do not make up connections.
4. Implement *licensed*, *user-approved* candidate handoff to GPT-6 without losing the original v1076 prompt or the profile preferences; source rights are not automatic.
5. Time **button → GPT-6 reply → verified TripPack → Supabase saved → My Trips rendered**, not only microbenchmarks.
6. Integrate public SportCentral schedule feed. Enable HealthHub/Valet/Tasks only through separate authenticated, consented and RLS-enforced provider adapters.
7. Do not merge PR #789 to `main`; its base is PR #788's unpublished branch, and both remain drafts.

## Tests
```sh
node --test healthhub/tests/sho-super-search-v1.test.mjs \
  healthhub/tests/sho-super-search-trip-review-v1.test.mjs \
  healthhub/tests/sho-super-search-local-shadow-v2.test.mjs \
  healthhub/tests/sho-super-search-shadow-preview-v2.test.mjs \
  healthhub/tests/sho-super-search-worker-v3.test.mjs \
  healthhub/tests/sho-super-search-shadow-preview-v3.test.mjs
```
