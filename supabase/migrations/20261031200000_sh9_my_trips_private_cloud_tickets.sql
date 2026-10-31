-- SH9 My Trips v1086 · ticket and attachment sync, private by design.
-- Uses existing hh_profiles and hh_profile_access household authorization.
-- No public URLs, anon writes, or service keys in browser.
create table if not exists public.hh_my_trip_packs (
  profile_key text not null references public.hh_profiles(profile_key),
  trip_id text not null check (trip_id ~ '^tp-[a-zA-Z0-9-]{1,67}$'),
  trip_data jsonb not null check (jsonb_typeof(trip_data)='object'),
  updated_at timestamptz not null default now(),
  primary key (profile_key,trip_id)
);
alter table public.hh_my_trip_packs enable row level security;
grant select,insert,update,delete on public.hh_my_trip_packs to authenticated;

create policy hh_my_trips_read on public.hh_my_trip_packs for select to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_packs.profile_key and a.user_id=(select auth.uid())));
create policy hh_my_trips_insert on public.hh_my_trip_packs for insert to authenticated
 with check (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_packs.profile_key and a.user_id=(select auth.uid())));
create policy hh_my_trips_update on public.hh_my_trip_packs for update to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_packs.profile_key and a.user_id=(select auth.uid())))
 with check (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_packs.profile_key and a.user_id=(select auth.uid())));
create policy hh_my_trips_delete on public.hh_my_trip_packs for delete to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_packs.profile_key and a.user_id=(select auth.uid())));

create table if not exists public.hh_my_trip_attachments (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  trip_id text not null,
  file_name text not null check (char_length(file_name) between 1 and 140),
  file_type text not null check (file_type in ('application/pdf','image/png','image/jpeg','image/webp','image/heic','image/heif')),
  bytes integer not null check (bytes between 1 and 15000000),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  foreign key(profile_key,trip_id) references public.hh_my_trip_packs(profile_key,trip_id) on delete cascade,
  check(storage_path like profile_key || '/' || trip_id || '/%')
);
create index if not exists hh_my_trip_attachments_trip on public.hh_my_trip_attachments(profile_key,trip_id,created_at);
alter table public.hh_my_trip_attachments enable row level security;
grant select,insert,delete on public.hh_my_trip_attachments to authenticated;

create policy hh_my_trip_files_read on public.hh_my_trip_attachments for select to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_attachments.profile_key and a.user_id=(select auth.uid())));
create policy hh_my_trip_files_insert on public.hh_my_trip_attachments for insert to authenticated
 with check (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_attachments.profile_key and a.user_id=(select auth.uid())));
create policy hh_my_trip_files_delete on public.hh_my_trip_attachments for delete to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.profile_key=hh_my_trip_attachments.profile_key and a.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('hh-my-trip-tickets','hh-my-trip-tickets',false,15000000,
 array['application/pdf','image/png','image/jpeg','image/webp','image/heic','image/heif'])
 on conflict(id) do nothing;

-- Metadata is committed before uploading a file to the private bucket.
-- Permission to retrieve an object derives from both real login AND an existing metadata row.
create policy hh_trip_ticket_storage_select on storage.objects for select to authenticated
 using (bucket_id='hh-my-trip-tickets' and exists(
 select 1 from public.hh_my_trip_attachments a
 join public.hh_profile_access p on p.profile_key=a.profile_key
 where a.storage_path=storage.objects.name and p.user_id=(select auth.uid())
 ));
create policy hh_trip_ticket_storage_insert on storage.objects for insert to authenticated
 with check (bucket_id='hh-my-trip-tickets' and exists(
 select 1 from public.hh_my_trip_attachments a
 join public.hh_profile_access p on p.profile_key=a.profile_key
 where a.storage_path=storage.objects.name and p.user_id=(select auth.uid())
 ));
create policy hh_trip_ticket_storage_delete on storage.objects for delete to authenticated
 using (bucket_id='hh-my-trip-tickets' and exists(
 select 1 from public.hh_my_trip_attachments a
 join public.hh_profile_access p on p.profile_key=a.profile_key
 where a.storage_path=storage.objects.name and p.user_id=(select auth.uid())
 ));
