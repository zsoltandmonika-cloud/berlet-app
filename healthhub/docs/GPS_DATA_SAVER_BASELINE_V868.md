# Family Guard GPS Data Saver v868 | Before / After audit

Date: 2026-10-26. Project: HealthHub-Core. Environment: Supabase Free.
Goal: less redundant usage without degrading consented live family tracking or exposing location histories.

## BEFORE (observed)
Supabase `edge_logs`, exact 24h UTC window `2026-10-25T22:00:00Z` through `2026-10-26T22:00:00Z` (23:00 Budapest Oct 25 through 23:00 Oct 26; DST changed on Oct 25).

| Endpoint / action | BEFORE requests | AFTER requests | Delta |
| --- | ---: | ---: | ---: |
| `hh_guardian_live_locations` GET | 12,492 | Pending 24h observation | Pending |
| `hh_guardian_live_locations` POST | 934 | Pending | Pending |
| `hh_guardian_shared_landmarks` GET | 2,733 | Pending | Pending |
| `hh_guardian_location_settings` POST | 1,618 | Pending | Pending |
| **Combined monitored requests** | **17,777** | **Pending** | **Pending** |
| `hh_ask_lena_history` GET (separate control) | 5,467 | Pending | Pending |

These are **request counts**, not measured outgoing bytes. The HTTP `content_length` header is missing for many log events, and the Supabase egress chart reports only organization/service billing totals, not exact endpoint-level bytes. **Do not claim verified GB savings without billing/egress snapshots.**

## Implementation / acceptance rules
- One authenticated, profile-scoped 2.2-second GPS read cache shared by Family Live, profile follow and GPS/Health trio; one in-flight request per profile and owner.
- Only genuinely measured, accurate speed below 4 km/h permits reduced refresh. Unknown speed / moving keeps existing fast cadence.
- Family Live peer reads at most every 10 seconds while demonstrably stationary; profile-follow 9-second stationary cadence; while moving the 3-second follow cadence remains.
- Local foreground GPS upload heartbeat at least every 10 seconds while demonstrably stationary, respecting the 20-second freshness criterion.
- Common landmarks refresh at most every 2 minutes except on explicit changes; unchanged location settings never repeat POST; Ask Lena history cache 5 minutes with immediate unsynced answer upload and manual override.
- Preserve auth, per-device ownership, RLS, profile separation, GPS revocation and last-known-vs-live labeling.
- The GPS Data Saver is a **cost optimizer**, not an emergency/rescue service.

## AFTER measurement protocol
1. Confirm the commit actually deployed to the real page; record deploy SHA and local test results. No measurements until deployment is verified.
2. During representative normal use (two enrolled phones, fixed foreground sessions), take the next full 24-hour `edge_logs` window; query the same paths/methods.
3. Calculate `savings_pct = 100 * (before_calls - after_calls) / before_calls`, each endpoint and combined, **with observed active hours**. Compare normalized requests/hour if foreground usage duration differs.
4. Check live accuracy, stale indicators, 3-second movement follow, upload ownership, profile switching, revoke/stop and no consent bypass. Roll back if a safety/regression issue appears.
5. Compare official Supabase **egress billed bytes** over comparable daily periods separately; note background app usage and development/testing differences. Never compute GB savings by treating request count as byte count.
6. Proposed goal: at least **70% fewer redundant monitored API calls** in comparable stationary/normal use. Target only; no AFTER figure or GB reduction is confirmed as of this baseline.

## Rollback
Revert the v868 GPS Data Saver code and previous v867 cache patches in the dedicated PR. Existing database tables, location history, device registration, access rules, medical records and credentials are intentionally unchanged.
