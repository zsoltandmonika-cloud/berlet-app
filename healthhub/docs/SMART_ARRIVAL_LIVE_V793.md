# Smart Arrival v793 – BKK real-time data gate (development only)

## Official source and prerequisites
- BKK official opendata: https://opendata.bkk.hu/data-sources
- GTFS-RT VehiclePositions and TripUpdates require a BKK-issued API key.
- Never put a secret key into GitHub Pages, the browser, or a public repository.
- A server-side worker / Supabase Edge Function should retrieve GTFS-RT protobuf with the key from its secret store; map trip/route IDs against the BKK static GTFS and return only allowed 260/17/19 observations.
- Secure server deployment, real BKK key, route mapping and arrival prediction **are not yet implemented**.

## Proposed sanitized server response
```json
{"schemaVersion":1,"source":"BKK Zrt., CC BY 4.0","feedType":"GTFS-RT VehiclePositions","generatedAt":"2026-10-22T15:00:00Z","vehicles":[{"id":"provider-vehicle-id","routeId":"260","lat":47.57,"lng":19.01,"timestamp":"2026-10-22T15:00:00Z","headsign":"..."}]}
```

`bkk-live-v793.js` validates a response but performs no network calls. Responses older than 90 seconds or with missing provenance are rejected. Individual invalid, impossible, or stale vehicle observations are excluded. No simulated markers, vehicle positions or ETAs.

## Release guardrails
1. Keep current v792 static layers, Buddy, portrait sheet and profile controls untouched.
2. Implement authenticated server-side BKK adapter with rate limits, caching, and BKK ID mapping.
3. Integrate dynamic layer only after verified BKK observations and permission-safe frontend handling.
4. Show timestamp, live/stale/unavailable state and attribution. Never label static path badges as live vehicles.
5. Test real endpoint, network failure and revocation; run Android portrait acceptance before merging.
