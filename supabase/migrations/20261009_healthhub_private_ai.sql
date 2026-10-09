-- HealthHub v321 · private daily AI reports (2026-10-09)
-- Run once in Supabase HealthHub-Core SQL Editor as database owner.
-- Consent is the existing per-profile JSONB setting aiDailyOptIn === true.
-- Never store AI API keys, JWTs or personal briefing text in GitHub.
begin;

create table if not exists public.hh_daily_health_ai_reports (
  profile_key text not null references public.hh_profiles(profile_key),
  report_date date not null,
  status text not null default 'generating'
    check (status in ('generating','ready','failed')),
  report jsonb,
  generated_at timestamptz,
  attempts smallint not null default 1 check (attempts between 1 and 2),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_key, report_date),
  constraint report_required_when_ready
    check (status <> 'ready' or (report is not null and jsonb_typeof(report)='object'))
);

alter table public.hh_daily_health_ai_reports enable row level security;

-- Signed-in family members may read ONLY completed reports for authorized profiles.
drop policy if exists hh_ai_reports_authorized_read on public.hh_daily_health_ai_reports;
create policy hh_ai_reports_authorized_read
  on public.hh_daily_health_ai_reports for select to authenticated
  using (
    status='ready' and exists(
      select 1 from public.hh_profile_access a
      where a.user_id=auth.uid()
        and a.profile_key=hh_daily_health_ai_reports.profile_key
    )
  );

revoke all on public.hh_daily_health_ai_reports from public, anon, authenticated;
grant select on public.hh_daily_health_ai_reports to authenticated;

-- No client INSERT, UPDATE or DELETE. Only the server-side service role may write.
commit;

-- Verify RLS, SELECT grants and policy before enabling the Edge Function.
select schemaname, tablename, rowsecurity
from pg_tables where schemaname='public' and tablename='hh_daily_health_ai_reports';
