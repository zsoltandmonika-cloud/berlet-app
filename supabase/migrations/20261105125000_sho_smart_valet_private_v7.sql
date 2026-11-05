-- SHO Smart Valet Phase 2 · original private ticket/document uploads, 2026-11-05
-- No service-role browser access. No public files. Owner AND household profile ACL.
-- No bank cards, passports, IDs, licence or medical records in this first phase.

create table if not exists public.hh_valet_items (
 id uuid primary key default gen_random_uuid(),
 profile_key text not null check (profile_key in ('zsolt','monika')),
 created_by uuid not null default auth.uid(),
 category text not null check (category in ('ticket','pass','document')),
 title text not null check (char_length(title) between 1 and 160),
 file_name text not null check (char_length(file_name) between 1 and 180),
 file_ext text not null check (file_ext in ('pdf','jpg','jpeg','png','webp')),
 mime_type text not null,
 byte_size integer not null check (byte_size between 1 and 15000000),
 sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
 storage_path text not null unique,
 uploaded_at timestamptz,
 created_at timestamptz not null default now(),
 constraint hh_valet_type_consistent check (
  (file_ext='pdf' and mime_type='application/pdf') or
  (file_ext='jpg' and mime_type='image/jpeg') or
  (file_ext='png' and mime_type='image/png') or
  (file_ext='webp' and mime_type='image/webp')
 ),
 constraint hh_valet_path_scoped check (
  storage_path = profile_key || '/' || id::text || '/original.' || file_ext
 ),
 constraint hh_valet_digest_unique unique(created_by,profile_key,sha256)
);

create index if not exists hh_valet_owner_profile_latest
 on public.hh_valet_items(created_by,profile_key,created_at desc);

alter table public.hh_valet_items enable row level security;

-- Existing household grants in hh_profile_access are the source of truth.
create policy hh_valet_select_self on public.hh_valet_items for select to authenticated
 using (
  created_by=(select auth.uid()) and exists(
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_items.profile_key
  )
 );
create policy hh_valet_insert_self on public.hh_valet_items for insert to authenticated
 with check (
  created_by=(select auth.uid()) and exists(
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_items.profile_key
  )
 );
create policy hh_valet_update_uploaded_at_self on public.hh_valet_items for update to authenticated
 using (
  created_by=(select auth.uid()) and exists(
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_items.profile_key
  )
 )
 with check (
  created_by=(select auth.uid()) and exists(
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_items.profile_key
  )
 );
create policy hh_valet_delete_self on public.hh_valet_items for delete to authenticated
 using (
  created_by=(select auth.uid()) and exists(
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_items.profile_key
  )
 );

revoke all on public.hh_valet_items from public,anon;
grant select,insert,delete on public.hh_valet_items to authenticated;
grant update(uploaded_at) on public.hh_valet_items to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('hh-smart-valet-private','hh-smart-valet-private',false,15000000,
  array['application/pdf','image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;

-- Storage paths are bound to an existing metadata row. The owner and profile
-- must match the same authenticated person; no broad authenticated policy.
create policy hh_valet_storage_read_self on storage.objects for select to authenticated
 using (
  bucket_id='hh-smart-valet-private' and exists (
   select 1 from public.hh_valet_items v
   where v.storage_path=objects.name and v.created_by=(select auth.uid())
    and v.profile_key=split_part(objects.name,'/',1)
  )
 );
create policy hh_valet_storage_insert_self on storage.objects for insert to authenticated
 with check (
  bucket_id='hh-smart-valet-private' and exists (
   select 1 from public.hh_valet_items v
   where v.storage_path=objects.name and v.created_by=(select auth.uid())
    and v.profile_key=split_part(objects.name,'/',1)
  )
 );
create policy hh_valet_storage_delete_self on storage.objects for delete to authenticated
 using (
  bucket_id='hh-smart-valet-private' and exists (
   select 1 from public.hh_valet_items v
   where v.storage_path=objects.name and v.created_by=(select auth.uid())
    and v.profile_key=split_part(objects.name,'/',1)
  )
 );
