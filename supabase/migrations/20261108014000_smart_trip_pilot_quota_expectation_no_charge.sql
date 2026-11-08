-- Smart Trip V5: one-shot pilot atomic quota reservation with rejection before charge.
-- Shared PostgreSQL advisory lock with existing global quota RPC (846207,5200).
-- Does not change global 20/day, 200/month policy or its existing function.
-- Pilot stages: expected 0 before first, 1 before second, 2 before third.
-- Once a pilot has run, a retry returns allowed=false without incrementing.
CREATE OR REPLACE FUNCTION public.hh_smart_trip_google_reserve_pilot(
  p_expected_daily_used integer
)
RETURNS TABLE(allowed boolean,daily_used integer,monthly_used integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 d date := (now() AT TIME ZONE 'UTC')::date;
 m date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 dc integer;
 mc integer;
BEGIN
 IF p_expected_daily_used IS NULL
   OR p_expected_daily_used NOT BETWEEN 0 AND 2 THEN
  RAISE EXCEPTION 'invalid_pilot_stage' USING ERRCODE = '22023';
 END IF;

 -- Same xact lock as the legacy/global atomic reserve function.
 PERFORM pg_catalog.pg_advisory_xact_lock(846207,5200);
 INSERT INTO public.hh_smart_trip_google_quota(period_kind,period_start)
 VALUES ('day',d),('month',m) ON CONFLICT DO NOTHING;
 SELECT used INTO dc FROM public.hh_smart_trip_google_quota
 WHERE period_kind='day' AND period_start=d FOR UPDATE;
 SELECT used INTO mc FROM public.hh_smart_trip_google_quota
 WHERE period_kind='month' AND period_start=m FOR UPDATE;

 -- Crucial: deny BEFORE writing the quota counters, including replay attempts.
 IF dc <> p_expected_daily_used OR dc >= 20 OR mc >= 200 THEN
  RETURN QUERY SELECT false,dc,mc;
  RETURN;
 END IF;

 UPDATE public.hh_smart_trip_google_quota SET used=used+1,updated_at=now()
 WHERE (period_kind='day' AND period_start=d)
    OR (period_kind='month' AND period_start=m);
 RETURN QUERY SELECT true,dc+1,mc+1;
END;
$$;

REVOKE ALL ON FUNCTION public.hh_smart_trip_google_reserve_pilot(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hh_smart_trip_google_reserve_pilot(integer)
  TO service_role;
COMMENT ON FUNCTION public.hh_smart_trip_google_reserve_pilot(integer) IS
 'One-shot three-query Google pilot: atomic expected daily counter 0/1/2; rejects duplicate runs without consuming quota; uses global 20/day 200/month caps.';
