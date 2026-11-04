-- Family Tasks · fourth terminal outcome: Nem teljesült (failed).
-- Backward-compatible with existing todo / progress / done values.
-- Original RLS, grants, identity protection and revision semantics remain.
begin;
alter table public.hh_family_tasks
  drop constraint hh_family_tasks_status_check;
alter table public.hh_family_tasks
  add constraint hh_family_tasks_status_check
  check (status in ('todo','progress','done','failed'));

create or replace function hh_task_internal.secure_task_update()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public'
as $function$
begin
 if not exists(select 1 from public.hh_profile_access x where x.user_id=auth.uid() and x.profile_key=new.updated_by_profile) then
  raise exception 'Actor profile not authorized' using errcode='42501';
 end if;
 if not exists(select 1 from public.hh_profile_access x where x.user_id=auth.uid() and x.profile_key=new.assigned_profile) then
  raise exception 'Assignee profile not authorized' using errcode='42501';
 end if;
 if tg_op='INSERT' then
  new.revision:=1; new.created_at:=now(); new.updated_at:=now();
  new.completed_at:=case when new.status in ('done','failed') then now() else null end;
  return new;
 end if;
 if new.id is distinct from old.id or new.created_by is distinct from old.created_by
  or new.creator_profile is distinct from old.creator_profile or new.created_at is distinct from old.created_at
  then raise exception 'Task identity immutable' using errcode='42501';
 end if;
 new.revision:=old.revision+1; new.updated_at:=now();
 -- completed_at stores the terminal outcome timestamp for both endings.
 if new.status in ('done','failed') then
  if new.status is distinct from old.status then new.completed_at:=now();
  else new.completed_at:=old.completed_at; end if;
 else new.completed_at:=null; end if;
 return new;
end $function$;

-- Permit privately hiding either type of closed task; preserve authorization.
alter policy hh_ft_hidden_insert_profile
 on public.hh_family_task_hidden
 with check (
  hidden_by=(select auth.uid())
  and exists (
   select 1 from public.hh_profile_access pa
   where pa.user_id=(select auth.uid()) and pa.profile_key=hh_family_task_hidden.profile_key
  )
  and exists (
   select 1 from public.hh_family_tasks t
   where t.id=hh_family_task_hidden.task_id and t.status in ('done','failed')
  )
 );
commit;
