-- Isolated Cookbook AI pilot usage. No recipe, profile or health data is recorded.
create table if not exists public.hh_cookbook_ai_pilot_usage (
 day_utc date primary key,
 text_calls integer not null default 0 check (text_calls between 0 and 24),
 vision_calls integer not null default 0 check (vision_calls between 0 and 6),
 image_calls integer not null default 0 check (image_calls between 0 and 4)
);
alter table public.hh_cookbook_ai_pilot_usage enable row level security;
revoke all on public.hh_cookbook_ai_pilot_usage from public, anon, authenticated;
grant select,insert,update on public.hh_cookbook_ai_pilot_usage to service_role;
create or replace function public.hh_reserve_cookbook_ai_pilot(p_operation text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare reserved boolean := false;
begin
 if p_operation not in ('text','vision','image') or p_operation is null then return false; end if;
 insert into public.hh_cookbook_ai_pilot_usage as u(day_utc,text_calls,vision_calls,image_calls)
 values ((now() at time zone 'UTC')::date,
  case when p_operation='text' then 1 else 0 end,
  case when p_operation='vision' then 1 else 0 end,
  case when p_operation='image' then 1 else 0 end)
 on conflict (day_utc) do update set
  text_calls=u.text_calls+excluded.text_calls,
  vision_calls=u.vision_calls+excluded.vision_calls,
  image_calls=u.image_calls+excluded.image_calls
 where u.text_calls+excluded.text_calls<=24
 and u.vision_calls+excluded.vision_calls<=6
 and u.image_calls+excluded.image_calls<=4
 returning true into reserved;
 return coalesce(reserved,false);
end; $$;
revoke all on function public.hh_reserve_cookbook_ai_pilot(text) from public, anon, authenticated;
grant execute on function public.hh_reserve_cookbook_ai_pilot(text) to service_role;
