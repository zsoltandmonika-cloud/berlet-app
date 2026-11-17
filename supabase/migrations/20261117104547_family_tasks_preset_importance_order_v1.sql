-- Applied to HealthHub-Core Supabase as migration 20261117104547.
-- Shared Family Tasks preset importance (not status) + user-defined tile ordering.
alter table public.hh_family_task_presets
 add column if not exists importance text not null default 'normal';
alter table public.hh_family_task_presets
 add column if not exists display_rank numeric(14,4);
do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.hh_family_task_presets'::regclass
    and conname='hh_ft_presets_importance_allowed_v1'
 ) then
  alter table public.hh_family_task_presets
   add constraint hh_ft_presets_importance_allowed_v1
   check (importance in ('high','medium','normal'));
 end if;
end $$;
with ranked as (
 select p.id,
  (row_number() over(order by c.sort_order,p.sort_order,p.title,p.id)*1000)::numeric(14,4) as new_rank
 from public.hh_family_task_presets p
 join public.hh_family_task_categories c on c.id=p.category_id
)
update public.hh_family_task_presets p
set display_rank=ranked.new_rank
from ranked where p.id=ranked.id and p.display_rank is null;
create index if not exists hh_ft_presets_display_rank_v1
 on public.hh_family_task_presets(active,display_rank,id);
comment on column public.hh_family_task_presets.importance is
 'Independent visual importance: high red, medium amber, normal green; not completion status.';
comment on column public.hh_family_task_presets.display_rank is
 'Shared global order for human-edited Quick Add preset tiles, sparse numeric ranks.';
