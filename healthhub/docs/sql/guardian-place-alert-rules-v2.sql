-- Smart Buddy Place Alerts v2. Additive, no location tracker or existing-data mutation.
create table if not exists public.hh_guardian_place_alert_rules_v2 (
  slot_index smallint not null check (slot_index between 0 and 39),
  profile_key text not null check (profile_key in ('zsolt','monika')),
  place_lat double precision not null check (place_lat between -90 and 90),
  place_lng double precision not null check (place_lng between -180 and 180),
  arrival_enabled boolean not null default false,
  departure_enabled boolean not null default false,
  radius_m smallint not null default 150 check (radius_m in (100,150,200,300)),
  arrival_sound text not null default 'chime' check (arrival_sound in ('chime','bell','digital','silent')),
  departure_sound text not null default 'bell' check (departure_sound in ('chime','bell','digital','silent')),
  updated_at timestamptz not null default now(),
  primary key (slot_index,profile_key)
);
alter table public.hh_guardian_place_alert_rules_v2 enable row level security;
create policy "buddy_place_rules_read_v2" on public.hh_guardian_place_alert_rules_v2 for select to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=hh_guardian_place_alert_rules_v2.profile_key));
create policy "buddy_place_rules_insert_v2" on public.hh_guardian_place_alert_rules_v2 for insert to authenticated
 with check (exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=hh_guardian_place_alert_rules_v2.profile_key));
create policy "buddy_place_rules_update_v2" on public.hh_guardian_place_alert_rules_v2 for update to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=hh_guardian_place_alert_rules_v2.profile_key))
 with check (exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=hh_guardian_place_alert_rules_v2.profile_key));
create policy "buddy_place_rules_delete_v2" on public.hh_guardian_place_alert_rules_v2 for delete to authenticated
 using (exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=hh_guardian_place_alert_rules_v2.profile_key));
grant select,insert,update,delete on public.hh_guardian_place_alert_rules_v2 to authenticated;
