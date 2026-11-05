-- SHO Smart Valet v10: original retail coupons use existing private originals,
-- with the same owner + profile ACL, and the same 15MB storage restrictions.
-- Official identity documents are NOT enabled as an upload category in v10.
alter table public.hh_valet_items
 drop constraint if exists hh_valet_items_category_check;
alter table public.hh_valet_items
 add constraint hh_valet_items_category_check
 check (category in ('ticket','pass','document','loyalty','coupon'));
comment on column public.hh_valet_items.category is
 'Private originals: ticket, pass, document, loyalty, coupon. No government ID, TAJ or bank card categories.';
