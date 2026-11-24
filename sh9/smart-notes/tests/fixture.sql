-- Disposable CI database only. No production credentials or data.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
create table public.hh_profile_access(user_id uuid,profile_key text,primary key(user_id,profile_key));
insert into public.hh_profile_access values ('10000000-0000-0000-0000-000000000001','zsolt'),('10000000-0000-0000-0000-000000000001','monika'),('10000000-0000-0000-0000-000000000002','monika'),('10000000-0000-0000-0000-000000000002','zsolt');
alter table public.hh_profile_access enable row level security;
grant select on public.hh_profile_access to authenticated;
create policy acl on public.hh_profile_access for select to authenticated using(user_id=auth.uid());
create table public.hh_family_tasks(id uuid primary key,title text not null check(length(trim(title)) between 1 and 180),category text not null,creator_profile text not null,assigned_profile text not null,assigned_agent text check(assigned_agent is null or assigned_agent='lena'),created_by uuid not null,updated_by_profile text not null,status text not null default 'todo');
alter table public.hh_family_tasks enable row level security;
grant select,insert,update on public.hh_family_tasks to authenticated;
create policy task_read on public.hh_family_tasks for select to authenticated using(exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key in ('zsolt','monika')));
create policy task_create on public.hh_family_tasks for insert to authenticated with check(created_by=auth.uid() and updated_by_profile=creator_profile and exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key=creator_profile) and exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key=assigned_profile));
create policy task_update on public.hh_family_tasks for update to authenticated using(exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key in ('zsolt','monika'))) with check(exists(select 1 from public.hh_profile_access a where a.user_id=auth.uid() and a.profile_key=updated_by_profile));
create publication supabase_realtime;
