# SHO Smart Trip V5 Parallel Orchestrator · isolated offline pilot

## What is built
- A reusable 4-adapter orchestration module with a **single end-to-end budget of at most 30,000 ms**.
- All adapters start concurrently; each has its own timeout and AbortSignal.
- Slow, errored or empty providers cannot block other completed providers.
- Source-normalized candidates and preliminary ranking are delivered to a bounded finalization callback.
- A **purely synthetic**, network-free visual pilot with a shared stopwatch.
- Regression tests for concurrency, latency, malformed results, partial failure, cancellation and global timeout.

Pilot: `/sh9/smart-travel/public-transport/smart-trip/v5/parallel/index.html`.

## Not connected yet
- **No real Google, BKK, MÁV or Volán calls**. Demo adapters use synthetic latencies/results.
- No GPT/LLM, third-party Maps Content sharing, live operator validation, My Trips or production search changes.
- Best candidate is explicitly **preliminary_not_independently_verified**, not a verified A plan.
- This is a **performance architecture slice**, not an end-to-end transit search benchmark.

## Adapter contract
`{id:"google"|"bkk"|"mav"|"volan", search(query,{signal,timeoutMs}) =>
 Promise<{candidates:NormalizedCandidate[]}>}`.

Candidate: `{id,source,provenance,travelMinutes,walkMeters,transfers,score}`.
The adapter must perform genuine timetable/source validation before returning a candidate. The common module does only shape/sanity checks. Provenance must remain truthful; an LLM cannot be used to invent a validated timetable.

Call `runParallelSearch({adapters,query,budgetMs:30000,sourceBudgetMs:18000,
finalize,onProgress,signal})`. The full deadline also limits the async finalizer. Keep finalization side-effect free until authorization, privacy/EEA checks, and storage agreements are completed.

## Acceptance for next phase
1. Integrate read-only, authorized BKK/MÁV/Volán adapters **without modifying their existing search logic**.
2. Connect Google through the existing opt-in server-side proxy only after verifying Google SKU, Google-side quota and EEA terms for data sharing/use; **do not initiate billable calls automatically**.
3. Add independent operator schedule verification and choose one safe door-to-door A plan.
4. Add legally permissible Léna response, scoped My Trips write and production UI integration behind a feature flag.
5. Run true end-to-end tests including auth, routes, AI, render and **save acknowledgment** under 30 seconds in complex journeys. Failure at the deadline must display a clearly marked available result, not a fabricated route.

No claim of passing the full 30-second SLA until those instrumented real-flow tests pass.

## 2026-11-09: real read-only domestic source bridge
Pilot page: `/sh9/smart-travel/public-transport/smart-trip/v5/parallel/local-test.html`.

The live local pilot reuses the **existing Matrix V4** validated service adapters:
- Official SHA-256 checked BKK 17/19/41/260 snapshot via `smart-trip-bkk-v1107.mjs`, no live bus/tram GPS.
- MÁV and Volán **only** from preexisting, same-origin local IndexedDB datasets through the existing two isolated Web Workers, no dataset upload, DB creation, or cloud writes.
- Each provider searches one **explicit** operator-specific stop pair. The V4 Matrix engine verifies that full pair with operator provenance and its own strict timetable rules.
- All three read-only lanes are dispatched simultaneously by the V5 deadline coordinator. The total budget includes the local rules load and the pilot display.
- One nominated **primary provider** can produce a verified *stop-to-stop* candidate. The other two report only diagnostics; **different stop-pairs are never compared as interchangeable routes or spliced together into a door-to-door itinerary**.
- A 29.8 s abort guard and the V5 max 30 s budget stop slow providers. The user can cancel.
- No Google Routes requests, no LLM, no remote private GTFS transfer, no authenticated save, and no changes to the original production routes/UI.

A missing local MÁV/Volán GTFS dataset, stale BKK snapshot, uncovered stop name, invalid date or unverified transfer produces an honest no-route state. A successful *test* does **not** yet prove the 30 s SLA for real multi-operator end-to-end travel with AI and cloud save.

Automated regression:
`node --test healthhub/tests/sho-smart-trip-v5-local-sources.test.mjs`

**Next integration gate**: legally usable verified walking connections/canonical interchanges, full eligible BKK/MÁV/Volán feed coverage and normalized door-to-door route composition, then opt-in Google Routes + permissible AI summary, with My Trips save acknowledgment within the 30 s overall SLA. No real-money Google invocation is automatically enabled.
