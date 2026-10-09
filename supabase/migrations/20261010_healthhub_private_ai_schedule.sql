-- HealthHub v362: resilient, private Daily Health scheduling.
-- Run only after the original healthhub-private-ai-daily job is installed.
-- Do not store the HTTP cron authentication secret in GitHub.
-- PostgreSQL cron uses UTC; local public snapshots are published at
-- Budapest 00:30 and 07:30 with DST-aware filtering at the source.
-- Existing 03:30/04:30 UTC runs generate the morning private briefing.
-- 06:30/07:30 UTC provide a safe extra recovery window for delayed data.
-- The Edge Function checks per-profile AI consent and will not repeat
-- a report already marked ready for that profile and day.
DO $$
DECLARE private_job bigint;
BEGIN
  SELECT jobid INTO private_job FROM cron.job
  WHERE jobname = 'healthhub-private-ai-daily';
  IF private_job IS NULL THEN
    RAISE EXCEPTION 'HealthHub private AI cron not installed; keep existing secret-backed job';
  END IF;
  PERFORM cron.alter_job(
    job_id := private_job,
    schedule := '30 3,4,6,7 * * *'
  );
END;
$$;
