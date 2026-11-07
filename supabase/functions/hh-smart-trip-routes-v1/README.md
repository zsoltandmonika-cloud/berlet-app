# Smart Trip V5 · Google Routes guarded backend

**Status: development-only; not deployed; billing/network hard-lock remains FALSE.**
This branch changes no production Smart Trip, My Trips or Supabase database.
The $5 Google Billing budget is a notification, **not a hard cap**.

## Implemented
- Dedicated authenticated Edge Function (JWT, profile access, origin, JSON limits).
- Preflight quota reservation using a Postgres **transaction-level advisory lock**.
- One shared family-wide cap: **20 Google attempts/day and 200/month, UTC boundaries**.
- Atomic reservation **before** provider fetch. If quota DB or service role fails, no Google call.
- All attempts count even on provider error or timeout to prevent accidental overage.
- Endpoint request timeout 12 s; strict input size and response size.
- Approved key stays server-only; no AI forwarding, UI writes or caching.
- A compile-time OFF switch remains until launch approval.

## SQL staged, NOT applied
`supabase/migrations/20261107120000_sho_smart_trip_google_quota_v1.sql`
is an isolated proposal. It must be security-reviewed and deployed only after
backup/restore readiness, then confirmed with concurrent calls in staging.
The SQL restricts counter mutation to an explicit service-role RPC; tables have
RLS with no anon/authenticated access.

## Remaining activation gates
1. Review Routes API charges and EEA Google Maps Platform data-use conditions.
2. Confirm $5 budget alerts, API key restricted to Routes API, and Google Cloud
   quota reductions where possible. A shared key used elsewhere can bypass the
   in-app cap: only **this** server endpoint is covered.
3. Test database migration and run >=25 concurrent reservation attempts in a
   **separate non-production** environment, confirming 20/day 200/month.
4. Perform security and regression tests; check service_role key and secret storage.
5. Validate provider response, attribution rules and route accuracy.
6. Deploy deliberately with rollback; only then change hardcoded OFF switch.
7. Keep My Trips/AI integrations separate and legally reviewed.

**Budget truth:** 20/day and 200/month limit the *number* of calls, not USD
spend. The cost may vary by SKU and cannot be guaranteed under $5 merely by
counting requests. Trial terms and Google-side billing apply independently.

Run: `node --test healthhub/tests/sho-smart-trip-v5-routes-backend.test.mjs`.
