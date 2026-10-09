-- Ask Léna v331: rate limiting for authenticated AI questions.
-- Only opaque user ID, selected profile and timestamp. Never persist questions or medical content.
create table if not exists public.hh_ask_lena_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null check (profile_key in ('zsolt','monika')),
  created_at timestamptz not null default now()
);
create index if not exists hh_ask_lena_usage_user_time on public.hh_ask_lena_usage (user_id,created_at desc);
alter table public.hh_ask_lena_usage enable row level security;
revoke all on public.hh_ask_lena_usage from anon, authenticated;
grant select,insert on public.hh_ask_lena_usage to service_role;
grant usage,select on sequence public.hh_ask_lena_usage_id_seq to service_role;
