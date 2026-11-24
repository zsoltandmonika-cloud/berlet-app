-- Profile labels separate the UI within a family account. Existing account-level RLS remains unchanged.
alter table public.hh_smart_notebooks add column owner_profile text check (owner_profile in ('zsolt','monika'));
alter table public.hh_smart_notes add column owner_profile text check (owner_profile in ('zsolt','monika'));
create function public.hh_smart_notes_profile_guard() returns trigger language plpgsql security invoker set search_path='' as $profile$
begin
 if tg_op='UPDATE' then
   if new.owner_profile is distinct from old.owner_profile then raise exception 'Profile cannot be reassigned'; end if;
   return new;
 end if;
 if new.owner_profile is not null and not exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key=new.owner_profile) then
   raise exception 'Profile access required';
 end if;
 return new;
end;
$profile$;
revoke all on function public.hh_smart_notes_profile_guard() from public,anon,authenticated;
create trigger hh_smart_notebooks_profile_guard before insert or update on public.hh_smart_notebooks for each row execute function public.hh_smart_notes_profile_guard();
create trigger hh_smart_notes_profile_guard before insert or update on public.hh_smart_notes for each row execute function public.hh_smart_notes_profile_guard();