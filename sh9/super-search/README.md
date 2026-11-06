# SHO AI Super Search V1 · Shared Search Intelligence Layer

## Product goal

A single, high-quality search core for SHO, initially Smart Trip and SportCentral. Extend to HealthHub, Smart Valet, Tasks and Notifications **only through opt-in authenticated provider adapters**, never by granting a blanket cross-module database query.

**Smart Trip KPI:** from the reported 5+ minute manual workflow to **under 30 seconds, search-button → validated plan saved → My Trips detail rendered**, for sufficiently covered journeys. This is a **future acceptance criterion**, not achieved or guaranteed by the V1 code.

## Architecture

```text
              SHO common search UI (future)
                    |
         Request (domain, z/m, scopes)
                    |
     SHO Super Search v1 broker [PREVIEW]
        |              |              |
   travel:timetable  sport:schedule  private scopes BLOCKED
        |              |          until validated auth/RLS adapters
  GTFS v1117 already  explicit public  HealthHub / Wallet / Tasks
  computed verifier   event records
        |              |
  bounded verified     verified public
  candidate set        results
        \              /
         source provenance, freshness,
         parallel requests, dedupe, budget
                    |
              module result
                    |
       GPT-6 review handoff (TRAVEL ONLY,
       explicitly licensed/consented,
       prompt ≤ 2400 chars; NEVER automatic)
                    |
         existing sh9.trip-pack/1 ->
         authorized Supabase -> My Trips
```

The broker does **not** know profile passwords, Supabase service roles, user OAuth tokens, private document contents, GPS, GTFS raw files, or connected family credentials. It does not download, crawl, fetch, call GPT, send messages, or write to a database.

## Contracts (implemented now)

`createSuperSearch().register({id,domain,scope,privacy,cacheMs?,cacheKey?,search})`

- `domain`: `travel`, `sport`, `health`, `wallet`, `tasks`.
- `scope`: `travel:timetable` / `sport:schedule` etc. Search request must explicitly name scope and profile `z` or `m`.
- `privacy`: `public` / `local_private` / `sensitive`.
- Provider results: `{status:"ok",items:[{id,title,summary,source,sourceUrl,confidence,category,startsAt,endsAt,validUntil}]}`.
- `search({domain,profile,scopes,query,budgetMs,signal,onPartial})`: run scoped providers concurrently with max **12 s** total broker deadline (default **7 s**). Returns `schema:"sho.super-search/1"`, normalized capped items, source statuses and minimal timings.
- `health`, `wallet`, `tasks` are **disabled in v1**, even if a provider is registered. A UI selecting a profile is **not authorization**. Sensitive adapters require verification of live family membership, Supabase RLS, permissions, use-specific consent, and no accidental source sharing.
- Cache only explicitly public, non-personal programme results in memory, capped 32 entries and 5 minutes, never private route/ticket/medical/task data.
- Provider deadlines and cancellation prevent late results appearing in completed answers; underlying providers must respect AbortSignal.
- If no validated timetable result is available, travel returns `existing_chatgpt_handoff` as the fallback recommendation. Broker **does not launch it**.

### Existing Smart Trip provider
`createTripProvider({getExistingResults})` requires the host to provide output from the **existing verified, authorized** GTFS engines. It invokes the v1117 verifier, not a new independent route planner. It never fabricates BKK+MÁV+Volán through-connections. The long-distance preferences remain in the existing GPT-6 handoff prompt.

### Existing SportCentral provider
`createSportScheduleProvider({getPublicSchedule})` accepts only `public:true` **and** `verified:true` schedule records. It does not automatically scrape MecsRadar, ticket accounts or private favorites. It is a ready adapter for the appropriate public programme feed; no live source is wired.

### GPT-6 decision handoff
`buildTripReview({existingPrompt,candidateJson,userApprovedExternalSharing,authorizedProviders})`:
- Starts with the **unchanged complete v1076** prompt; preserves personal preferences and TripPack/My Trips instructions.
- Only appends well-formed `sh9.gtfs-candidates/1` timetable candidates that are *expressly approved for sharing* **by user AND per-provider license/rights policy**.
- Never truncates existing instructions or legs. Drops entire candidates if 2400 character budget is tight; if none fits, returns the **identical legacy handoff**.
- Does not initiate ChatGPT Send or use paid model APIs. Manual Send may still be required in the existing browser.
- No recommendation is declared validated merely because it was selected by the GTFS prefilter.

## What is NOT yet built

1. No globally mounted SHO search UI. No production script imports these V1 modules.
2. No real MecsRadar or HealthHub/Valet/Tasks provider connection.
3. No licensed live GTFS data transfer to GPT-6. A locally/private licensed dataset is not automatically shareable.
4. No full door-to-door BKK+MÁV+Volán routing and guaranteed safe transfers.
5. No browser automation of ChatGPT Send or result capture; requires a separate, permissioned Trip Relay Agent design.
6. No proof of a 30-second **end-to-end** SLA, no new OpenAI API cost.

## Speed work and priority

The synthetic GTFS optimization v1120 made repeated in-engine lookups faster, but **the present 5+ minute total is likely dominated by GPT-6 research, manual handoff, and the save workflow**. We must time the total, not claim that 13× on 15 milliseconds means a 13× trip planner.

1. **V1:** shared core, provenance, permission limits, source adapters, review handoff. (THIS PR)
2. **V2:** verified same-origin Smart Trip shadow connection, actual GTFS feeds, separate full journey timing. Only complete and current routes can skip GPT-6 web research.
3. **V3:** full national multimodal graph with verified 5+ minute transfer rules and continuous route legs, BKK local access/egress, fresh GTFS source policies.
4. **V4:** GPT-6 decision pipeline with valid source rights and verified TripPack cloud-save completion, with native fallback.
5. **V5:** public SportCentral search and safe Notifications integration.
6. **V6:** individually authorized HealthHub / Valet / Tasks adapters behind real identity/RLS and optional protected local-only search.

## Safety and rollout

- This PR **#789** targets the prior draft **#788** branch, not main. Both stay **Draft** pending verification and an explicit deployment decision.
- Source-code rollback point: `backup/2026-11-06-before-smart-trip-hybrid` at `984c435f65b727b8a1082aba4f7b73c8f852e0ad`.
- Complete private Supabase database, Storage bucket, and independently verified restore backup remain outstanding. No deployment or changes to production until done.
- The existing Smart Trip/GPT-6 search mode, profile preferences, Supabase and My Trips workflow stay exactly unchanged.

## Test

```sh
node --test healthhub/tests/sho-super-search-v1.test.mjs healthhub/tests/sho-super-search-trip-review-v1.test.mjs
node --test healthhub/tests/sh9-hybrid-fast-core-v1117.test.mjs healthhub/tests/sh9-mav-fast-core-v1120.test.cjs healthhub/tests/sh9-provider-result-merge-v1110.test.mjs
```

Tests cover domain scope, denied private domains, parallelism, cancellation, hard timeout, no sharing, cache limits, source provenance, stale metadata, GTFS verified candidates, fallback and prompt budget integrity. Synthetic test timing is not an end-to-end benchmark.
