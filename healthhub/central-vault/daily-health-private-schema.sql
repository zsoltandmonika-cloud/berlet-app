-- HealthHub Personal Daily Health Phase 1.
-- Run AFTER central-vault/schema.sql and after household/member/profile bootstrap.
-- This file is safe to keep public: it contains schema ONLY, never patient data.
-- Do not insert example diagnoses or medical records here.

CREATE TABLE IF NOT EXISTS public.healthhub_daily_health_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.healthhub_profiles(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{"items":{},"custom":[],"aiOptIn":false}'::jsonb,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT hh_daily_settings_is_object CHECK (jsonb_typeof(settings) = 'object'),
  CONSTRAINT hh_daily_settings_size CHECK (octet_length(settings::text) <= 20000)
);

-- Even if the default public schema grants are generous, anon can never read this.
ALTER TABLE public.healthhub_daily_health_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.healthhub_daily_health_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.healthhub_daily_health_settings TO authenticated;

DROP POLICY IF EXISTS hh_daily_settings_member_read ON public.healthhub_daily_health_settings;
CREATE POLICY hh_daily_settings_member_read
  ON public.healthhub_daily_health_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.healthhub_profiles p
      WHERE p.id = healthhub_daily_health_settings.profile_id
        AND public.healthhub_is_member(p.household_id)
    )
  );

-- Write operations are exclusively through an authenticated, version-checked RPC.
-- Expected revision 0 creates the first record. Stale writes are refused.
CREATE OR REPLACE FUNCTION public.healthhub_daily_health_save(
  p_household_slug text,
  p_profile_key text,
  p_settings jsonb,
  p_expected_revision bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
  v_revision bigint;
  v_new_revision bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_profile_key NOT IN ('zsolt', 'monika') THEN
    RAISE EXCEPTION 'Invalid profile';
  END IF;

  IF p_settings IS NULL
    OR jsonb_typeof(p_settings) <> 'object'
    OR octet_length(p_settings::text) > 20000
    OR jsonb_typeof(coalesce(p_settings->'items', '{}'::jsonb)) <> 'object'
    OR jsonb_typeof(coalesce(p_settings->'custom', '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(p_settings->'aiOptIn', 'false'::jsonb)) <> 'boolean'
  THEN
    RAISE EXCEPTION 'Invalid settings payload';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.healthhub_profiles p
  JOIN public.healthhub_households h ON h.id = p.household_id
  JOIN public.healthhub_household_members m ON m.household_id = h.id
  WHERE h.slug = p_household_slug
    AND p.profile_key = p_profile_key
    AND m.user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'HealthHub household access denied';
  END IF;

  -- Serialize first-time writes and changes to the same row.
  INSERT INTO public.healthhub_daily_health_settings(profile_id)
  VALUES (v_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  SELECT revision INTO v_revision
  FROM public.healthhub_daily_health_settings
  WHERE profile_id = v_profile_id
  FOR UPDATE;

  IF p_expected_revision IS NULL OR p_expected_revision <> v_revision THEN
    RETURN jsonb_build_object(
      'ok', false, 'conflict', true,
      'revision', v_revision
    );
  END IF;

  UPDATE public.healthhub_daily_health_settings
  SET settings = p_settings,
      revision = revision + 1,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE profile_id = v_profile_id
  RETURNING revision INTO v_new_revision;

  RETURN jsonb_build_object(
    'ok', true, 'conflict', false,
    'revision', v_new_revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.healthhub_daily_health_save(text,text,jsonb,bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.healthhub_daily_health_save(text,text,jsonb,bigint)
  TO authenticated;

-- Security check in Dashboard (without private row contents):
-- 1. Anonymous GET /rest/v1/healthhub_daily_health_settings must be forbidden.
-- 2. Authenticated, nonmember GET must return zero rows.
-- 3. A member may read the household's profile rows.
-- 4. A nonmember may NOT call healthhub_daily_health_save successfully.
-- 5. A stale revision must return conflict:true, not overwrite other devices.
-- 6. Confirm RLS enabled and no anonymous read grants.
