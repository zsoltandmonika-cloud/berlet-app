-- SHO Smart Valet v17: Budapest-bérlet photo archive with existing encrypted front/back vault.
-- Legacy records untouched; this widens only the allowed category.
ALTER TABLE public.hh_valet_extra_cards_v15
 DROP CONSTRAINT IF EXISTS hh_valet_extra_cards_v15_category_check;
ALTER TABLE public.hh_valet_extra_cards_v15
 ADD CONSTRAINT hh_valet_extra_v17_category_check
 CHECK (category IN ('health','bank','pass'));
ALTER TABLE public.hh_valet_extra_cards_v15
 DROP CONSTRAINT IF EXISTS hh_valet_extra_v16_card_shape;
ALTER TABLE public.hh_valet_extra_cards_v15
 ADD CONSTRAINT hh_valet_extra_v17_card_shape CHECK (
  (category='health' AND issuer IS NULL AND last_four IS NULL
   AND front_cipher IS NOT NULL AND kdf_salt ~ '^[A-Za-z0-9+/]{22}==$')
  OR
  (category='bank' AND
    ((front_cipher IS NULL AND back_cipher IS NULL AND kdf_salt IS NULL)
     OR (front_cipher IS NOT NULL AND kdf_salt ~ '^[A-Za-z0-9+/]{22}==$')))
  OR
  (category='pass' AND issuer='BKK' AND last_four IS NULL
   AND front_cipher IS NOT NULL AND back_cipher IS NOT NULL
   AND kdf_salt ~ '^[A-Za-z0-9+/]{22}==$')
 );
COMMENT ON COLUMN public.hh_valet_extra_cards_v15.category IS
 'health, bank, pass (BKK pass is a personal photo archive, not an official digital ticket)';
