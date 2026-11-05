-- SHO Smart Valet v12: selectable protection mode, preserving old v11 passwords.
-- Both modes retain client-side AES-GCM and private authenticated storage.
-- "device" uses a non-extractable Web Crypto key stored only in this browser.
alter table public.hh_valet_identity_cards_v11
  add column if not exists protection_mode text not null default 'password';
alter table public.hh_valet_identity_cards_v11
  drop constraint if exists hh_valet_identity_protection_mode_v12;
alter table public.hh_valet_identity_cards_v11
  add constraint hh_valet_identity_protection_mode_v12
  check (protection_mode in ('password','device'));
comment on column public.hh_valet_identity_cards_v11.protection_mode is
  'password: PBKDF2 passphrase; device: local-only IndexedDB nonextractable AES-GCM key; still encrypted, same private RLS';
