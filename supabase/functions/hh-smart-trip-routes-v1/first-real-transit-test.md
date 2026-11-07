# Smart Trip V5 · first real Routes transit pilot gates (2026-11-07)

**LIVE GOOGLE IS OFF. This document is a pilot runbook, not permission to activate.**
The first test uses Mónika's saved workplace → Kazincbarcika destination
already provided by the isolated V5 form, for 2026-11-27 15:00 Budapest time.

## Stage 0: authenticated, zero-Google route preflight (deploy v4)
- Edge Function: `hh-smart-trip-routes-v1`, Supabase HealthHub-Core.
- JWT verification ON; route requires an authenticated account entitled to
  profile `m` and the allowlisted GitHub Pages Origin.
- Method: POST; `Content-Type: application/json`.
- Never place user access tokens or Google API keys in chat, source code, URL
  query parameters, screenshots, analytics or logs.
- Body below uses origin/destination values **already present in the V5 form**:
```json
{
  "mode": "route_preflight",
  "profile": "m",
  "origin": {"lat": 47.52693, "lng": 19.03802},
  "destination": {"lat": 48.25657, "lng": 20.62831},
  "departureTime": "2026-11-27T15:00:00+01:00"
}
```
Expected 200 for authorized tester:
```json
{
  "status":"ready_for_review",
  "mode":"route_preflight",
  "request_valid":true,
  "user_authorized":true,
  "google_enabled":false,
  "google_request":false,
  "quota_consumed":0,
  "source":"local_validation",
  "note":"not_live_google_result"
}
```
No route result is returned. `401` means gateway JWT issue; `403`
means incorrect Origin or profile access; `400` means malformed request.
Sending the same request **without** `mode` must remain blocked with
`provider_not_enabled` and no Google request.

## Stage 1: real Google Routes request (NOT AUTHORIZED YET)
Checklist:
- [x] DB quota migration, daily 20 / monthly 200 with transactional reservation.
- [x] 25-concurrent CI case verified, 20 accepted/5 rejected.
- [x] Server-side source hardcodes `ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED=false`.
- [x] Deployment v4 checked: verify_jwt=true, Google OFF, quota counter 0.
- [ ] Authenticated POST Stage 0 exercised on a logged-in device, results verified.
- [ ] Google key present in Supabase Secrets and Routes API restriction verified.
      The user deferred separate key diagnostics; verify on first approved live
      trial without exposing the secret.
- [ ] Production Google billing account location/terms confirmed, EEA restrictions
      addressed for the precise use case.
- [ ] User informed about coordinates sent to Google and privacy terms;
      explicit location processing consent recorded if required.
- [ ] Third-party transit attribution, route presentation without any map,
      retention rules and no-LLM use reviewed.
- [ ] Independent private Supabase Storage backup and restore readiness verified.
- [ ] Wider Smart Travel regression failures triaged before main branch merge.
- [ ] Explicit activation decision, documented stop conditions and operator
      monitoring of provider spend/usage.
Only after every required gate: deploy a deliberately approved variant allowing
one **quota-counted** Google request in a tightly controlled pilot. Do not
turn on general client traffic or merge the draft by implication.

## Success criteria for that later 1-request pilot
- Validate provider HTTP status and exact error category safely; never log
  response payload or secret key.
- Check Google provider route count (0 to 4; alternatives not guaranteed)
  without feeding Google content into GPT/Gemini/Léna AI.
- Validate UTC timestamp (15:00 CET = 14:00 UTC on 27 November 2026).
- Display Google content, if permitted, only in a dedicated Google-attributed
  **text-only** view and never alongside/linked to any map.
- Separately evaluate independent GTFS/MÁV/Volán suggestions using licensed
  data. Do not derive an independent route or AI story from Google Maps Content.
- Verify 1 server quota unit consumed for attempted provider request;
  clear rollback instructions and leave the existing Smart Trip unaffected.
- Confirm Google Billing: the $5 budget is an alert **not a hard cap**.

## References
- https://developers.google.com/maps/documentation/routes/transit-route
- https://developers.google.com/maps/comms/eea/routes
- https://cloud.google.com/terms/maps-platform/eea/maps-service-terms
- https://cloud.google.com/maps-platform/terms

No Google request, AI processing of Google content or My Trips write is
authorized by this file.
