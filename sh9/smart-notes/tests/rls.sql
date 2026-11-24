begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.hh_smart_notebooks(id,title,shared) values ('20000000-0000-0000-0000-000000000001','Shared',true),('20000000-0000-0000-0000-000000000002','Private',false);
insert into public.hh_smart_notes(id,notebook_id,title,body,shared) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Shared','Original',true),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Private','Private content',false);
select public.hh_smart_note_create_task('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Example','zsolt','monika');
do $$ begin
 if (select count(*) from public.hh_smart_note_tasks)<>1 then raise exception 'Missing link';end if;
 begin perform public.hh_smart_note_create_task('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Private','zsolt','monika');raise exception 'Unexpected private task success' using errcode='XX000';exception when raise_exception then null;end;
 if exists(select 1 from public.hh_family_tasks where id='40000000-0000-0000-0000-000000000002') then raise exception 'Partial task';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select count(*) from public.hh_smart_notes)<>1 then raise exception 'Privacy failure';end if;
 update public.hh_smart_notes set body='Edited' where id='30000000-0000-0000-0000-000000000001' and revision=0;
 if not exists(select 1 from public.hh_smart_notes where body='Edited' and revision=1) then raise exception 'Shared edit failed';end if;
 begin update public.hh_smart_notes set owner_id=auth.uid() where id='30000000-0000-0000-0000-000000000001';raise exception 'Ownership stolen' using errcode='XX000';exception when raise_exception or insufficient_privilege then null;end;
 update public.hh_family_tasks set status='done' where id='40000000-0000-0000-0000-000000000001';
 if (select count(*) from public.hh_smart_note_tasks)<>1 then raise exception 'Completion removed link';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000099',true);
do $$ begin
 if (select count(*) from public.hh_smart_notes)<>0 or (select count(*) from public.hh_smart_note_tasks)<>0 then raise exception 'Non-family leak';end if;
 begin insert into public.hh_smart_notebooks(title) values('Unauthorized');raise exception 'Unauthorized insert' using errcode='XX000';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform count(*) from public.hh_smart_notes;raise exception 'Anon read allowed' using errcode='XX000';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
