# SHO Smart Trip V5 · Google-first / Léna Touch · isolated pilot

## Pilot URL
`/sh9/smart-travel/public-transport/smart-trip/v5/index.html`

**Current status: DEMO-ONLY, no Google Routes query, no Google Cloud key, no
Supabase Edge Function, no GPT/LLM input and no My Trips writes.**

The page uses the **existing** `smart-trip-multimodal-v1073.js` Google
response normalizer. A local synthetic four-route fixture verifies:

```text
Google-shaped response (synthetic)
  → existing Google Routes normalizer
  → SHO local prioritization (direct Volán → Sajó Expressz → train)
  → 1 winner + alternatives
  → short deterministic Léna Touch (synthetic)
  → independent official Maps URLs link on user click
```

Live Google Maps opening is real, but the Google Maps UI **does not return
routes to the application**. The Maps URL handoff does not carry a guaranteed
departure/arrival date or route selection. The official Google Routes API
must be requested separately through a backend to receive machine-readable
alternatives.

## Current code/reuse

- Existing pure `smart-trip-multimodal-v1073.js`: Google API request builder,
  1–4 route normalizer, schedule/walk validation.
- Existing `smart-trip-multimodal-runtime-v1073.js`: bearer-protected endpoint
  contract, currently `enabled:false`. **Remains OFF**.
- New `v5-pilot-core.mjs`: small, bounded ranking layer, no model or writes.
- New `v5-demo-fixture.mjs`: fictional routes, conspicuously marked DEMO.
- New `v5-live-pilot.mjs`: standalone UI, only user-click Google Maps launch.
- Existing production Smart Trip and My Trips are **untouched**.

## Google Cloud and contract gates for LIVE integration

1. Verify Google Cloud project linked to correct account; enable Routes API
   and billing; apply a restrictive *Google-side* requests/day quota and billing
   alerts. A free monthly usage cap does not function as a hard budget.
2. Store Google API key only as server secret. Never in GitHub Pages, frontend,
   JS or GitHub Actions logs.
3. Build and review new authenticated Supabase Edge Function
   `hh-smart-trip-routes-v1`. Server enforces JWT, family scope, origin,
   request schema, future time window, per-user rate limiting and minimal
   Google field mask. Exactly one Google Compute Routes request per click.
4. Validate EEA contractual eligibility for user-facing route descriptions,
   storage in TripPack/My Trips, **and transmission of Google Maps Content to
   third-party LLMs / generation of derived prose**. The V5 demo does none of
   these with real Maps content. Do not treat this as approved yet.
5. Google route description/steps **must not be displayed With any Map** under
   applicable Google EEA terms. There is no map next to results in this pilot.
   An independent Maps link is not a route data readback channel.
6. Ensure Google agency/stop coverage in Budapest and Kazincbarcika. The API
   cannot promise that direct Volán and Sajó Expressz will be returned.
7. Obtain informed approval before any real-cost call. Deploy only if all
   above checks pass; otherwise retain free Maps URL and Matrix V4 fallback.
8. Only then integrate Golden UI, short GPT or legal non-AI Léna Touch, and
   permitted TripPack storage. Include attributable source labels.

## Performance contract

The target is **20–30 seconds inclusive** from search click through 1 chosen
route, Léna recommendation, UI render and durable My Trips save. This is
unmeasured for LIVE V5 and **cannot be inferred from demo latency**.

Suggested instrumentation, without personal location telemetry:
- Google backend response latency
- Google parsing/SHO priority evaluation
- Optional AI summary latency (only after lawful data flow)
- Golden UI render
- My Trips save ACK
- End-to-end deadline including slow source timeout and failed requests

## Sources

- Google transit API: https://developers.google.com/maps/documentation/routes/transit-route
- Route billing & quotas: https://developers.google.com/maps/documentation/routes/usage-and-billing
- EEA Routes restrictions: https://developers.google.com/maps/comms/eea/routes
- Applicable EEA Terms: https://cloud.google.com/maps-platform/terms

## Safety

No private GTFS copied, no paid Google requests, no unauthorized API activation,
no cloud writes, no client secrets, no changes to Smart Trip or My Trips.
