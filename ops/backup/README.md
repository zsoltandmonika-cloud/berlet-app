# SHO / HealthHub · OneDrive Backup / Restore · canonical design (2026-11-23)

**State: STAGING, NOT LIVE.** The public `berlet-app` main branch and production Supabase data are untouched. Do not claim a successful backup merely because source code, a Git commit, or setup ZIP exists.

## Single reliable backup mechanism

Use **Restic** with an independently authorized **rclone OneDrive target**. Restic supplies **one encryption layer**, deduplication, snapshot indexes and integrity verification. No parallel second encrypted ZIP/age backup is necessary for the *canonical* job. The older `nightly-full-backup.sh` is a legacy experimental candidate and is NOT the chosen runner.

- Canonical data target: `onedrive:SHO/Backups/restic-staging-v1`.
- Readable run reports: `onedrive:SHO/Backups/restic-staging-runs/<backup_id>/status.json`.
- Existing account: `zsolt.monika@outlook.com`, drive ID `BC1FF24AF37EA2B0`.
- Schedule: **00:15 Europe/Budapest**, daily, using GitHub Actions' timezone-aware schedule.
- Manual and **pre-development** buttons dispatch the **same capture code**, with a `backup_kind` tag of `manual` or `pre_development`. Neither source mutates data.
- Always create a unique run ID, do not overwrite prior snapshots. A pre-development snapshot must remain identifiable and must never be deleted by an automatic cleanup before recovery has been proven.
- No automatic deletion, OneDrive cleanup, cloud-source write, OTA or production restore from this workflow.

## Required captured sources (current staging)

| Component | Capture |
| --- | --- |
| Public berlet-app and private MediaRadar | Git mirrors, verified bundles, all refs, available LFS |
| Dropbox HealthHub Cloud Vault and healthhub-vault | Read-only complete source tar streams |
| HealthHub-Core PostgreSQL 17 | Full custom pg_dump, streamed into Restic |
| Supabase Storage | **Actual object bytes**, not just storage.objects metadata |
| Deployed Supabase Edge Functions | Management API body of every deployed function |
| Recovery configuration | Pre-encrypted owner-controlled recovery escrow |

The pipeline rejects missing sources, fails on an invalid credential, checks **all Restic pack data** from OneDrive via `restic check --read-data`, and restores an inventory object to prove a nontrivial read-back. The live sources across services are **not an atomic multi-system snapshot**.

## What is not yet covered / meaning of 100%

**STAGING_INCREMENTAL_REPO_DATA_VERIFIED is not FULL_SYSTEM_RESTORE_READY.** A full device/system restore must also cover phone-only/offline data, device-bound secrets and pairing (where recoverable), Book Studio and external OneDrive media/book libraries, any non-archived content, Samsung-SDK-inclusive signed APK build provenance, and provider-side configuration. Supabase Auth, Storage and Edge Function service configuration must be independently restored in an isolated Supabase project. A successful checksum verifies data, not whether each restored application works.

Only after *every mandatory source* is inventoried, a **full sandbox restore** succeeds, tests prove user-facing functions/data and the owner signs off, can any dashboard display FULL SYSTEM RESTORE READY. The restore button currently only prepares a non-destructive plan.

## Minimal security, no duplicate approvals

1. **One private GitHub repo** named `SHO-Backup-Runner` runs backup jobs and holds runner credentials. The public SHO app repo never handles those secrets.
2. The existing **HealthHub owner-authenticated admin session** authorizes the backup action. No fresh PIN, backup-specific user login or repeated confirmation clicks are needed for read-only backup. The Edge bridge checks the owner UUID and that the runner repository is private before dispatch.
3. **One Restic encryption password**, retained securely **outside GitHub and OneDrive**, plus the already pre-encrypted recovery escrow. The private runner has narrowly scoped OAuth/API permissions. No raw tokens in HTML, source, issues, chat or logs.
4. **Production restore** is the sensitive write operation and needs separate explicit owner authorization and isolated recovery rehearsal.

## One-time activation

The initial private runner has **not** been created and persistent delegated runner credentials have **not** been verified. Follow `private-runner/OWNER_BOOTSTRAP.md` to prepare the private `SHO-Backup-Runner` repo and six secrets. The GitHub workflow template is `private-runner/sho-backup-unified.template.yml`, to be installed as `.github/workflows/sho-backup-unified.yml` inside that private repository. Do **not** install secrets in public `berlet-app` (including GitHub Actions environments there).

After deployment review, install the owner-only Supabase `hh-backup-control-v1` Edge bridge with a scoped dispatch token for **only the private runner**, explicit Auth UUID allowlist and readiness confirmation. Never deploy this Edge endpoint merely to bypass an unconfigured runner. The admin page is `healthhub/admin-backup/` inside the existing `Biztonság` category, not a new admin portal. A `202 Accepted` response means **requested**, not verified.

Perform a manual isolated backup, read-back, Restic integrity scan, **full sandbox restore**, and an incremental second run before enabling the automatic daily schedule in the private runner. The committed template includes the scheduled trigger, but no actual nightly job exists until the private repo is configured and its workflow enabled.

## Operational status model

- `NOT_CONFIGURED`: private runner or its credentials absent; manual buttons remain disabled.
- `REQUESTED` / `QUEUED` / `RUNNING`: GitHub workflow state, **not** success.
- `FAILED`: error, no promotion.
- `STAGING_INCREMENTAL_REPO_DATA_VERIFIED`: all listed cloud sources captured and Restic remote pack read-back passed; **not** full restore.
- `FULL_SYSTEM_RESTORE_READY`: reserved for independent full restore and validated complete coverage; **not emitted** by the current code.

Recovery points: initially aim for 30 daily + 12 monthly snapshots. **Do not enable automated retention/prune** before measuring real sizes, full restore validation, and explicit owner agreement. Monitor target quota with warning at 80%; zero automatic zombie-file cleanup without verified scope.

## Blocking limitations discovered in the initial audit

The OneDrive `SHO/Backups` folder contains only the earlier setup ZIP and PowerShell health-check script, not a full snapshot. The current Microsoft connector can list the folder, while fetching the PowerShell item returned HTTP 403 `serviceReadOnly`. This is not proof the new runner has persistent upload permission. Full production restore is currently not available.

See also `INCREMENTAL_STAGING.md`, `verify_restore.py` and the regression tests. The older draft PR #1066 contains historical design work but its branch is no longer available as a named ref. This work is continued in a new protected feature branch.
