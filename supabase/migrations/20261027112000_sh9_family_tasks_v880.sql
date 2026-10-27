-- SH9 Family Hub · Family Tasks v880
-- Private household tasks; no health/GPS data. Realtime events on change, not polling.
create table if not exists public.hh_family_tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 180),
 details text not null default '' check(char_length(details)<=1000),
 category text not null default 'Egyéb' check(char_length(category) between 1 and 38),
 creator_profile text not null references public.hh_profiles(profile_key),
 assigned_profile text not null references public.hh_profiles(profile_key),
 assigned_agent text check(assigned_agent is null or assigned_agent='lena'),
 created_by uuid not null default auth.uid() references auth.users(id),
 updated_by_profile text not null references public.hh_profiles(profile_key),
 status text not null default 'todo' check(status in ('todo','progress','done')),
 due_at timestamptz,
 completed_at timestamptz,
 reaction text check(reaction is null or reaction in ('👍','😍','🎉','🏆')),
 stars smallint check(stars is null or stars between 1 and 5),
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists hh_family_tasks_assigned_idx on public.hh_family_tasks(assigned_profile,status,updated_at desc);
create index if not exists hh_family_tasks_due_idx on public.hh_family_tasks(due_at) where due_at is not null;

create table if not exists public.hh_family_task_events (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.hh_family_tasks(id),
 event_type text not null check(event_type in ('created','assigned','status','deadline','edited','reaction')),
 actor_profile text not null references public.hh_profiles(profile_key),
 actor_user_id uuid not null references auth.users(id),
 recipient_profile text not null references public.hh_profiles(profile_key),
 title_snapshot text not null check(char_length(title_snapshot) between 1 and 180),
 previous_value jsonb not null default '{}'::jsonb,
 current_value jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint hh_task_snapshot_bound check(octet_length(previous_value::text)<=2500 and octet_length(current_value::text)<=2500)
);
create index if not exists hh_family_task_events_recent_idx on public.hh_family_task_events(created_at desc,id desc);
create index if not exists hh_family_task_events_recipient_idx on public.hh_family_task_events(recipient_profile,id desc);
-- 30-day SEARCH WINDOW, not automatic deletion of unfinished tasks or archival records.
create or replace view public.hh_family_task_logbook with (security_invoker=true) as
 select id,task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value,created_at
 from public.hh_family_task_events where created_at >= now()-interval '30 days';

alter table public.hh_family_tasks enable row level security;
alter table public.hh_family_task_events enable row level security;
revoke all on public.hh_family_tasks from anon;
revoke all on public.hh_family_task_events from anon;
revoke all on public.hh_family_task_logbook from anon;
grant select,insert,update on public.hh_family_tasks to authenticated;
grant select on public.hh_family_task_events to authenticated;
grant select on public.hh_family_task_logbook to authenticated;

create policy hh_family_tasks_read on public.hh_family_tasks for select to authenticated using (
 exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('monika','zsolt')));
create policy hh_family_tasks_create on public.hh_family_tasks for insert to authenticated with check (
 created_by=(select auth.uid()) and updated_by_profile=creator_profile and
 exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=creator_profile) and
 exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=assigned_profile));
create policy hh_family_tasks_update on public.hh_family_tasks for update to authenticated
 using(exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('monika','zsolt')))
 with check(exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key=updated_by_profile));
create policy hh_family_task_events_read on public.hh_family_task_events for select to authenticated using (
 exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('monika','zsolt')));
revoke insert,update,delete on public.hh_family_task_events from authenticated;

create schema if not exists hh_task_internal;
revoke all on schema hh_task_internal from public,anon,authenticated;
create or replace function hh_task_internal.secure_task_update()
 returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
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
 return new;
end $$;
revoke all on function hh_task_internal.secure_task_update() from public,anon,authenticated;
create trigger hh_family_tasks_secure before insert or update on public.hh_family_tasks
 for each row execute function hh_task_internal.secure_task_update();

create or replace function hh_task_internal.log_task_change()
 returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare before_json jsonb; after_json jsonb; target_profile text;
begin
 if tg_op='INSERT' then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,current_value)
  values(new.id,'created',new.updated_by_profile,auth.uid(),new.creator_profile,new.title,
   jsonb_build_object('title',new.title,'status',new.status,'assignee',new.assigned_profile,'agent',new.assigned_agent,'due',new.due_at));
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
   jsonb_build_object('status',old.status),
   jsonb_build_object('status',new.status,'completed',new.completed_at));
 end if;
 if new.due_at is distinct from old.due_at then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'deadline',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('due',old.due_at),jsonb_build_object('due',new.due_at));
 end if;
 if new.title is distinct from old.title or new.category is distinct from old.category or new.details is distinct from old.details then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'edited',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('title',old.title,'category',old.category),
   jsonb_build_object('title',new.title,'category',new.category));
 end if;
 if new.stars is distinct from old.stars or new.reaction is distinct from old.reaction then
  insert into public.hh_family_task_events(task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,previous_value,current_value)
  values(new.id,'reaction',new.updated_by_profile,auth.uid(),new.assigned_profile,new.title,
   jsonb_build_object('reaction',old.reaction,'stars',old.stars),
   jsonb_build_object('reaction',new.reaction,'stars',new.stars));
 end if;
 return null;
end $$;
revoke all on function hh_task_internal.log_task_change() from public,anon,authenticated;
create trigger hh_family_tasks_event after insert or update on public.hh_family_tasks
 for each row execute function hh_task_internal.log_task_change();
-- Postgres Changes is the only live update channel. No background polling loop.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hh_family_task_events') then
  alter publication supabase_realtime add table public.hh_family_task_events;
 end if;
end $$;
