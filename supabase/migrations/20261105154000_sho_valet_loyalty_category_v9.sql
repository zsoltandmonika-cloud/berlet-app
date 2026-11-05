-- Smart Valet v9. A loyalty card is an original user-uploaded image or PDF.
-- Reuse existing per-owner/profile RLS and PRIVATE storage. Never generate a payment credential.
alter table public.hh_valet_items
  drop constraint if exists hh_valet_items_category_check;
alter table public.hh_valet_items
  add constraint hh_valet_items_category_check
  check (category in ('ticket','pass','document','loyalty'));
comment on column public.hh_valet_items.category is
  'ticket, pass, document or loyalty (shopping club card image/original only; payment credentials excluded)';
