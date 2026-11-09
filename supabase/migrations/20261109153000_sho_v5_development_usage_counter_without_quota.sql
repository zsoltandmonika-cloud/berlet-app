-- SHO Smart Trip V5 development-only Google Routes usage accounting.
-- Explicit owner permission 2026-11-09: no application daily/monthly cap before go-live.
-- Existing hh_smart_trip_google_reserve() and _pilot() remain unchanged for
-- other flows. Every request is counted, never executed without authorization.
CREATE OR REPLACE FUNCTION public.hh_smart_trip_google_reserve_dev()
RETURNS TABLE(allowed boolean,daily_used integer,monthly_used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
 d date := (now() AT TIME ZONE 'UTC')::date;
 m date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 dc integer;
 mc integer;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(846207,5200);
 INSERT INTO public.hh_smart_trip_google_quota(period_kind,period_start)
 VALUES ('day',d),('month',m) ON CONFLICT DO NOTHING;
 UPDATE public.hh_smart_trip_google_quota
 SET used=used+1,updated_at=now()
 WHERE (period_kind='day' AND period_start=d)
    OR (period_kind='month' AND period_start=m);
 SELECT used INTO dc FROM public.hh_smart_trip_google_quota
 WHERE period_kind='day' AND period_start=d;
 SELECT used INTO mc FROM public.hh_smart_trip_google_quota
 WHERE period_kind='month' AND period_start=m;
 RETURN QUERY SELECT true,dc,mc;
END;
$fn$;
-- Security-definer functions are public by default: lock down BEFORE enabling.
REVOKE ALL ON FUNCTION public.hh_smart_trip_google_reserve_dev() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hh_smart_trip_google_reserve_dev() TO service_role;
