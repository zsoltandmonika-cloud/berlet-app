# SHO AI Super Search · Léna LIVE stopwatch v1 · opt-in preview

## Goal

Measure **the complete user-observable journey**, not only GTFS milliseconds:

1. User clicks **✨ Léna indítása · START** in the SHO test UI. Timestamp captured synchronously before opening ChatGPT in a NEW TAB (browser may require manually pressing **Send**).
2. ChatGPT completes reasoning and, *only if the connected Supabase tool is available and authorized*, saves the TripPack to **existing** `HealthHub-Core.public.hh_my_trip_packs` with the **exact correlation ID** `tp-lena-<uuid32hex>` and `profile_key=zsolt|monika`.
3. Browser performs explicit-user-initiated read-only scoped SELECT of `hh_my_trip_packs`; existing Supabase RLS must authorize the signed-in member of that profile.
4. Preview validates the TripPack with unchanged `SH9_SMART_TRIP_PACK_V1078.normalize()`. Only a matched ID, profile, and travel date is eligible.
5. After drawing actual route segments and two browser animation-frame boundaries, STOP is recorded.

**Success = validated cloud row visibly rendered.** Opening ChatGPT alone does not stop the timer.

## Status
- Draft PR #789, based on earlier draft PR #788. No merge, no live integration, no production changes.
- Unit tests exercise state transition, profile isolation, prompt preference retention, exact ID, manual/cloud distinction, and read-only code.
- Real Chromium alpha tests verify browser launch, 0 before start, one matching mocked cloud save -> graphical render and STOP, wrong ID -> no STOP, manual fallback label, mobile layout, and per-profile query scopes. Browser test substitutes the Supabase server with a mock; **it does not prove live ChatGPT ↔ Supabase integration**.
- No paid OpenAI API, no chat completion scraping, no client-side Supabase writes.

## What it DOES NOT claim
- The real ChatGPT website does not provide a stable automatic callback into arbitrary SHO pages. This approach uses the *existing RLS-protected Supabase table as an explicit handover channel*.
- The ChatGPT web URL may prefill a new chat but may require the user to press **Send**. New session might not have the Supabase plugin available/authorized.
- A full GTFS preprocessed package is **not yet attached to the v1 stopwatch prompt**. The test handoff intentionally preserves existing v1076 profile preference prompt and exact 2400-char limit. The future authorized provider pack cannot include raw private GTFS unless both license/source rights and user consent allow it.
- The stopwatch `cloudObservedMs` is browser's **first observed** row time (affected by 3-second polling and background tab throttling), **not** database commit timestamp or GPT token-generation latency.
- If the connection is absent or the AI does not save, no automatic STOP occurs. The manual JSON paste stop is labelled `finished_manual`, with `cloudSaved:false`, not passed as an automatic end-to-end success.

## How to use WHEN preview deployed on SAME origin

1. Open `/berlet-app/sh9/super-search/trip-stopwatch-preview-v1.html` using the authenticated SHO browser on the same site origin. Source GitHub `blob` pages **do not execute** HTML.
2. Select profile, route, date, mode, priority.
3. Click **Léna indítása · START**; new ChatGPT tab opens. Press **Send** if prefilled.
4. Wait for AI output, and return to the stopwatch tab. If the connected Supabase tool inserts the exact correlated TripPack, the observer will display it and stop. It **cannot** stop on a mere text response.
5. Copy the JSON timing report (elapsed, cloud observed, visualization). If no cloud save, paste a complete TripPack in the fallback box to separately time manual handling.

The app checks the cloud only while an explicit stopwatch run is in progress. Stop/cancel/timeout clears all timers. Browser preview does not insert any rows or write any local My Trips records.

## Release gates

Before same-origin deployment: full, independently verifiable Supabase DB + private Storage backup; baseline PWA/Golden QA failure triage; preview authentication and RLS review; and signed-in Edge/Samsung testing. GitHub branch rollback is **not** a database backup.

## What gets optimized next

Expose the already verified local GTFS candidate selector output to ChatGPT only where legally shareable and explicitly approved; use pre-ranked 2–5 candidates so GPT-6 reviews instead of re-researches; preserve v1076 static preferences, exact service-day checks, continuous door-to-door legs and the one-best-route rule. Instrument that entire path with the v1 stopwatch and compare before/after median and p95 over realistic journeys.

## Code
- `trip-stopwatch-core-v1.mjs`: pure, clock-injectable timing state machine.
- `trip-stopwatch-preview-v1.mjs`: user-triggered ChatGPT handoff, read-only RLS Supabase SELECT, route renderer and timer.
- `trip-stopwatch-preview-v1.html`: separate premium-glass graphical lab.
- `healthhub/tests/sho-trip-stopwatch-v1.test.mjs`: core contract and safety.
- `healthhub/scripts/sho-trip-stopwatch-alpha-browser-v1.cjs`: end-to-end Chromium with mocked network; never live data.
