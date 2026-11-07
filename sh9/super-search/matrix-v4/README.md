# SHO Matrix Search V4 · Phase 1 (isolated development pilot)

## What works NOW
- `matrix-rules-v4.json`: short deterministic R/P/J/C/O/T/L commands, provider budgets, priority and minimum transfer windows.
- `matrix-search-engine-v4.mjs`: starts BKK, MÁV and Volán providers in parallel; each provider is independently timeboxed (default 3.5 s). Combines only explicitly verified canonical nodes and source-backed legs. Rejects impossible transfers, missing walking links and partial itineraries. Returns one `sh9.trip-pack/1` object with the existing schema. Durations in telemetry do **not** include network/AI/Supabase save by themselves.
- `matrix-existing-sources-v4.mjs`: opt-in adapters calling the existing **local-only** MÁV / Volán GTFS rail core and official BKK stop-to-stop search. All services must be supplied by the existing browser host. Each search pair must be explicitly mapped to known stop names and canonical interchange nodes. Invalid or unrecognized intermediate nodes fail closed.
- `quickLenaTouch()`: a local deterministic 1–2 sentence fallback, not a real GPT-6 response. It does not block the route.

## What does NOT work yet
- No automatic opening of the old Smart Trip button. **Production Smart Trip, My Trips, and Tracking are unchanged.**
- No automatic door-to-door Mónika munkahely → Anyuka route without verified walking edges and first/last mile stop mapping. Guessing Kolosy/Keleti/Stadion station transfer coordinates is forbidden.
- No automatic feed loading from external accounts or unapproved GTFS rights; the existing local GTFS must be present on that device.
- No live traffic/vehicle/ETA claims, cloud writes, GPT-6 API calls or automatic My Trips save.
- No verified Google Maps-level 1–2 s latency yet; the CI fixtures are synthetic.

## Existing core preserved
- `sh9/smart-travel/public-transport/smart-trip/index.html` unchanged
- `smart-trip-pack-v1078.js` unchanged
- `my-trips-v1080.js`, `my-trips-cloud-v1086.js`, tracking unchanged
- No database migrations or new Storage buckets.

## Next real acceptance sequence
1. On same origin as existing Smart Trip, **read-only**, load official BKK and existing local MÁV/Volán data under actual user license and session conditions.
2. Construct explicit nodes for origin street, closest verified BKK stop, Keleti/Stadion, Kazincbarcika stations, and destination. Obtain verified walking time and path from an authorized routing provider, **not** straight-line inference.
3. Bind provider-specific `searchPairs`, ensure all 3 handlers return real timetable legs. Confirm **different source clocks** normalize to Budapest timezone.
4. Benchmark same origin/destination/date/time: per-source latency, merge, first graphic paint, and remote My Trips save **separately**; do not confuse synthetic tests with real benchmarks.
5. Only after a full verified route, render through the existing TripPack UI and use the existing authenticated save control. Launch optional Léna personal story after first paint.
6. Regression tests and reversible deployment. New code should remain isolated until user acceptance.

## Tests
`node --test healthhub/tests/sho-matrix-search-v4-pilot.test.mjs healthhub/tests/sho-matrix-source-adapters-v4.test.mjs`

Tests are deterministic, contain no personally identifying coordinates, and make no network/API/database calls.
