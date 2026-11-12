-- HealthHub Smart Lunch v1179 · private delegated Outlook → confirmed Interfood meals.
-- Personal message bodies, tokens and delivery details are NEVER stored in GitHub.
create table if not exists public.hh_interfood_graph_oauth_pending_v1 (
 state_hash text primary key check (length(state_hash)=64),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create table if not exists public.hh_interfood_graph_connections_v1 (
 owner_user_id uuid primary key references auth.users(id) on delete cascade,
 account_email text not null unique,
 folder_id text not null,
 refresh_nonce text not null,
 refresh_ciphertext text not null,
 granted_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_sync_at timestamptz,
 last_error_code text
);
create table if not exists public.hh_interfood_confirmed_orders_v1 (
 id text primary key check (length(id)=64),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 profile_key text not null default 'monika' check (profile_key='monika'),
 menu_date date not null,
 code text not null check (code ~ '^[A-Z0-9]{1,8}$'),
 name text not null check (length(name) between 2 and 100),
 quantity integer not null check (quantity between 1 and 10),
 nutrients jsonb not null check (jsonb_typeof(nutrients)='object'),
 weight_grams numeric(9,2),
 image_url text,
 source_hash text not null check (length(source_hash)=64),
 updated_at timestamptz not null default now(),
 unique(owner_user_id,menu_date,code,name)
);
create index if not exists hh_if_orders_profile_day_v1
 on public.hh_interfood_confirmed_orders_v1(profile_key,menu_date desc);
create table if not exists public.hh_interfood_bridge_config_v1 (
 name text primary key check (name='cron_v1'),
 secret_sha256 text not null check (length(secret_sha256)=64),
 created_at timestamptz not null default now()
);
alter table public.hh_interfood_graph_oauth_pending_v1 enable row level security;
alter table public.hh_interfood_graph_connections_v1 enable row level security;
alter table public.hh_interfood_confirmed_orders_v1 enable row level security;
alter table public.hh_interfood_bridge_config_v1 enable row level security;
-- Default deny for direct Data API: all reads & writes through the server-side
-- function with validated JWT membership or verified cron authorization only.
revoke all on public.hh_interfood_graph_oauth_pending_v1 from anon,authenticated;
revoke all on public.hh_interfood_graph_connections_v1 from anon,authenticated;
revoke all on public.hh_interfood_confirmed_orders_v1 from anon,authenticated;
revoke all on public.hh_interfood_bridge_config_v1 from anon,authenticated;
grant all on public.hh_interfood_graph_oauth_pending_v1 to service_role;
grant all on public.hh_interfood_graph_connections_v1 to service_role;
grant all on public.hh_interfood_confirmed_orders_v1 to service_role;
grant all on public.hh_interfood_bridge_config_v1 to service_role;
comment on table public.hh_interfood_graph_connections_v1 is 'Server-only AES-GCM Microsoft Graph refresh tokens; no browser tokens.';
comment on table public.hh_interfood_confirmed_orders_v1 is 'Only food code/day/servings/macros/official art. No raw Outlook emails or delivery details.';
