# Hybrid GTFS v1118 · Device-local shadow benchmark

## Scope and execution
This phase adds a separate standalone diagnostic page, `sh9/smart-travel/smart-trip/hybrid-shadow-v1118.html`, and a read-only measurement module. It is *not linked from the production Smart Trip UI*.

The diagnostic page must run **on the same website origin** where the device's own authorized MÁV/Volán GTFS IndexedDB data were originally imported. Previewing on a different Cloudflare/GitHub Pages origin, opening as `file://`, or viewing on GitHub source does NOT access those private IndexedDB databases. Absence of local data is a valid `not_loaded` result.

### Probe: read-only local browser
- Validates query with exact GTFS stop names.
- Uses **existing** IndexedDB names and keys:
  - `sh9-mav-private-gtfs-v2 / datasets / household`
  - `sh9-volan-private-gtfs-v994 / data / pilot`
- Uses `rail-gtfs-core-v1.js` to validate and query the actual authorized GTFS, with `localOnly:true` and max 1 transfer.
- Times read, validate and route separately for MÁV and Volán, then measures the v1117 prefilter from existing MÁV results.
- **Volán result adapter is intentionally NOT active** in this probe. It cannot be safely classified via the MÁV adapter. The Volán routing cost and coverage are measured without falsely producing a GPT candidate.
- **BKK and full door-to-door multi-provider joins are NOT in this probe.**
- Only timings, dataset timestamps, status and candidate count go to the output. No underlying route details or locally owned GTFS are transmitted or stored.

### How to benchmark later, after private backup and preview deployment
1. Verify the Supabase database backup and all Storage buckets' object copies, including successful restore inspection.
2. Deploy *only the diagnostic page plus its imported modules* to the existing GTFS IndexedDB origin, with no modification to the live Smart Trip search handlers. Be aware: GitHub Pages typically serves from the configured branch, and PR branch source URLs are not a runnable preview.
3. Open the diagnostic page on the **same Edge or Chrome profile** that previously imported the authorized GTFS, using exact GTFS station names.
4. Run at least five searches per example route and compare first-run vs warmed runs; record median and p95 of local stages and correctness flags.
5. Collect total real search-to-My Trips time separately. GPT-6 ChatGPT web latency remains outside this instrument.
6. If missing dataset/coverage, do not treat zero routes as fast success; use existing ChatGPT fallback and flag gap.

### Quality and timing gates
- 30-second **end-to-end** target is **not proved**.
- No user preference, trip save, data access or live route code changed.
- No new OpenAI API cost or calls.
- Stop and roll back if tests fail, input correctness diverges, full private backups are unavailable or a preview origin cannot see the proper local GTFS.

### Test command
`node --test healthhub/tests/sh9-hybrid-fast-core-v1117.test.mjs healthhub/tests/sh9-hybrid-shadow-v1118.test.mjs healthhub/tests/sh9-provider-result-merge-v1110.test.mjs`

The CI synthetic benchmark is **not** a measure of the real GTFS engine, GPT-6 or cloud save time.
