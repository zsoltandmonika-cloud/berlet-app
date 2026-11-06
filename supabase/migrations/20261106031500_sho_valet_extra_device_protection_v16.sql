-- Smart Valet v16 · optional password/device-bound AES for health and bank scans.
-- Existing password records remain readable. Device keys are non-extractable and local-only.
alter table public.hh_valet_extra_cards_v15
 add column if not exists protection_mode text not null default 'password';
alter table public.hh_valet_extra_cards_v15
 add constraint hh_valet_extra_v16_protection_mode check (
   protection_mode in ('password','device')
 );
