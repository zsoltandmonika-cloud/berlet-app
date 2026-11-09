# SHO Smart Trip AI V5 · Universal Google Routes Gateway

## Status: opt-in, disabled-by-default, separate Edge Function

Endpoint **if deployed**:
\`POST https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-smart-trip-universal-v1\`

Never change or replace the legacy \`hh-smart-trip-real-pilot-v1\` function.
This new gateway accepts any validated pair of addresses, place names or explicit GPS coordinates, and the time/profile/preferences contract from the V5 Universal UI.

## Hard prerequisites to enable real Google requests

Three independent secret flags must ALL be the literal string \`true\`:

- \`HH_SMART_TRIP_UNIVERSAL_ENABLED\`
- \`HH_SMART_TRIP_UNIVERSAL_BILLING_VERIFIED\`
- \`HH_SMART_TRIP_UNIVERSAL_EEA_REVIEW_APPROVED\`

All default to **OFF**. Deployment alone does **not** authorize Google calls.
The second and third flags must only be set after checking the real Google Cloud billed SKU, project-level requests/day quota, available budget and applicable EEA Maps terms. A Google Cloud billing budget **alert is not a hard spending cap**. Server-side atomic quota is required even if Cloud quotas exist.

Other required server secrets: \`HH_SMART_TRIP_GOOGLE_ROUTES_KEY\`, the Supabase project URL and the existing publishable/admin keys. The browser must never see the Google API key or service-role key.

Do not turn on the flags in this PR or in CI.

## Authorization and quotas

- Exact allowlisted browser Origin, POST-only JSON, strict 2,300 character request limit.
- Signed-in non-anonymous Supabase user JWT via \`auth.getUser\`; \`hh_profile_access\` ownership/permission check for the requested profile.
- Explicit per-request consent. Two modes: \`diagnose\` and \`search\`.
- \`diagnose\` is read-only, with **zero** Google requests and **zero** quota reservations.
- \`search\` blocks until all three flags are enabled and a preexisting atomic
  \`hh_smart_trip_google_reserve_pilot\` RPC approves \`p_expected_daily_used:0\`.
- This means **at most one successful reservation per UTC day shared with the older pilot**. If the older pilot has already used the daily allowance, the universal search fails closed. One allowed request may be billable. Failed provider calls may consume a reservation; a quota reservation is **not proof of billed usage**.
- No automatic retries or additional Google variants; a single computeRoutes request with up to 4 provider-selected alternatives.
- HTTP provider timeout 14 s; browser total hard limit 29 s from click, including auth, network and presentation.

## Source and privacy boundaries

- Only origin/destination and requested date/time are given to Google Routes after opt-in.
- Google transit routes display **without any map, or linked Google Maps directions on the same result UI**, with explicit Google Maps attribution.
- No Google Maps Content to any LLM, AI, training, storage, localStorage, My Trips or external services.
- Route descriptions remain provisional and in Google-supplied order, not a independently timetable-validated SHO A plan.
- Address resolution is performed within Google Routes. An ambiguous or unmatched address **is not guaranteed to be correctly geocoded**. A separate disambiguation/candidate-confirmation interface is still required for reliable 'any address' acceptance.
- Existing BKK/MÁV/Volán real local adapters are not modified. Independent local timetable verification/route merging will be a later guarded phase.

Official:
- https://developers.google.com/maps/documentation/routes/transit-route
- https://developers.google.com/maps/documentation/routes/specify_location
- https://developers.google.com/maps/documentation/routes/usage-and-billing
- https://developers.google.com/maps/comms/eea/routes
- https://cloud.google.com/terms/maps-platform/eea

## Request

\`Content-Type: application/json\`; \`Authorization: Bearer <signed_in_user_token>\`;
\`apikey: <project_publishable_key>\`.

Body is a strict object:

\`{"mode":"diagnose"|"search","consent":true,"query":<normalized V5 universal query>}\`.

The shared query is constructed via \`normalizeUniversalQuery\` in
\`sh9/smart-travel/public-transport/smart-trip/v5/universal/universal-request.mjs\`.
The Edge Function separately revalidates all fields and server-side time and quota.

**Do not claim a functional production search** until the new function is deployed disabled-by-default, its profile checks and diagnose are exercised with an authenticated browser, legal/billing gates are independently reviewed, and a single explicitly authorized real request succeeds.

## Tests

\`node --test healthhub/tests/sho-smart-trip-v5-universal-gateway.test.mjs\`

\`deno check supabase/functions/hh-smart-trip-universal-v1/index.ts\`

Both run through the existing V5 QA workflow. Deno checks the code only and does not deploy it.

## Acceptance gates still missing

1. Verified source licensing and billing.
2. Server deployment of this separate function with JWT verification enabled, **flags OFF**.
3. Authenticated real-browser \`diagnose\`, zero paid requests.
4. One human-approved Google request (only after billing + EEA review).
5. Robust ambiguity handling, independent operator checks and legally permissible Léna A response.
6. Real end-to-end 30-second complex travel test including save acknowledgment.
