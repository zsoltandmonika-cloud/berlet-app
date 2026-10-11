-- HealthHub Golden Stars v397 · deployed 2026-10-11 to HealthHub-Core.
-- Feedback stores only response references and rating, never duplicate medical text.
-- Read/write require authenticated profile membership and the rater's own user ID.
create table if not exists public.hh_ask_lena_feedback (
  response_id uuid not null references public.hh_ask_lena_history(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_key text not null references public.hh_profiles(profile_key),
  stars smallint not null check (stars between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (response_id,user_id)
);
alter table public.hh_ask_lena_feedback enable row level security;
create index if not exists hh_ask_lena_feedback_profile_date_idx
  on public.hh_ask_lena_feedback (profile_key,rated_at desc);
create policy hh_lena_feedback_select on public.hh_ask_lena_feedback for select
  to authenticated using (
    user_id=(select auth.uid()) and exists (
      select 1 from public.hh_profile_access a
      where a.profile_key=hh_ask_lena_feedback.profile_key and a.user_id=(select auth.uid())
    )
  );
create policy hh_lena_feedback_insert on public.hh_ask_lena_feedback for insert
  to authenticated with check (
    user_id=(select auth.uid())
    and exists (select 1 from public.hh_profile_access a
      where a.profile_key=hh_ask_lena_feedback.profile_key and a.user_id=(select auth.uid()))
    and exists (select 1 from public.hh_ask_lena_history h
      where h.id=response_id and h.profile_key=hh_ask_lena_feedback.profile_key)
  );
create policy hh_lena_feedback_update on public.hh_ask_lena_feedback for update
  to authenticated
  using (
    user_id=(select auth.uid()) and exists (select 1 from public.hh_profile_access a
      where a.profile_key=hh_ask_lena_feedback.profile_key and a.user_id=(select auth.uid()))
  )
  with check (
    user_id=(select auth.uid())
    and exists (select 1 from public.hh_profile_access a
      where a.profile_key=hh_ask_lena_feedback.profile_key and a.user_id=(select auth.uid()))
    and exists (select 1 from public.hh_ask_lena_history h
      where h.id=response_id and h.profile_key=hh_ask_lena_feedback.profile_key)
  );
revoke all on public.hh_ask_lena_feedback from anon;
grant select,insert,update on public.hh_ask_lena_feedback to authenticated;
