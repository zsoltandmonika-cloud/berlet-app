-- SHO Smart Valet v15 · additive, idempotent secure-card schema.
-- Health photos: browser-side AES-GCM ciphertext only. Bank: issuer + last four only.
create table if not exists public.hh_valet_extra_cards_v15 (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid(),
 profile_key text not null check (profile_key in ('zsolt','monika')),
 category text not null check (category in ('health','bank')),
 title text not null check (char_length(title) between 1 and 120),
 issuer text check (issuer is null or char_length(issuer) between 1 and 100),
 last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
 front_cipher text,
 back_cipher text,
 kdf_salt text,
 created_at timestamptz not null default now(),
 constraint hh_valet_extra_v15_card_shape check (
  (category='bank' and front_cipher is null and back_cipher is null and kdf_salt is null)
  or (category='health' and issuer is null and last_four is null
   and front_cipher is not null and kdf_salt ~ '^[A-Za-z0-9+/]{22}==$')
 ),
 constraint hh_valet_extra_v15_cipher_limit check (
  (front_cipher is null or octet_length(front_cipher) between 45 and 2000000)
  and (back_cipher is null or octet_length(back_cipher) between 45 and 2000000))
);
alter table public.hh_valet_extra_cards_v15 enable row level security;
revoke all on public.hh_valet_extra_cards_v15 from public,anon,authenticated;
grant select,insert,delete on public.hh_valet_extra_cards_v15 to authenticated;
create index if not exists hh_valet_extra_v15_owner_profile_idx
 on public.hh_valet_extra_cards_v15(created_by,profile_key,created_at desc);
drop policy if exists hh_valet_extra_v15_read on public.hh_valet_extra_cards_v15;
create policy hh_valet_extra_v15_read on public.hh_valet_extra_cards_v15
 for select to authenticated using (
  created_by=(select auth.uid()) and exists (
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid())
    and a.profile_key=hh_valet_extra_cards_v15.profile_key));
drop policy if exists hh_valet_extra_v15_insert on public.hh_valet_extra_cards_v15;
create policy hh_valet_extra_v15_insert on public.hh_valet_extra_cards_v15
 for insert to authenticated with check (
  created_by=(select auth.uid()) and exists (
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid())
    and a.profile_key=hh_valet_extra_cards_v15.profile_key));
drop policy if exists hh_valet_extra_v15_delete on public.hh_valet_extra_cards_v15;
create policy hh_valet_extra_v15_delete on public.hh_valet_extra_cards_v15
 for delete to authenticated using (
  created_by=(select auth.uid()) and exists (
   select 1 from public.hh_profile_access a
   where a.user_id=(select auth.uid())
    and a.profile_key=hh_valet_extra_cards_v15.profile_key));
