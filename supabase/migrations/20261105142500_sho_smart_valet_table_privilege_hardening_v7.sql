-- Lock down default Supabase table grants: RLS does NOT cover TRUNCATE.
revoke all on table public.hh_valet_items from public, anon, authenticated;
grant select, insert, delete on table public.hh_valet_items to authenticated;
grant update(uploaded_at) on table public.hh_valet_items to authenticated;
