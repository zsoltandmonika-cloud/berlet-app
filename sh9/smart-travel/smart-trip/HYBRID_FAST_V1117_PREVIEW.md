# Smart Trip AI · Hybrid GTFS Fast Search v1117 · isolated preview

**Goal:** reduce current user-observed **5+ minute** full search to **<60 s**, ultimately **<30 s** for well-covered routes, without degrading route quality or changing the approved profile preferences. These are targets, **not measured outcomes**.

## Safety / deployment
- Branch-only additive files. No production Smart Trip HTML/JS, Golden UI, My Trips, Supabase, or preferences are edited.
- The new module is **NOT loaded on production** and makes **zero** API, database, GTFS download, model or storage calls.
- The GitHub rollback checkpoint is `backup/2026-11-06-before-smart-trip-hybrid` at commit `984c435f65b727b8a1082aba4f7b73c8f852e0ad`.
- The complete Supabase database + Storage export has **NOT yet been confirmed**. Do not merge/deploy until data backup and restore readiness have been checked.

## Findings in current production code
1. `smart-trip-ai-v1022.js` sends the default `chatgpt` search straight to the `smart-trip-chatgpt-handoff-v1076.js` URL prompt; local GTFS engines are NOT run on this path.
2. `rail-gtfs-core-v1.js` validates data and builds date-dependent trip instances per route call; station names are scanned repeatedly. A real performance benchmark requires a *licensed local GTFS sample* and the target device.
3. Volán's private IndexedDB cache is owned by its standalone search page; the results are not currently emitted for Smart Trip. The local-only licensing boundary must not be bypassed.
4. Official BKK v1107 is a stop-to-stop, limited-line pilot; it is **not** nationwide address-to-address coverage.
5. The existing `provider-results-merge-v1110.mjs` knows how to normalize **already computed** BKK/MÁV/Volán results but does not perform three-provider through-routing. Different endpoint/day results are correctly excluded.
6. `hh_my_trip_packs` with RLS and `my-trips-cloud-v1086.js` already provide profile-scoped cloud storage; keep it unchanged.

## First implementation: what v1117 actually does
`hybrid-fast-core-v1117.mjs`:
- Accepts verified, precomputed provider outputs; invokes the existing v1110 normalizers.
- Retains timetable provenance. Does not assert live delay or fabricate walking, departures or cross-provider transfers.
- Keeps up to five complete route candidates. Reserves **direct Volán, Sajó Expressz and other express train** options when present, but leaves the actual preference-driven decision to GPT-6.
- Produces a compact, versioned `sh9.gtfs-candidates/1` **candidate** payload. Does not replace the existing `sh9.trip-pack/1` output contract.
- Keeps all legs complete; if JSON exceeds a budget, removes complete trailing options instead of truncating data.
- If no comparable/verified candidate or the byte budget fails, returns `fallback_required`. The legacy GPT-6 flow should remain intact.
- Returns instrumentation durations (MÁV adapter, Volán adapter, BKK adapter, merge, selection, serialization). Also defines a privacy-safe future end-to-end trace with stages `gtfs / gpt6 / validate / save / my_trips`.

**Important:** the v1110 adapter compares only exactly matching endpoints on a Budapest-local travel date. Therefore v1117 cannot yet accelerate arbitrary address-to-address multimodal trips without the existing full GPT-6 flow. Never falsely label an uncovered journey complete.

## QA and performance truth
- `node --test healthhub/tests/sh9-hybrid-fast-core-v1117.test.mjs healthhub/tests/sh9-provider-result-merge-v1110.test.mjs`
- `node sh9/smart-travel/smart-trip/hybrid-fast-benchmark-v1117.mjs`
- Synthetic fixture p50/p95 numbers cover **only the local prefilter**. They are NOT measurements of GPT-6, browser navigation, mobile GTFS, private data loading, Supabase sync or My Trips.
- Do not claim that 30 seconds has been reached without **search button → verified My Trips detail shown** elapsed time on actual devices, in both family profiles.

## Next gated step (requires no change to preferences)
1. Collect device-local baseline timing with sanctioned GTFS data: first and repeat searches, data loading, validation, routing, prefilter.
2. Introduce a fully opt-in **shadow mode** that runs local filtering in parallel while keeping the existing ChatGPT handoff unchanged.
3. Check all source rights and data freshness. Do not transmit local-only MÁV/Volán schedules to external LLMs without explicit rights.
4. Enable the compact candidate handoff only when evidence is sufficient, full itinerary is valid, fallback remains available, and 30-second end-to-end trials demonstrate quality equal or better.
5. The Relay Agent / automatic Send is a **separate** development stream, and is not implemented here.

## Rollback
Do not merge this draft until backup, source rights and device-level tests are completed. Abandoning its branch/PR leaves production unchanged.
