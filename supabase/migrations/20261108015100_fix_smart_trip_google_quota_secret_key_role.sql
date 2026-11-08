-- Smart Trip V5: fix Google quota RPC secret-key authorization on Supabase.
-- Cause: new sb_secret maps to service_role without legacy JWT role claims;
-- existing session_user is authenticator, so the old guard always raised 42501.
-- Security remains enforced by the explicit EXECUTE privilege below.
-- Keep atomic serialization, daily 20 / monthly 200 limits, and fail-closed policy.

CREATE OR REPLACE FUNCTION public.hh_smart_trip_google_reserve()
 RETURNS TABLE(allowed boolean, daily_used integer, monthly_used integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  d date := (now() AT TIME ZONE 'UTC')::date;
  m date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  dc integer;
  mc integer;
BEGIN
  -- Caller permission is enforced by the Postgres EXECUTE GRANT below.
  -- New sb_secret keys map to the service_role Postgres role but do not
  -- necessarily populate legacy request.jwt.claim.role, and PostgREST
  -- runs as authenticator so session_user must NOT be used as a gate.
  -- One transaction-level lock serializes both period checks and writes.
  PERFORM pg_catalog.pg_advisory_xact_lock(846207, 5200);
  INSERT INTO public.hh_smart_trip_google_quota(period_kind,period_start)
    VALUES ('day',d),('month',m) ON CONFLICT DO NOTHING;
  SELECT used INTO dc FROM public.hh_smart_trip_google_quota
    WHERE period_kind='day' AND period_start=d FOR UPDATE;
  SELECT used INTO mc FROM public.hh_smart_trip_google_quota
    WHERE period_kind='month' AND period_start=m FOR UPDATE;
  IF dc >= 20 OR mc >= 200 THEN
    RETURN QUERY SELECT false,dc,mc;
    RETURN;
  END IF;
  UPDATE public.hh_smart_trip_google_quota SET used=used+1,updated_at=now()
    WHERE (period_kind='day' AND period_start=d)
       OR (period_kind='month' AND period_start=m);
  RETURN QUERY SELECT true,dc+1,mc+1;
END;
$function$;

REVOKE ALL ON FUNCTION public.hh_smart_trip_google_reserve() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hh_smart_trip_google_reserve() TO service_role;
COMMENT ON FUNCTION public.hh_smart_trip_google_reserve() IS
 'Atomic Google Routes quota (20/day, 200/month) restricted to service_role by EXECUTE GRANT; supports sb_secret and legacy service-role API keys. Never refund ambiguous provider calls.';
