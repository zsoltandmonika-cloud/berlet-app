-- SH9 Family Tasks v880 · household planner (no medical records or GPS).
-- An existing authenticated household member may collaborate on Zsolt/Mónika tasks.
-- All writes have database-controlled authorship and an immutable event trail.
create table if not exists public.hh_family_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  details text not null default '' check (char_length(details) <= 1000),
  category text not null default 'Egyéb' check (char_length(category) between 1 and 38),
  creator_profile text not null references public.hh_profiles(profile_key),
  assigned_profile text not null references public.hh_profiles(profile_key),
  created_by uuid not null default auth.uid() references auth.users(id),
  status text not null default 'todo' check (status in ('todo','progress','done')),
  due_at timestamptz,
  completed_at timestamptz,
  reaction text check (reaction is null or reaction in ('👍','😍','🎉','🏆')),
  stars smallint check (stars is null or stars between 1 and 5),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hh_family_tasks_assigned_idx on public.hh_family_tasks(assigned_profile,status,updated_at desc);
create index if not exists hh_family_tasks_due_idx on public.hh_family_tasks(due_at) where due_at is not null;

create table if not exists public.hh_family_task_events (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.hh_family_tasks(id) on delete cascade,
 event_type text not null check(event_type in ('created','assigned','status','reaction','deadline','edited')),
 actor_profile text not null references public.hh_profiles(profile_key),
 actor_user_id uuid not null default auth.uid() references auth.users(id),
 recipient_profile text not null references public.hh_profiles(profile_key),
 title_snapshot text not null check(char_length(title_snapshot) between 1 and 180),
 status_before text check(status_before is null or status_before in ('todo','progress','done')),
 status_after text not null check(status_after in ('todo','progress','done')),
 assignee_before text references public.hh_profiles(profile_key),
 assignee_after text not null references public.hh_profiles(profile_key),
 due_before timestamptz,
 due_after timestamptz,
 created_at timestamptz not null default now()
);
-- The Family Tasks UI queries a rolling last-30-days window; task records
-- themselves are NOT deleted or expired. Audit events are append-only.
create index if not exists hh_family_task_events_recipient_idx on public.hh_family_task_events(recipient_profile,id desc);
create index if not exists hh_family_task_events_recent_idx on public.hh_family_task_events(created_at desc,id desc);

alter table public.hh_family_tasks enable row level security;
alter table public.hh_family_task_events enable row level security;
revoke all on public.hh_family_tasks from anon;
revoke all on public.hh_family_task_events from anon;
grant select,insert,update on public.hh_family_tasks to authenticated;
grant select on public.hh_family_task_events to authenticated;
grant usage,select on sequence public.hh_family_task_events_id_seq to authenticated;

create policy hh_family_tasks_family_read on public.hh_family_tasks for select to authenticated using (
 exists(select 1 from public.hh_profile_access m where m.user_id=(select auth.uid())
 and m.profile_key in ('zsolt','monika')));
create policy hh_family_tasks_family_insert on public.hh_family_tasks for insert to authenticated with check (
 created_by=(select auth.uid()) and
 exists(select 1 from public.hh_profile_access m where m.user_id=(select auth.uid())
 and m.profile_key=creator_profile) and
 exists(select 1 from public.hh_profile_access a where a.user_id=(select auth.uid())
 and a.profile_key=assigned_profile));
create policy hh_family_tasks_family_update on public.hh_family_tasks for update to authenticated
 using (exists(select 1 from public.hh_profile_access m where m.user_id=(select auth.uid())
 and m.profile_key in ('zsolt','monika')))
 with check (exists(select 1 from public.hh_profile_access m where m.user_id=(select auth.uid())
 and m.profile_key in ('zsolt','monika')));
create policy hh_family_task_events_family_read on public.hh_family_task_events for select to authenticated using (
 exists(select 1 from public.hh_profile_access m where m.user_id=(select auth.uid())
 and m.profile_key=recipient_profile));

create schema if not exists hh_task_internal;
revoke all on schema hh_task_internal from public, anon, authenticated;
create or replace function hh_task_internal.secure_task_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  if new.status='done' then new.completed_at:=coalesce(new.completed_at,now()); else new.completed_at:=null; end if;
  return new;
 end if;
 if new.id is distinct from old.id or new.creator_profile is distinct from old.creator_profile
 or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
  raise exception 'Task author and identity are immutable' using errcode='42501';
 end if;
 if new.assigned_profile<>old.assigned_profile and not exists(
  select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key=new.assigned_profile) then
  raise exception 'Recipient profile not authorized' using errcode='42501';
 end if;
 new.updated_at:=now();
 new.revision:=old.revision+1;
 if new.status='done' and old.status<>'done' then new.completed_at:=now();
 elsif new.status<>'done' then new.completed_at:=null; end if;
 return new;
end $$;
revoke all on function hh_task_internal.secure_task_update() from public, anon, authenticated;
create trigger hh_family_tasks_secure before insert or update on public.hh_family_tasks
for each row execute function hh_task_internal.secure_task_update();

create or replace function hh_task_internal.task_events()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
  values
    (new.id,case when new.assigned_profile=new.creator_profile then 'created' else 'assigned' end,
     new.creator_profile,auth.uid(),new.assigned_profile,new.title,
     null,new.status,null,new.assigned_profile,null,new.due_at);
 else
  -- Store independent before/after values; never derive past facts from the
  -- current mutable task row. Only actual changes create events.
  if new.assigned_profile is distinct from old.assigned_profile then
   insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
   values (new.id,'assigned',old.assigned_profile,auth.uid(),new.assigned_profile,new.title,
     old.status,new.status,old.assigned_profile,new.assigned_profile,old.due_at,new.due_at);
  end if;
  if new.status is distinct from old.status then
   insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
   values (new.id,'status',new.assigned_profile,auth.uid(),new.creator_profile,new.title,
     old.status,new.status,old.assigned_profile,new.assigned_profile,old.due_at,new.due_at);
  end if;
  if new.due_at is distinct from old.due_at then
   insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
   values (new.id,'deadline',new.assigned_profile,auth.uid(),new.assigned_profile,new.title,
     old.status,new.status,old.assigned_profile,new.assigned_profile,old.due_at,new.due_at);
  end if;
  if new.title is distinct from old.title or new.details is distinct from old.details
     or new.category is distinct from old.category then
   insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
   values (new.id,'edited',new.assigned_profile,auth.uid(),new.assigned_profile,new.title,
     old.status,new.status,old.assigned_profile,new.assigned_profile,old.due_at,new.due_at);
  end if;
  if new.stars is distinct from old.stars or new.reaction is distinct from old.reaction then
   insert into public.hh_family_task_events
    (task_id,event_type,actor_profile,actor_user_id,recipient_profile,title_snapshot,
     status_before,status_after,assignee_before,assignee_after,due_before,due_after)
   values (new.id,'reaction',new.creator_profile,auth.uid(),new.assigned_profile,new.title,
     old.status,new.status,old.assigned_profile,new.assigned_profile,old.due_at,new.due_at);
  end if;
 end if;
 return null;
end $$;
revoke all on function hh_task_internal.task_events() from public,anon,authenticated;
create trigger hh_family_tasks_event after insert or update on public.hh_family_tasks
for each row execute function hh_task_internal.task_events();

-- Postgres Changes powers live notifications while a tab is active. No polling.
do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hh_family_task_events') then
  alter publication supabase_realtime add table public.hh_family_task_events;
 end if;
end $$;
