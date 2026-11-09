# SHO Smart Trip V5 · Universal Address Pilot

## Standalone preview

`/sh9/smart-travel/public-transport/smart-trip/v5/universal/index.html`

This is an independent **address-intake / request-building pilot**, not a finished automated transit planner.

## Implemented

- Any *syntactically valid* user-typed street address, place name, or explicit `latitude,longitude`, without the original fixed Mónika-to-Kazincbarcika fixture.
- Strict input normalization and same-origin/same-destination checks. Impossible numeric coordinates, injected markup, control characters and URL inputs are rejected.
- Profile-aware accents, swap, selected priorities, departure/arrival/now mode, and optional user-click geolocation permission.
- Budapest-local date/time conversion to offset-aware UTC for Google Routes API, with explicit DST overlap and spring-forward gaps rejected.
- Provider-neutral contract `sho.smart-trip.universal/1`, and *request construction only* for Google `TRANSIT` Routes, with a 100-day provider-time horizon guard.
- Free **explicit-click** Google Maps directions handoff with arbitrary places; directions open on Google Maps, without programmatic readback or a paid API.
- Unit tests for multiple cities, national/cross-border coordinate inputs, invalid data, time zones, future dates, and billable-call isolation.

## Not yet implemented

- Real geocoding/candidate disambiguation. Typed addresses are **unverified** until a provider resolves them.
- Arbitrary-origin Google **Routes API backend**: the earlier `hh-smart-trip-real-pilot-v1` is still deliberately **locked to one fixed fixture**.
- Raw Maps Content to LLM, automatic cross-source merging, full door-to-door route validation, authenticated My Trips save, and end-to-end 30 s production SLA.
- The Google Maps URLs protocol does **not** carry a requested historical/future departure/arrival timestamp in this implementation. Google Maps opens its own transit directions, where the user can adjust the time.

## Technical boundary

`normalizeUniversalQuery(raw,{now})` returns `{status:"ok",query}` or a machine-readable validation status. Query holds arbitrary origin/destination (address or explicit coordinates), profile, Budapest-local date/time, offset-aware `when`, mode, preference and `maximumElapsedMs:30000`.

`toGoogleTransitRequest(query,{now})` constructs a provider-specific Google Routes request object but **never sends it**. It must only be handed to an appropriately authorized server-side proxy after **cost quota, billing, permission and EEA-license reviews**. Do not call Routes directly from the browser or expose a key. No billable Google request is made in this pilot.

`googleMapsHandoff(query)` returns a free user-clicked Google Maps Directions link. This is not an API and does not return route data.

## Next acceptance gate

1. Address resolution & ambiguity handling for a generic origin/destination, not a fixed test fixture. Evaluate cost/legal constraints before enabling Places/Geocoding.
2. General-purpose, authenticated and **explicit opt-in** Routes API proxy with a hard, verified budget and server-side quotas, no silent Google calls.
3. Independent provider GTFS validation where coverage exists; source-legal, clearly attributed route presentation. EEA Maps Content must not be mixed with unsupported maps or forwarded to LLM against the applicable agreement.
4. Legally permissible Léna personalization, TripPack and save receipt, with one safe A plan and total end-to-end search-to-render-and-save measurement **≤30 seconds**.
5. Acceptance suite for arbitrary Hungarian cities, rural addresses, coordinates, missing matches, ambiguity, multimodal trips, timetables, and errors. Never claim an invented A plan or guaranteed service to every address.

## Verification

`node --test healthhub/tests/sho-smart-trip-v5-universal-address.test.mjs`

No existing production SHO, Supabase deployment, Google quota or My Trips records were modified by these changes.
