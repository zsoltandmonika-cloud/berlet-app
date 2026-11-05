-- Smart Valet v16 · Same encrypted photo workflow for health and privacy-masked bank cards.
-- Masking is performed locally in the optical editor before passing pixels to the encrypted vault.
-- Preserve all v15 records and existing RLS rules.
alter table public.hh_valet_extra_cards_v15
 drop constraint if exists hh_valet_extra_v15_card_shape;
alter table public.hh_valet_extra_cards_v15
 add constraint hh_valet_extra_v16_card_shape check (
  (
   category='health' and issuer is null and last_four is null and
   front_cipher is not null and kdf_salt ~ '^[A-Za-z0-9+/]{22}==$'
  )
  or
  (
   category='bank' and
   (
    (front_cipher is null and back_cipher is null and kdf_salt is null)
    or
    (front_cipher is not null and kdf_salt ~ '^[A-Za-z0-9+/]{22}==$')
   )
  )
 );
alter table public.hh_valet_extra_cards_v15
 add constraint hh_valet_extra_v16_back_requires_front check (
  back_cipher is null or front_cipher is not null
 );
