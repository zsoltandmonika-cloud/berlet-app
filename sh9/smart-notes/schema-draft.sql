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
create policy note_update on public.hh_smart_notes for update to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid())) with check ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()) and exists(select 1 from public.hh_smart_notebooks b where b.id=notebook_id and (not hh_smart_notes.shared or b.shared)));
create policy note_delete on public.hh_smart_notes for delete to authenticated using ((exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))) and owner_id=(select auth.uid()));
create policy link_read on public.hh_smart_note_tasks for select to authenticated using (exists(select 1 from public.hh_smart_notes n where n.id=note_id and n.shared) and exists(select 1 from public.hh_family_tasks t where t.id=task_id));
create policy link_insert on public.hh_smart_note_tasks for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.hh_smart_notes n where n.id=note_id and n.shared) and exists(select 1 from public.hh_family_tasks t where t.id=task_id));
create policy link_delete on public.hh_smart_note_tasks for delete to authenticated using (owner_id=(select auth.uid()) and (exists (select 1 from public.hh_profile_access a where a.user_id=(select auth.uid()) and a.profile_key in ('zsolt','monika'))));
revoke update on public.hh_smart_note_tasks from authenticated;
create index on public.hh_smart_notes(notebook_id);
create index on public.hh_smart_note_tasks(task_id);
commit;
-- Private notes must be explicitly shared before linking to family tasks.
-- Draft: shared editing, revision trigger, transactional task creation and RLS tests remain pending.
