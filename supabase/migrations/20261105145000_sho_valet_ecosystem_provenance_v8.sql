-- SHO Smart Valet ecosystem v8: provenance for immutable originals copied from other apps.
-- Existing profile+owner RLS and object grants stay unchanged.
alter table public.hh_valet_items
 add column if not exists source_module text not null default 'manual'
  check (source_module in ('manual','my_trips','sport','events')),
 add column if not exists source_context_id text,
 add column if not exists source_item_id text;
alter table public.hh_valet_items
 add constraint hh_valet_source_provenance_v8 check (
  (source_module='manual' and source_context_id is null and source_item_id is null)
  or (source_module<>'manual' and nullif(source_context_id,'') is not null
      and nullif(source_item_id,'') is not null)
 );
create unique index if not exists hh_valet_unique_origin_v8
 on public.hh_valet_items(created_by,profile_key,source_module,source_item_id)
 where source_item_id is not null;
comment on column public.hh_valet_items.source_module is
 'Provenance of original private file. Only My Trips transfer is enabled in v8; Sport and Events remain reserved.';
