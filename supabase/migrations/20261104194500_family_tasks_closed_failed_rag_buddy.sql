-- Family Tasks: "Nem teljesült" is a genuinely closed, unsuccessful task.
-- Completion time stays reserved for successful DONE; closed_at records failure.
-- Current event log trigger will audit the exact status transition unchanged.
begin;
alter table public.hh_family_tasks
  add column if not exists closed_at timestamptz;
alter table public.hh_family_tasks
  drop constraint if exists hh_family_tasks_status_check;
alter table public.hh_family_tasks
  add constraint hh_family_tasks_status_check
  check (status in ('todo','progress','done','failed'));
create or replace function hh_task_internal.secure_task_update()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
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
  new.completed_at:=case when new.status='done' then now() else null end;
  new.closed_at:=case when new.status='failed' then now() else null end;
  return new;
 end if;
 if new.id is distinct from old.id or new.created_by is distinct from old.created_by
  or new.creator_profile is distinct from old.creator_profile or new.created_at is distinct from old.created_at
  then raise exception 'Task identity immutable' using errcode='42501';
 end if;
 new.revision:=old.revision+1; new.updated_at:=now();
 if new.status='done' and old.status<>'done' then new.completed_at:=now();
 elsif new.status<>'done' then new.completed_at:=null;
 else new.completed_at:=old.completed_at; end if;
 if new.status='failed' and old.status<>'failed' then new.closed_at:=now();
 elsif new.status<>'failed' then new.closed_at:=null;
 else new.closed_at:=old.closed_at; end if;
 return new;
end $function$;
commit;
