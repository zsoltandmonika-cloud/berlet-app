# HealthHub Smart Arrival Premium v791 – Approved implementation baseline
Date: 2026-10-22 · Status: APPROVED DESIGN / IMPLEMENTATION BRANCH CREATED; NOT DEPLOYED

## Non-negotiable UX constraints
- Primary device: Samsung Galaxy S24 Ultra in **portrait** orientation; smart-responsive for tablet/desktop.
- Reuse the **existing Family Guard MapLibre map instance** as a switchable transport overlay; never introduce a second map.
- Preserve existing colorful map skin, satellite option, Family Guard hero, Buddy mascot, standard bottom HealthHub taskbar and the approved profile switch placement/sound.
- Map has visual priority; transit controls in a bottom sheet with collapsed / half / full states and safe-area padding. Minimum 44x44 CSS px touch target, readable fonts, high contrast even with backdrop glass.
- Bus markers blue, tram markers yellow, **route number always prominent** (260, 17, 19). Premium glass effects only in UI/marker presentation, not heavy real-time 3D models.
- Load only officially grounded BKK route geometries and stops; **never fabricate vehicle positions, ETAs, statuses or route shapes**.
- No impact on Family Guard GPS/privacy/landmarks. Map transport layer failures are isolated and the base map stays usable.
- Explicit label **Menetrendi útvonal – nem élő járműpozíció** while powered only by v790 static GTFS.

## Display behavior
- Per-profile line and direction checkboxes for route 260, tram 17, tram 19, future extensible.
- Both directions may be enabled independently. Preserve actual GTFS headsign/variant (no static guess about direction labels); do not confuse direction_id with departure/arrival relative to a given stop.
- Presets: Both / toward selected destination / away from selected destination, based on a real user-selected stop, not arbitrary direction_id.
- Trip Planner uses all valid route options for actual journey optimization; saved display filters affect shown candidates by default, not available backend routing.
- Three marker-density modes: detailed number + optional ETA when real-time data exists, compact number, minimal route icon. Number must always be visible on vehicle cards, including compact mode.
- If live BKK API cannot be authenticated or provides no trustworthy data, do not render fictitious vehicle motion or times.

## Implementation phases (verified against repository)
**Existing:** `healthhub/guardian/index.html`, `guardian-transit-v790.js/.css`, `build-bkk-routes-v790.py`, `.github/workflows/healthhub-transit-bkk-v790.yml`, `HEALTHHUB_TRANSIT_BKK_V790.md`.
1. Baseline: verify official GTFS JSON exists and has credible 260/17/19 shapes, confirm mobile render.
2. v791 UI: isolated CSS/JS adds bottom sheet and mobile glass route cards without altering family tracking; maintain v790 default behavior when disabled.
3. Direction choices: derive filters from GTFS variants/headsign; store in versioned per-profile local state with migration from the v790 selected-list key. Do not silently sync private preferences to a cloud account.
4. Map labels/markers: route lines and stops; live vehicle markers only after independently verified realtime source/integration. Separate transport DOM/layers from core Guardian map.
5. Trip Planner/Buddy: only real journeys/time-based events, with explicit opt-in alerts and volume preferences; v789 manual Buddy test popup must not be presented as a real arrival.
6. QA: S24 Ultra portrait 360–480 CSS px widths, accessibility, performance, map style reset, lost network, stale GTFS, GPS isolation, no horizontal overflow, GitHub CI. Publish only after staged acceptance.

## Acceptance criteria
- Portrait view: map accessible with bottom sheet collapsed; overlays do not hide HealthHub navigation; line numbers readable at a glance.
- 260 and 17 can independently show either direction/both, and 19 is handled by same reusable code.
- Profiles retain independently selected routes/directions on same device without leaking selections between Zsolt and Mónika.
- Layout responsive; no regressions to Family Guard main user flows.
- The difference between static routes, scheduled ETAs and real-time positions is always visually explicit.

**Release gate:** This file is the engineering baseline, **not** evidence of v791 code deployment. Do not claim live ETA or vehicle tracking until verified end-to-end.
