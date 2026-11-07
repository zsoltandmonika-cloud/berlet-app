-- Smart Trip V5 Google Routes hard quota, not deployed by this file alone.
-- Globally shared quotas across all profiles and all server instances.
CREATE TABLE IF NOT EXISTS public.hh_smart_trip_google_quota (
  period_kind text NOT NULL CHECK (period_kind IN ('day','month')),
  period_start date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (period_kind, period_start)
);
ALTER TABLE public.hh_smart_trip_google_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hh_smart_trip_google_quota FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hh_smart_trip_google_quota TO service_role;

-- Only service_role may reserve; SECURITY DEFINER is needed to atomically
-- mutate locked-down counters; explicit fixed search_path + grants.
CREATE OR REPLACE FUNCTION public.hh_smart_trip_google_reserve()
RETURNS TABLE(allowed boolean, daily_used integer, monthly_used integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  d date := (now() AT TIME ZONE 'UTC')::date;
  m date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  dc integer;
  mc integer;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND session_user <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_only' USING ERRCODE = '42501';
  END IF;
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
$$;
REVOKE ALL ON FUNCTION public.hh_smart_trip_google_reserve() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hh_smart_trip_google_reserve() TO service_role;
COMMENT ON FUNCTION public.hh_smart_trip_google_reserve() IS
 'Atomic global max 20 UTC daily / 200 UTC monthly reservations, fail closed. Consumption counted even for failed provider calls; never refund uncertain external requests.';
