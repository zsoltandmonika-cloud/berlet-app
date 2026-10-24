# SH9 · Smart Travel · Golden Standard v1

## Scope
- The SH9 launchpad's **Smart Travel** tile opens `/sh9/smart-travel/`.
- Approved premium-glass 3×3 categorization, with **Ask Léna** centered.
- Five-button SH9-standard dock. **Kezdőlap** returns to `/sh9/`.
- Familiar one-tap Zsolt/Mónika profile switch stored via existing `hh-profile` key, with matching tap sound and no medical data mutation.
- Hero expects `sh9/assets/SH9_Smart_Travel_Hero_1402x1122.png` (user-approved **1402 × 1122 px** PNG). If not deployed, the existing SH9 Hero displays as an explicit technical fallback.

## Connected (real) services
- **Trip Planner** → existing Family Guard Smart Hub Planner, via in-page anchor `#hhSmartHubDestinationV802`. Its currently supported GTFS routing remains limited to 260, 17, 19.
- **Public Transport** → existing Family Guard public-transit panel `#hhTransitPanel`.
- **My Places** → existing Family Guard per-profile favorites `#hhSmartHubFavoritesV806`.
- **Ask Léna** → existing central HealthHub `chatgpt-project-shortcut-v712.js`, unchanged; missing project configuration redirects to central Admin.

## Explicitly not activated
Road Travel, Air Travel, Taxi, Shared Mobility, My Trips. These tile buttons display an honest 'under development' modal; no fake prices, routes, bookings, or location data.

## Deployment note
The approved PNG is supplied separately with the SH9 Smart Travel Hero upload kit. Its exact repository path is:
`sh9/assets/SH9_Smart_Travel_Hero_1402x1122.png`.
The image should be uploaded to GitHub before final visual sign-off. Do not use a temporary sandbox URL for a production background.

## Regression protection
No existing Family Guard / HealthHub logic was modified. The launchpad change is limited to one new `data-href` for Smart Travel.
