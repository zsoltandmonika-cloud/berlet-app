-- Family Tasks v882: optional status note, audited with its status transition.
-- Additive schema change. No existing task is edited; existing notes default to ''.
begin;
alter table public.hh_family_tasks
  add column if not exists status_note text not null default '';
alter table public.hh_family_tasks
  drop constraint if exists hh_family_tasks_status_note_length_check;
alter table public.hh_family_tasks
  add constraint hh_family_tasks_status_note_length_check check (char_length(status_note) <= 500);

-- Existing trigger and RLS remain intact. Extend the same private, already
-- revoked audit function rather than creating public user-callable endpoints.
create or replace function hh_task_internal.log_task_change()
returns trigger
language plpgsql security definer set search_path to 'pg_catalog','public'
as $function$
declare target_profile text;
begin
 if tg_op='INSERT' then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,current_value)
  values(new.id,'created',new.updated_by_profile,auth.uid(),new.creator_profile,new.title,
   jsonb_build_object('title',new.title,'status',new.status,'assignee',new.assigned_profile,
                      'agent',new.assigned_agent,'due',new.due_at,'note',new.status_note));
  if new.assigned_profile is distinct from new.creator_profile or new.assigned_agent is not null then
   insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,current_value)
   values(new.id,'assigned',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
    jsonb_build_object('assignee',new.assigned_profile,'agent',new.assigned_agent));
  end if;
  return null;
 end if;

 if new.assigned_profile is distinct from old.assigned_profile or new.assigned_agent is distinct from old.assigned_agent then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'assigned',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('assignee',old.assigned_profile,'agent',old.assigned_agent),
   jsonb_build_object('assignee',new.assigned_profile,'agent',new.assigned_agent));
 end if;
 if new.status is distinct from old.status then
  target_profile:=case when new.updated_by_profile=new.creator_profile then new.assigned_profile else new.creator_profile end;
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'status',new.updated_by_profile,auth.uid(),target_profile,new.title,
   jsonb_build_object('status',old.status,'note',old.status_note),
   jsonb_build_object('status',new.status,'note',new.status_note,'completed',new.completed_at));
 end if;
 if new.due_at is distinct from old.due_at then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'deadline',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('due',old.due_at),jsonb_build_object('due',new.due_at));
 end if;
 if new.title is distinct from old.title or new.category is distinct from old.category or
    new.details is distinct from old.details or
    (new.status is not distinct from old.status and new.status_note is distinct from old.status_note) then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'edited',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('title',old.title,'category',old.category,'note',old.status_note),
   jsonb_build_object('title',new.title,'category',new.category,'note',new.status_note));
 end if;
 if new.stars is distinct from old.stars or new.reaction is distinct from old.reaction then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'reaction',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('reaction',old.reaction,'stars',old.stars),
   jsonb_build_object('reaction',new.reaction,'stars',new.stars));
 end if;
 return null;
end $function$;
revoke all on function hh_task_internal.log_task_change() from public,anon,authenticated;
commit;
