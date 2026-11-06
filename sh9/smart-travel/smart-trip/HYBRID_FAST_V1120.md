# Smart Trip Hybrid · Fast GTFS v1120 · exact-parity pilot

**Objective:** improve the local GTFS routing stage while preserving the same routes, timetable clocks, stop matching, departure/arrival modes, preferences and private dataset protections. This **does not yet speed up ChatGPT web inference**, which appears the major unmeasured portion of the 5+ minute full user workflow.

## Optimization

`rail-gtfs-core-fast-v1120.js` is an isolated, opt-in derivative of `public-transport/mav/rail-gtfs-core-v1.js`. It is **NOT loaded by production**.

- New `prepare(data,{allowPrivate})`: full existing validation **once**, then independent cloned, private in-memory stops, service calendar and trip stop arrays.
- Returns an **opaque token**, not the GTFS dataset, and never writes personal data to `window`, a remote API, IndexedDB or any file.
- `route(token, query, opts)` retains the existing route algorithm, with (a) indexed station-name lookup and (b) a **one-day result cache** for service-day instances. Cache invalidates when a different day is searched.
- Existing `route(rawDataset,...)` remains supported, with original validation behavior.
- A token containing private `rightsConfirmed:false, localOnly:true` feed still **requires** `localOnly:true` for every route call. Public mode returns `invalid-feed`.
- An independent snapshot prevents accidental changes to the caller's imported JSON after preparation from changing the compiled index.
- No live information is inferred. No provider-to-provider transit connection is fabricated.

## Current synthetic CI measurements (not operational timing)
Sample at GitHub Actions (Nov 6, 2026; generated 120-trip fixture):
- Original repeated route **p50 14.335 ms**
- Compiled repeated route **p50 1.046 ms**
- 13.7× observed speedup on this one synthetic workload.
- Prepare-once 0.507 ms and first compiled query 16.122 ms. **The first route is not 13.7× faster**; optimization principally benefits repeats on the same date.
- 39/39 target tests passed including exact GTFS result parity across arrive/depart, calendar exceptions, overnight and DST, source rights, cache date changes and data mutation snapshot.
- These times do **not** include browser input, full real GTFS (potentially 40k trips), GPT-6 latency, valid multi-provider transfer paths or Supabase/My Trips.

The benchmark is diagnostic, not a throughput target or proof of a <30 s end-to-end result.

## Real-device A/B comparator

`hybrid-offline-compare-v1120.html` embeds the original GTFS engine, fast preview engine, existing v1110 adapter and v1117 prefilter. It is **single-file / offline** and can be opened in Microsoft Edge by double-clicking the downloaded HTML.

1. Download the **raw** v1120 HTML file from the PR branch. Do not expect the GitHub code-preview page to execute HTML.
2. Select a locally held, licensed **converted** `sh9-mav-gtfs-v1` JSON file; raw MÁV or Volán GTFS ZIP archives cannot be loaded directly. Either provider may be tested, separately.
3. Enter **exact** GTFS station names and a date covered by the file.
4. Run five or ten searches. The report compares file read, JSON parse, validation, one-time prepare, original and optimized route **p50/p95** and verifies **full JSON parity every run**.
5. Look for `parity:true`. If `result_mismatch`, performance results must be discarded and the fast implementation must not be used.
6. The report intentionally does not include the raw timetable, route names or input names; do not upload the underlying private GTFS file.

## Performance decision gate

Keep the original standalone GTFS core, live Smart Trip search, all preference settings and TripPack cloud-save path **unchanged**.

- If first-query time with an actual full feed worsens or memory usage grows dangerously, revert the experimental optimization.
- If repeated route searches improve with parity, retain the prepared approach **for a future opt-in shadow integration**.
- Do not claim total <30 seconds until GPT-6's actual handoff, review and My Trips save are measured. A 5+ minute total cannot be solved simply by making a 15 ms local filter run in 1 ms.

## Safety gates

PR #788 stays a draft with **no merge or production deployment** while full Supabase DB + private Storage backup is not verified. It is safe to download and open the standalone local benchmark; that is not a production change.

## Tests

`node --test healthhub/tests/sh9-mav-fast-core-v1120.test.cjs healthhub/tests/sh9-hybrid-offline-compare-v1120.test.cjs`

`node sh9/smart-travel/smart-trip/rail-fast-benchmark-v1120.cjs`
