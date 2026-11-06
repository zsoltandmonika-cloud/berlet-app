# Smart Trip · Offline GTFS Benchmark v1119

## Why this path
The production Smart Trip uses ChatGPT web handoff; the local browser GTFS engines are separate. A GitHub/Cloudflare preview on a different origin **cannot access IndexedDB of the production page**. The single-file offline benchmark bypasses that problem without touching the live origin or requiring an additional AI API.

This is a performance diagnostic only. It **does not** generate an itinerary, invoke GPT-6, access Supabase or save to My Trips. The end-to-end 30-second target cannot be validated by this probe alone.

## Run locally
1. Open [the committed single HTML file](./hybrid-offline-benchmark-v1119.html) on the GitHub draft feature branch; choose **Download raw file** so the page is on your device.
2. Double-click the saved `hybrid-offline-benchmark-v1119.html` in Microsoft Edge (offline `file://` works because all three internal JS modules are bundled into the same HTML).
3. Select the **authorized, locally converted GTFS JSON** file you originally imported into MÁV or Volán. The original `.zip` GTFS archive is **not** supported by this standalone diagnostic.
4. Enter **exact station names included in the JSON**, a travel date within the feed, and an expected departure time.
5. Choose 3 runs for a first test; use 5 or 10 for p50/p95 comparisons.
6. The output shows local file read, JSON parse, feed validation, route search and (MÁV-only) v1117 prefilter milliseconds. No route list or private feed content is printed or transmitted.

**No source rights to extract/transmit GTFS?** Do not upload or distribute the data. The offline page processes the selected file only in memory and never contacts external servers.

## Current limitations
- Both input files must follow the already-existing `sh9-mav-gtfs-v1` household search JSON structure; raw GTFS `.zip` files cannot be imported.
- Volán is timed as a separate provider; the adapter for Volán Golden Cards is not yet wired into the compact GPT-6 candidate payload.
- MÁV and Volán stations may differ from door-to-door origin/destination; a `station-not-in-feed` is a **coverage gap**, not a fast valid itinerary.
- The bundle embeds *exact copies* of the existing GTFS core, v1110 provider adapter and v1117 prefilter from the same development branch. It does not alter these engines.
- First-run parsing and subsequent routing should be reported separately. The embedded current core still revalidates the dataset per route call; the benchmark reveals that cost.
- No website integration, database writes, PWA cache change, or end-user preference changes. It is on PR #788 as a draft and must not be merged while Supabase DB/Storage backup is incomplete.

## Technical quality gates
- `node --test healthhub/tests/sh9-hybrid-offline-v1119.test.cjs` verifies the standalone artifact: no external resource loads, no network/write calls, runtime bundle compilation, preserved engine names, no TripPack or cloud save.
- `node --test healthhub/tests/sh9-hybrid-fast-core-v1117.test.mjs healthhub/tests/sh9-hybrid-shadow-v1118.test.mjs healthhub/tests/sh9-provider-result-merge-v1110.test.mjs`
- **Not an end-to-end performance claim**: a real device benchmark plus actual ChatGPT and cloud timings are needed before any 30-second claim.
