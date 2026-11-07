# Smart Trip V5 · Google Routes EEA compliance gate

Reviewed: 2026-11-07 against Google's official EEA Routes API integration guidance
and the current EEA service-specific terms. **This is a technical compliance
risk assessment, not a legal opinion or permission to activate paid requests.**

## Verified requirements
- For an EEA billing account, Google Routes API descriptions or steps must
  **not be displayed with any map**. Google defines this broadly: on a map,
  adjacent, visually associated, or linked to a map. Do not mix these in
  SHO's map-oriented route detail component.
- Google content must be clearly distinguished and attributed to Google Maps.
- For Google-derived routes: keep any presentation **map-free**, with visible
  Google Maps provenance. Rendering data on an independent GTFS map does not
  make it safe to associate a Google route with the map.
- Do not send Google Routes content to GPT, Gemini, another LLM or any AI
  model as an input until a specific permitted use is legally established.
  The Maps Grounding product has its own limited AI exception; that does not
  automatically apply to ordinary Routes API responses.
- Do not persist route descriptions/steps or raw Google route JSON to My Trips,
  client cache, analytics or AI prompts; temporary caching exceptions for
  lat/lng are narrow and not general permissions for step storage.
- The user-provided origin/destination coordinates are disclosed to Google
  when the API is eventually called; handle accordingly with appropriate
  consent/privacy notice.

## Architecture proposal (gated)
A. Google transit result: isolated Google-attributed, **text-only** content,
   no map and no transfer to an LLM, subject to final legal review.
B. First-party and licensed GTFS/MÁV/Volán route search: can feed the existing
   SHO preference engine and Léna narrative, with its own provenance and
   license checks, independently of Google Maps Content.
C. Do not combine Google route descriptions with GTFS maps or write Google
   results into independent trip records without further legal confirmation.

## Checked technical sources
- EEA Service Specific Terms: https://cloud.google.com/terms/maps-platform/eea/maps-service-terms
- EEA Routes integration guide: https://developers.google.com/maps/comms/eea/routes
- Routes transit: https://developers.google.com/maps/documentation/routes/transit-route
- Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms

## Still OPEN
- Confirm billing-account region and exact customer agreement.
- Confirm permitted ranking/derivation and AI processing with appropriate
  Google documentation or official written clarification.
- Final attribution/transportation-provider attribution design.
- Written privacy notice and security/key restriction review.
- No real API request until deliberate opt-in activation.
