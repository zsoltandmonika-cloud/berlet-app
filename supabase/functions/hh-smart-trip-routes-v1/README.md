# Smart Trip V5 · Google Routes backend gate

This branch introduces `supabase/functions/hh-smart-trip-routes-v1/index.ts`
only. It does **not** deploy the function, change the live Smart Trip interface,
save to My Trips, or call Google.

## Current implementation
- JSON-only POST with allowlisted GitHub Pages Origin.
- Supabase bearer JWT verification and per-profile `hh_profile_access` RLS lookup.
- Coordinate/time validation, bounded input and response size, 12 s timeout.
- An isolated Google Compute Routes adapter prepared with minimal transit field mask.
- A **hardcoded false** compile-time gate preventing paid Google calls. Environment
  flags alone must never unlock billing.
- No AI, Google content storage, or end-user travel claims.

## Hard gates before any activation
1. Legal owner reviews Google Maps Platform EEA service-specific terms and
   permitted use, including response display, attribution, retention and AI.
2. Provision Google Cloud Routes API billing, strict quotas and billing alerts.
3. Implement durable, atomic per-user/day quota reservation that fails closed,
   along with concurrency protection and observability.
4. Configure the backend secret in Supabase; never send it to the browser.
5. Review auth/CORS (Origin alone is not authentication), live schedule coverage,
   third-party route content rules, and response transformation.
6. Run unit tests, security review, real device end-to-end timings, rollback QA.
7. Separately wire V5 pilot to authenticated endpoint with approved data flow.

Until then: use existing synthetic V5 demonstration and official Maps handoff.
Run: `node --test healthhub/tests/sho-smart-trip-v5-routes-backend.test.mjs`.
