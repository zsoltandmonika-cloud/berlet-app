# Smart Trip V5 · Production backup / rollout gate (2026-11-07)

**Status: NOT READY TO DEPLOY.** The quota migration and new Edge Function are
reviewable only in draft PR #792. The paid Google path is hardcoded OFF.

## Verified with read-only Supabase inspection
- Target project: HealthHub-Core in a **Pro** organization, PostgreSQL 17.
- Quota table and reservation function do **not** yet exist in production.
- Storage is in active use; database backup and Storage objects are separate.
- An independent PostgreSQL 17 CI successfully simulated 25 concurrent quota
  requests (20 admitted, 5 denied), then verified the monthly cap.
- We have **not** established actual database backup timestamp, object export,
  offsite storage integrity, or a successful restore drill.

## Backup gate: all boxes required before production schema change
- [ ] Open [Database > Backups](https://supabase.com/dashboard/project/vhsrupphzcjkdrusonzh/database/backups);
      inspect a successful backup timestamp and retention. Pro entitlement
      does not prove that a usable backup exists for this particular project.
- [ ] Verify a restore plan: target and documented recovery steps, and a
      nonproduction restore rehearsal where feasible. Never restore over
      production merely to test.
- [ ] Independently export the needed **private Storage objects**, not only
      database metadata. Use encrypted, access-controlled offsite storage.
      Verify manifest/count, file integrity, and ability to download/read
      representative files. Do not put private files in GitHub or logs.
- [ ] Record who performed the checks and the verification date/time in a
      private operational record. Do not include tokens, IDs or private data
      in this public repo.
- [ ] Confirm the current Smart Trip, My Trips, HealthHub and Storage operation
      before the change; keep the existing rollback checkpoint.

## Deploy sequence **after** all gates pass
1. Confirm no live Google Routes integration is enabled.
2. Apply additive migration
   `supabase/migrations/20261107120000_sho_smart_trip_google_quota_v1.sql`
   using a reviewed migration workflow. No existing tables are modified.
3. Run the read-only `quota-preflight.sql` to verify RLS, quota function grants
   and a zero count in the new table. Then separately test reservations in
   a transaction that is guaranteed to ROLLBACK.
4. Run Supabase Security Advisors and existing regression checks.
5. Deploy the new Edge Function **only while the compile-time Google flag
   remains false**. Do not configure a billing-capable Google key yet.
6. Review Google Routes SKU and EEA terms for display, AI and persistence,
   set Google-side quotas where supported, restrict the key, ensure no other
   caller uses it; then request a separate conscious activation.
7. On outage, leave the endpoint disabled and continue existing Matrix/GTFS
   search. No reason to restore the entire database merely to revert this
   isolated feature.

## Safety: what this is and is not
The SQL protects **one endpoint** by atomically allowing at most 20 attempted
requests per UTC day and 200 per UTC month across both profiles. Failed Google
calls consume a reservation. It does **not** guarantee an absolute $5 limit.
The Google Billing $5 budget is only an alert. Cloud costs from leaked keys,
other APIs or manually issued requests are not limited by this SQL.

Database backups do not contain Storage API file bytes:
https://supabase.com/docs/guides/platform/backups
