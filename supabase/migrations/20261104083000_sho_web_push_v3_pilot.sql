-- SHO Web Push v3 pilot (generic notification only). The Edge Function is the ONLY client.
-- No public or authenticated role can query device endpoints, encryption keys or VAPID private key.
create table if not exists public.sho_push_vapid_v3 (
  singleton smallint primary key default 1 check (singleton = 1),
  public_key text not null check(length(public_key) between 60 and 140),
  private_key text not null check(length(private_key) between 30 and 180),
  created_at timestamptz not null default now()
);
alter table public.sho_push_vapid_v3 enable row level security;
revoke all on public.sho_push_vapid_v3 from public, anon, authenticated;
grant select,insert,update,delete on public.sho_push_vapid_v3 to service_role;
-- Deliberately no RLS policies: only the server-side privileged role may access the keypair.

create table if not exists public.sho_push_devices_v3 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null check (profile_key in ('zsolt','monika')),
  endpoint text not null unique check(length(endpoint) between 60 and 1800),
  p256dh text not null check(length(p256dh) between 60 and 200),
  auth_secret text not null check(length(auth_secret) between 10 and 150),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_test_at timestamptz
);
create index if not exists sho_push_devices_user_profile_v3 on public.sho_push_devices_v3(user_id,profile_key) where enabled;
alter table public.sho_push_devices_v3 enable row level security;
revoke all on public.sho_push_devices_v3 from public, anon, authenticated;
grant select,insert,update,delete on public.sho_push_devices_v3 to service_role;
-- The Edge Function verifies an Auth user AND an hh_profile_access membership before every action.
comment on table public.sho_push_devices_v3 is 'SHO v3 opt-in pilot endpoints. Service role only, never exposed to authenticated/anon REST.';
comment on table public.sho_push_vapid_v3 is 'SHO v3 Web Push VAPID pair. Service role only; migrate private key to Vault for production hardening.';
