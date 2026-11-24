-- Draft only; apply in isolated test database first.
begin;
create table public.hh_smart_notebooks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), title text not null check(length(trim(title)) between 1 and 180), shared boolean not null default false, archived boolean not null default false, revision bigint not null default 0
);
create table public.hh_smart_notes (
 id uuid primary key default gen_random_uuid(), notebook_id uuid not null references public.hh_smart_notebooks(id) on delete restrict, owner_id uuid not null default auth.uid(), title text not null check(length(trim(title)) between 1 and 180), body text not null default '' check(length(body)<=200000), shared boolean not null default false, archived boolean not null default false, revision bigint not null default 0
);
create table public.hh_smart_note_tasks (
 note_id uuid not null references public.hh_smart_notes(id) on delete cascade, task_id uuid not null references public.hh_family_tasks(id) on delete cascade, owner_id uuid not null default auth.uid(), excerpt text check(length(excerpt)<=200000), primary key(note_id,task_id)
);
alter table public.hh_smart_notebooks enable row level security; revoke all on public.hh_smart_notebooks from public, anon, authenticated; grant select,insert,update,delete on public.hh_smart_notebooks to authenticated;
alter table public.hh_smart_notes enable row level security; revoke all on public.hh_smart_notes from public, anon, authenticated; grant select,insert,update,delete on public.hh_smart_notes to authenticated;
alter table public.hh_smart_note_tasks enable row level security; revoke all on public.hh_smart_note_tasks from public, anon, authenticated; grant select,insert,update,delete on public.hh_smart_note_tasks to authenticated;
create policy notebook_read on public.hh_smart_notebooks for select to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and (owner_id=(select auth.uid()) or shared));
create policy notebook_insert on public.hh_smart_notebooks for insert to authenticated with check ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()));
create policy notebook_update on public.hh_smart_notebooks for update to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid())) with check ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()));
create policy notebook_delete on public.hh_smart_notebooks for delete to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()));
create policy note_read on public.hh_smart_notes for select to authenticated using (((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and (owner_id=(select auth.uid()) or shared)) and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id));
create policy note_insert on public.hh_smart_notes for insert to authenticated with check ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()) and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id and (b.owner_id=(select auth.uid()) or b.shared) and (not hh_smart_notes.shared or b.shared)));
create policy note_update on public.hh_smart_notes for update to authenticated using (((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and (owner_id=(select auth.uid()) or (shared and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id and b.shared))))) with check (((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and (owner_id=(select auth.uid()) or (shared and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id and b.shared)))) and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id and (not hh_smart_notes.shared or b.shared)));
create function public.hh_smart_note_guard_update() returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then raise exception 'Note identity cannot change'; end if;
 if auth.uid() is not null and auth.uid() <> old.owner_id and (new.notebook_id is distinct from old.notebook_id or new.shared is distinct from old.shared or new.archived is distinct from old.archived) then raise exception 'Only the owner can change notebook, visibility or archive'; end if;
 new.revision=old.revision+1;
 return new;
end;$fn$;
revoke all on function public.hh_smart_note_guard_update() from public,anon,authenticated;
create trigger hh_smart_note_guard_update before update on public.hh_smart_notes for each row execute function public.hh_smart_note_guard_update();
create policy note_delete on public.hh_smart_notes for delete to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()));
create policy link_read on public.hh_smart_note_tasks for select to authenticated using (exists(select 1 from public.hh_smart_notes n where n.id=note_id and n.shared and exists(select 1 from public.hh_smart_notebooks b where b.id=n.notebook_id and b.shared)) and exists(select 1 from public.hh_family_tasks t where t.id=task_id));
create policy link_insert on public.hh_smart_note_tasks for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.hh_smart_notes n where n.id=note_id and n.shared and exists(select 1 from public.hh_smart_notebooks b where b.id=n.notebook_id and b.shared)) and exists(select 1 from public.hh_family_tasks t where t.id=task_id));
create policy link_delete on public.hh_smart_note_tasks for delete to authenticated using (owner_id=(select auth.uid()) and (exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))));
revoke update on public.hh_smart_note_tasks from authenticated;
create index on public.hh_smart_notes(notebook_id);
create index on public.hh_smart_note_tasks(task_id);
-- Atomic creation: task and note link succeed or roll back together.
create function public.hh_smart_note_create_task(p_note_id uuid,p_task_id uuid,p_title text,p_creator text,p_assignee text,p_excerpt text default null)
returns uuid language plpgsql security invoker set search_path='' as $fn$
begin
 if p_creator is null or p_assignee is null or p_creator not in ('zsolt','monika') or p_assignee not in ('zsolt','monika','lena') or nullif(trim(p_title),'') is null or length(p_title)>180 then
  raise exception 'Invalid task parameters';
 end if;
 if not exists(select 1 from public.hh_smart_notes n join public.hh_smart_notebooks b on b.id=n.notebook_id where n.id=p_note_id and n.shared and b.shared and not n.archived) then
  raise exception 'Shared note required';
 end if;
 insert into public.hh_family_tasks(id,title,category,creator_profile,assigned_profile,assigned_agent,created_by,updated_by_profile)
 values(p_task_id,trim(p_title),'💡 Egyéb',p_creator,case when p_assignee='lena' then p_creator else p_assignee end,case when p_assignee='lena' then 'lena' else null end,auth.uid(),p_creator);
 insert into public.hh_smart_note_tasks(note_id,task_id,owner_id,excerpt) values(p_note_id,p_task_id,auth.uid(),p_excerpt);
 return p_task_id;
end;$fn$;
revoke all on function public.hh_smart_note_create_task(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.hh_smart_note_create_task(uuid,uuid,text,text,text,text) to authenticated;

-- Realtime only on new tables. Existing shopping and tasks publications unchanged.
alter publication supabase_realtime add table public.hh_smart_notebooks,public.hh_smart_notes,public.hh_smart_note_tasks;
commit;
-- Private notes must be explicitly shared before linking to family tasks.
-- Draft: isolated validation required before deployment.
