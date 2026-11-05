-- SHO Smart Valet v11 ID: separate, encrypted identity-image originals.
-- AES-GCM ciphertext only in Storage, client-held passphrase is NEVER uploaded.
-- Existing ticket / coupon / loyalty buckets and tables remain untouched.
create table if not exists public.hh_valet_identity_cards_v11 (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid(),
 profile_key text not null check (profile_key in ('zsolt','monika')),
 doc_type text not null check (doc_type in ('license','personal','taj','tax')),
 kdf_salt text not null check (kdf_salt ~ '^[A-Za-z0-9+/]{22}==$'),
 front_storage_path text not null unique,
 back_storage_path text not null unique,
 front_saved_at timestamptz,
 back_saved_at timestamptz,
 created_at timestamptz not null default now(),
 constraint hh_valet_identity_path_v11 check (
   front_storage_path = profile_key || '/' || doc_type || '/' || id::text || '/front.enc'
   and back_storage_path = profile_key || '/' || doc_type || '/' || id::text || '/back.enc'
 ),
 constraint hh_valet_identity_unique_v11 unique(created_by,profile_key,doc_type)
);

alter table public.hh_valet_identity_cards_v11 enable row level security;

create policy hh_valet_id_v11_read_self on public.hh_valet_identity_cards_v11
 for select to authenticated
 using (
  created_by=(select auth.uid())
  and exists (select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_identity_cards_v11.profile_key)
 );
create policy hh_valet_id_v11_insert_self on public.hh_valet_identity_cards_v11
 for insert to authenticated
 with check (
  created_by=(select auth.uid())
  and exists (select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_identity_cards_v11.profile_key)
 );
create policy hh_valet_id_v11_update_self on public.hh_valet_identity_cards_v11
 for update to authenticated
 using (
  created_by=(select auth.uid())
  and exists (select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_identity_cards_v11.profile_key)
 )
 with check (
  created_by=(select auth.uid())
  and exists (select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_identity_cards_v11.profile_key)
 );
create policy hh_valet_id_v11_delete_self on public.hh_valet_identity_cards_v11
 for delete to authenticated
 using (
  created_by=(select auth.uid())
  and exists (select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid()) and a.profile_key=hh_valet_identity_cards_v11.profile_key)
 );

revoke all on public.hh_valet_identity_cards_v11 from public, anon, authenticated;
grant select, insert, delete on public.hh_valet_identity_cards_v11 to authenticated;
grant update(front_saved_at,back_saved_at) on public.hh_valet_identity_cards_v11 to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('hh-smart-valet-id-encrypted-v11','hh-smart-valet-id-encrypted-v11',
         false,8000000,array['application/octet-stream'])
 on conflict (id) do nothing;

-- Never grant bucket-wide or general authenticated Storage access.
-- Every object operation checks exact metadata, owner and profile ACL via table RLS.
create policy hh_valet_id_obj_v11_read on storage.objects for select to authenticated
 using (
  bucket_id='hh-smart-valet-id-encrypted-v11'
  and exists (
   select 1 from public.hh_valet_identity_cards_v11 v
    where (v.front_storage_path=objects.name or v.back_storage_path=objects.name)
      and v.created_by=(select auth.uid())
  )
 );
create policy hh_valet_id_obj_v11_insert on storage.objects for insert to authenticated
 with check (
  bucket_id='hh-smart-valet-id-encrypted-v11'
  and exists (
   select 1 from public.hh_valet_identity_cards_v11 v
    where (v.front_storage_path=objects.name or v.back_storage_path=objects.name)
      and v.created_by=(select auth.uid())
  )
 );
create policy hh_valet_id_obj_v11_delete on storage.objects for delete to authenticated
 using (
  bucket_id='hh-smart-valet-id-encrypted-v11'
  and exists (
   select 1 from public.hh_valet_identity_cards_v11 v
    where (v.front_storage_path=objects.name or v.back_storage_path=objects.name)
      and v.created_by=(select auth.uid())
  )
 );
