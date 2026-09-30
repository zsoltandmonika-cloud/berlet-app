-- HealthHub Central Health Vault v1
-- Supabase/Postgres schema for one household with Zsolt + Monika profiles.
-- No health data is stored in the public GitHub repository.

create extension if not exists pgcrypto;

create table if not exists public.healthhub_households (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.healthhub_household_members (
  household_id uuid not null references public.healthhub_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.healthhub_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.healthhub_households(id) on delete cascade,
  profile_key text not null check (profile_key in ('zsolt','monika')),
  display_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, profile_key)
);

create table if not exists public.healthhub_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.healthhub_households(id) on delete cascade,
  profile_id uuid not null references public.healthhub_profiles(id) on delete cascade,
  item_key text not null,
  item_type text not null check (
    item_type in (
      'record',
      'medication',
      'measurement',
      'device',
      'appointment',
      'reference_document',
      'cardiac_metric'
    )
  ),
  event_date date,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, item_type, item_key)
);

create index if not exists healthhub_items_profile_type_idx
  on public.healthhub_items(profile_id, item_type);

create index if not exists healthhub_items_profile_date_idx
  on public.healthhub_items(profile_id, event_date desc);

create table if not exists public.healthhub_vault_meta (
  household_id uuid primary key references public.healthhub_households(id) on delete cascade,
  schema_version text not null default '2.0',
  migration_status text not null default 'empty',
  source_name text,
  imported_at timestamptz,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function public.healthhub_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists healthhub_profiles_touch on public.healthhub_profiles;
create trigger healthhub_profiles_touch
before update on public.healthhub_profiles
for each row execute function public.healthhub_touch_updated_at();

drop trigger if exists healthhub_items_touch on public.healthhub_items;
create trigger healthhub_items_touch
before update on public.healthhub_items
for each row execute function public.healthhub_touch_updated_at();

drop trigger if exists healthhub_vault_meta_touch on public.healthhub_vault_meta;
create trigger healthhub_vault_meta_touch
before update on public.healthhub_vault_meta
for each row execute function public.healthhub_touch_updated_at();

create or replace function public.healthhub_is_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.healthhub_household_members m
    where m.household_id = target_household
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.healthhub_is_member(uuid) from public;
grant execute on function public.healthhub_is_member(uuid) to authenticated;

alter table public.healthhub_households enable row level security;
alter table public.healthhub_household_members enable row level security;
alter table public.healthhub_profiles enable row level security;
alter table public.healthhub_items enable row level security;
alter table public.healthhub_vault_meta enable row level security;

revoke all on table public.healthhub_households from anon, authenticated;
revoke all on table public.healthhub_household_members from anon, authenticated;
revoke all on table public.healthhub_profiles from anon, authenticated;
revoke all on table public.healthhub_items from anon, authenticated;
revoke all on table public.healthhub_vault_meta from anon, authenticated;

grant select on table public.healthhub_households to authenticated;
grant select on table public.healthhub_household_members to authenticated;
grant select on table public.healthhub_profiles to authenticated;
grant select, insert, update, delete on table public.healthhub_items to authenticated;
grant select, update on table public.healthhub_vault_meta to authenticated;

drop policy if exists healthhub_households_select on public.healthhub_households;
create policy healthhub_households_select
on public.healthhub_households for select
to authenticated
using (public.healthhub_is_member(id));

drop policy if exists healthhub_members_select on public.healthhub_household_members;
create policy healthhub_members_select
on public.healthhub_household_members for select
to authenticated
using (public.healthhub_is_member(household_id));

drop policy if exists healthhub_profiles_select on public.healthhub_profiles;
create policy healthhub_profiles_select
on public.healthhub_profiles for select
to authenticated
using (public.healthhub_is_member(household_id));

drop policy if exists healthhub_items_select on public.healthhub_items;
create policy healthhub_items_select
on public.healthhub_items for select
to authenticated
using (public.healthhub_is_member(household_id));

drop policy if exists healthhub_items_insert on public.healthhub_items;
create policy healthhub_items_insert
on public.healthhub_items for insert
to authenticated
with check (public.healthhub_is_member(household_id));

drop policy if exists healthhub_items_update on public.healthhub_items;
create policy healthhub_items_update
on public.healthhub_items for update
to authenticated
using (public.healthhub_is_member(household_id))
with check (public.healthhub_is_member(household_id));

drop policy if exists healthhub_items_delete on public.healthhub_items;
create policy healthhub_items_delete
on public.healthhub_items for delete
to authenticated
using (public.healthhub_is_member(household_id));

drop policy if exists healthhub_meta_select on public.healthhub_vault_meta;
create policy healthhub_meta_select
on public.healthhub_vault_meta for select
to authenticated
using (public.healthhub_is_member(household_id));

drop policy if exists healthhub_meta_update on public.healthhub_vault_meta;
create policy healthhub_meta_update
on public.healthhub_vault_meta for update
to authenticated
using (public.healthhub_is_member(household_id))
with check (public.healthhub_is_member(household_id));

create or replace function public.healthhub_profile_payload(target_profile uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'displayName', p.display_name,
      'records', coalesce((
        select jsonb_agg(i.payload order by i.event_date desc nulls last, i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'record'
      ), '[]'::jsonb),
      'medications', coalesce((
        select jsonb_agg(i.payload order by i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'medication'
      ), '[]'::jsonb),
      'measurements', coalesce((
        select jsonb_agg(i.payload order by i.event_date desc nulls last, i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'measurement'
      ), '[]'::jsonb),
      'devices', coalesce((
        select jsonb_agg(i.payload order by i.event_date desc nulls last, i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'device'
      ), '[]'::jsonb),
      'appointments', coalesce((
        select jsonb_agg(i.payload order by i.event_date asc nulls last, i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'appointment'
      ), '[]'::jsonb),
      'referenceDocuments', coalesce((
        select jsonb_agg(i.payload order by i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'reference_document'
      ), '[]'::jsonb),
      'cardiacMetrics', coalesce((
        select jsonb_agg(i.payload order by i.event_date asc nulls last, i.item_key)
        from public.healthhub_items i
        where i.profile_id = p.id and i.item_type = 'cardiac_metric'
      ), '[]'::jsonb)
    )
  from public.healthhub_profiles p
  where p.id = target_profile;
$$;

revoke all on function public.healthhub_profile_payload(uuid) from public, anon, authenticated;

create or replace function public.healthhub_get_bundle(p_household_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h public.healthhub_households%rowtype;
  z_id uuid;
  m_id uuid;
  meta public.healthhub_vault_meta%rowtype;
begin
  select hh.*
  into h
  from public.healthhub_households hh
  join public.healthhub_household_members hm on hm.household_id = hh.id
  where hh.slug = p_household_slug
    and hm.user_id = auth.uid();

  if h.id is null then
    raise exception 'HealthHub household access denied';
  end if;

  select id into z_id
  from public.healthhub_profiles
  where household_id = h.id and profile_key = 'zsolt';

  select id into m_id
  from public.healthhub_profiles
  where household_id = h.id and profile_key = 'monika';

  select * into meta
  from public.healthhub_vault_meta
  where household_id = h.id;

  return jsonb_build_object(
    'schemaVersion', coalesce(meta.schema_version, '2.0'),
    'createdAt', now(),
    'household', jsonb_build_object(
      'slug', h.slug,
      'displayName', h.display_name,
      'migrationStatus', coalesce(meta.migration_status, 'empty'),
      'version', coalesce(meta.version, 1),
      'importedAt', meta.imported_at
    ),
    'profiles', jsonb_build_object(
      'zsolt', public.healthhub_profile_payload(z_id),
      'monika', public.healthhub_profile_payload(m_id)
    )
  );
end;
$$;

revoke all on function public.healthhub_get_bundle(text) from public, anon;
grant execute on function public.healthhub_get_bundle(text) to authenticated;

create or replace function public.healthhub_insert_item(
  p_household_id uuid,
  p_profile_id uuid,
  p_item_type text,
  p_item jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  raw_date text;
  d date;
begin
  k := coalesce(
    nullif(p_item->>'id',''),
    encode(digest(convert_to(p_item::text, 'UTF8'), 'sha256'), 'hex')
  );

  raw_date := coalesce(p_item->>'date', p_item->>'implantedAt');
  if raw_date ~ '^\d{4}-\d{2}-\d{2}$' then
    d := raw_date::date;
  else
    d := null;
  end if;

  insert into public.healthhub_items(
    household_id, profile_id, item_key, item_type, event_date, payload
  )
  values (
    p_household_id, p_profile_id, k, p_item_type, d, p_item
  )
  on conflict (profile_id, item_type, item_key)
  do update set
    event_date = excluded.event_date,
    payload = excluded.payload,
    updated_at = now();
end;
$$;

revoke all on function public.healthhub_insert_item(uuid,uuid,text,jsonb) from public, anon, authenticated;

create or replace function public.healthhub_import_bundle(
  p_household_slug text,
  p_bundle jsonb,
  p_source_name text default 'HealthHub central migration'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  h_id uuid;
  p_key text;
  p_data jsonb;
  p_id uuid;
  item jsonb;
  z_count integer := 0;
  m_count integer := 0;
begin
  select hh.id
  into h_id
  from public.healthhub_households hh
  join public.healthhub_household_members hm on hm.household_id = hh.id
  where hh.slug = p_household_slug
    and hm.user_id = auth.uid();

  if h_id is null then
    raise exception 'HealthHub household access denied';
  end if;

  if p_bundle->'profiles'->'zsolt' is null
     or p_bundle->'profiles'->'monika' is null then
    raise exception 'Invalid HealthHub bundle: both profiles are required';
  end if;

  foreach p_key in array array['zsolt','monika']
  loop
    p_data := p_bundle->'profiles'->p_key;

    insert into public.healthhub_profiles(household_id, profile_key, display_name, metadata)
    values (
      h_id,
      p_key,
      coalesce(p_data->>'displayName', initcap(p_key)),
      p_data
        - 'displayName'
        - 'records'
        - 'medications'
        - 'measurements'
        - 'devices'
        - 'appointments'
        - 'referenceDocuments'
        - 'cardiacMetrics'
    )
    on conflict (household_id, profile_key)
    do update set
      display_name = excluded.display_name,
      metadata = excluded.metadata,
      updated_at = now()
    returning id into p_id;

    delete from public.healthhub_items where profile_id = p_id;

    for item in select value from jsonb_array_elements(coalesce(p_data->'records','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'record',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'medications','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'medication',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'measurements','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'measurement',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'devices','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'device',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'appointments','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'appointment',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'referenceDocuments','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'reference_document',item); end loop;

    for item in select value from jsonb_array_elements(coalesce(p_data->'cardiacMetrics','[]'::jsonb))
    loop perform public.healthhub_insert_item(h_id,p_id,'cardiac_metric',item); end loop;

    if p_key = 'zsolt' then
      select count(*) into z_count from public.healthhub_items where profile_id = p_id;
    else
      select count(*) into m_count from public.healthhub_items where profile_id = p_id;
    end if;
  end loop;

  insert into public.healthhub_vault_meta(
    household_id, schema_version, migration_status, source_name, imported_at, version
  )
  values (
    h_id,
    '2.0',
    'central_migrated',
    p_source_name,
    now(),
    1
  )
  on conflict (household_id)
  do update set
    schema_version = '2.0',
    migration_status = 'central_migrated',
    source_name = excluded.source_name,
    imported_at = excluded.imported_at,
    version = public.healthhub_vault_meta.version + 1,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'zsoltItems', z_count,
    'monikaItems', m_count,
    'importedAt', now()
  );
end;
$$;

revoke all on function public.healthhub_import_bundle(text,jsonb,text) from public, anon;
grant execute on function public.healthhub_import_bundle(text,jsonb,text) to authenticated;

-- One-time bootstrap template:
-- 1) Sign in once through Supabase Auth.
-- 2) Copy that user's UUID from Authentication -> Users.
-- 3) Replace YOUR_AUTH_USER_UUID below and run these statements once.
--
-- insert into public.healthhub_households(slug,display_name)
-- values ('zsolt-monika','Zsolt és Mónika')
-- on conflict (slug) do nothing;
--
-- insert into public.healthhub_household_members(household_id,user_id,role)
-- select id,'YOUR_AUTH_USER_UUID'::uuid,'owner'
-- from public.healthhub_households where slug='zsolt-monika'
-- on conflict do nothing;
--
-- insert into public.healthhub_profiles(household_id,profile_key,display_name)
-- select id,'zsolt','Zsolt' from public.healthhub_households where slug='zsolt-monika'
-- on conflict (household_id,profile_key) do nothing;
--
-- insert into public.healthhub_profiles(household_id,profile_key,display_name)
-- select id,'monika','Mónika' from public.healthhub_households where slug='zsolt-monika'
-- on conflict (household_id,profile_key) do nothing;
--
-- insert into public.healthhub_vault_meta(household_id)
-- select id from public.healthhub_households where slug='zsolt-monika'
-- on conflict (household_id) do nothing;
