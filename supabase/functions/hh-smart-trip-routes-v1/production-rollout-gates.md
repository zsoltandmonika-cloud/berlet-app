# Smart Trip V5 · Production backup / rollout gate (2026-11-07)

**Status: quota-only migration DEPLOYED 2026-11-07 to HealthHub-Core; Edge Function NOT DEPLOYED; paid Google path remains hardcoded OFF.**
The migration was additive; no existing tables, Storage objects or Smart Trip clients changed. The user confirmed seeing an early-morning database backup, but restore validation and Storage export are still outstanding.

## Verified with read-only Supabase inspection
- Target project: HealthHub-Core in a **Pro** organization, PostgreSQL 17.
- Quota table and reservation function do **not** yet exist in production.
- Storage is in active use; database backup and Storage objects are separate.
- An independent PostgreSQL 17 CI successfully simulated 25 concurrent quota
  requests (20 admitted, 5 denied), then verified the monthly cap.
- We have **not** established actual database backup timestamp, object export,
  offsite storage integrity, or a successful restore drill.

## Backup gate: remaining checks before any API activation or broad rollout
- [x] User confirmed a daily backup is visible after 01:00; exact timestamp and restore integrity have not been independently verified.
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

## Remaining rollout sequence **after** all gates pass
1. Quota-only SQL migration `supabase/migrations/20261107170126_sho_smart_trip_google_quota_v1.sql` was applied as Supabase migration 20261107170126.
2. Verified on production: RLS enabled, 0 initial quota rows, anon/authenticated cannot execute RPC, service_role can.
3. Rolled-back production smoke test: 20 accepted, 5 denied, rollback preserved zero counters.
4. Supabase Security Advisors: one expected informational RLS-no-policy flag for the locked-down quota table; RLS and revoked client grants are intentional.
5. Confirm backup restore plan and separate private Storage file backup before broader rollout.
6. Deploy the Edge Function **only while the compile-time Google flag remains false**. Do not configure a billing-capable Google key yet.
7. Review Google Routes SKU and EEA terms for display, AI and persistence; configure key/provider protection, then separate deliberate activation.
8. On outage, leave endpoint disabled and continue existing Matrix/GTFS search.

## Safety: what this is and is not
The SQL protects **one endpoint** by atomically allowing at most 20 attempted
requests per UTC day and 200 per UTC month across both profiles. Failed Google
calls consume a reservation. It does **not** guarantee an absolute $5 limit.
The Google Billing $5 budget is only an alert. Cloud costs from leaked keys,
other APIs or manually issued requests are not limited by this SQL.

Database backups do not contain Storage API file bytes:
https://supabase.com/docs/guides/platform/backups
