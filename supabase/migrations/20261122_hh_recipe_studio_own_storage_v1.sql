-- Léna Recept Stúdió: own HealthHub data and private artwork.
-- First applied live via Supabase migration "hh_recipe_studio_own_storage_v1", 2026-11-22.
-- This idempotent file is retained in GitHub as a reproducible source of truth.
create table if not exists public.hh_recipe_studio_recipes_v1 (
 id text primary key check(id ~ '^[A-Za-z0-9_-]{2,90}$'),
 household text not null default 'zsolt-monika' check(household='zsolt-monika'),
 title text not null check(length(title) between 1 and 300),
 category text not null default 'Egyéb' check(length(category) between 1 and 120),
 card_path text not null,
 hero_path text, process_path text,
 mime text not null default 'image/jpeg', original_name text,
 readable jsonb, studio_data jsonb,
 youtube_id text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create index if not exists hh_recipe_studio_updated_v1 on public.hh_recipe_studio_recipes_v1(updated_at desc);
alter table public.hh_recipe_studio_recipes_v1 enable row level security;
grant select,insert,update,delete on public.hh_recipe_studio_recipes_v1 to authenticated;
create table if not exists public.hh_recipe_studio_kv_v1 (
 key text primary key check(length(key) between 5 and 180),
 household text not null default 'zsolt-monika' check(household='zsolt-monika'),
 value jsonb not null check(octet_length(value::text)<=131072),
 updated_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
alter table public.hh_recipe_studio_kv_v1 enable row level security;
grant select,insert,update,delete on public.hh_recipe_studio_kv_v1 to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('hh-recipe-studio-v1','hh-recipe-studio-v1',false,26214400,array['image/jpeg','image/png','image/webp','application/pdf'])
 on conflict(id) do nothing;


do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_recipes_v1' and policyname='hh_recipes_read_family_v1') then
  execute 'create policy "hh_recipes_read_family_v1" on public.hh_recipe_studio_recipes_v1 for select to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_recipes_v1' and policyname='hh_recipes_insert_family_v1') then
  execute 'create policy "hh_recipes_insert_family_v1" on public.hh_recipe_studio_recipes_v1 for insert to authenticated with check (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')) and created_by=(select auth.uid()));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_recipes_v1' and policyname='hh_recipes_update_family_v1') then
  execute 'create policy "hh_recipes_update_family_v1" on public.hh_recipe_studio_recipes_v1 for update to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika''))) with check (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_recipes_v1' and policyname='hh_recipes_delete_family_v1') then
  execute 'create policy "hh_recipes_delete_family_v1" on public.hh_recipe_studio_recipes_v1 for delete to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_kv_v1' and policyname='hh_recipe_kv_read_family_v1') then
  execute 'create policy "hh_recipe_kv_read_family_v1" on public.hh_recipe_studio_kv_v1 for select to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_kv_v1' and policyname='hh_recipe_kv_insert_family_v1') then
  execute 'create policy "hh_recipe_kv_insert_family_v1" on public.hh_recipe_studio_kv_v1 for insert to authenticated with check (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')) and created_by=(select auth.uid()));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_kv_v1' and policyname='hh_recipe_kv_update_family_v1') then
  execute 'create policy "hh_recipe_kv_update_family_v1" on public.hh_recipe_studio_kv_v1 for update to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika''))) with check (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='hh_recipe_studio_kv_v1' and policyname='hh_recipe_kv_delete_family_v1') then
  execute 'create policy "hh_recipe_kv_delete_family_v1" on public.hh_recipe_studio_kv_v1 for delete to authenticated using (household=''zsolt-monika'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hh_recipe_assets_select_v1') then
  execute 'create policy "hh_recipe_assets_select_v1" on storage.objects for select to authenticated using (bucket_id=''hh-recipe-studio-v1'' and name ~ ''^zsolt-monika/[A-Za-z0-9_-]{2,90}/(card|hero|process)\.(jpg|png|webp|pdf)$'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hh_recipe_assets_insert_v1') then
  execute 'create policy "hh_recipe_assets_insert_v1" on storage.objects for insert to authenticated with check (bucket_id=''hh-recipe-studio-v1'' and name ~ ''^zsolt-monika/[A-Za-z0-9_-]{2,90}/(card|hero|process)\.(jpg|png|webp|pdf)$'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hh_recipe_assets_update_v1') then
  execute 'create policy "hh_recipe_assets_update_v1" on storage.objects for update to authenticated using (bucket_id=''hh-recipe-studio-v1'' and name ~ ''^zsolt-monika/[A-Za-z0-9_-]{2,90}/(card|hero|process)\.(jpg|png|webp|pdf)$'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika''))) with check (bucket_id=''hh-recipe-studio-v1'' and name ~ ''^zsolt-monika/[A-Za-z0-9_-]{2,90}/(card|hero|process)\.(jpg|png|webp|pdf)$'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;

do $policy$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hh_recipe_assets_delete_v1') then
  execute 'create policy "hh_recipe_assets_delete_v1" on storage.objects for delete to authenticated using (bucket_id=''hh-recipe-studio-v1'' and name ~ ''^zsolt-monika/[A-Za-z0-9_-]{2,90}/(card|hero|process)\.(jpg|png|webp|pdf)$'' and exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in (''zsolt'',''monika'')));';
 end if;
end
$policy$;
