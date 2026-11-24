-- Private note attachments. Existing buckets, tables and policies are unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sho-smart-note-attachments','sho-smart-note-attachments',false,6291456,array['image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
create policy sho_note_attachment_read on storage.objects for select to authenticated
using (bucket_id='sho-smart-note-attachments' and exists(select 1 from public.hh_smart_notes n where n.id::text=(storage.foldername(objects.name))[1]));
create policy sho_note_attachment_insert on storage.objects for insert to authenticated
with check (bucket_id='sho-smart-note-attachments' and array_length(storage.foldername(name),1)=1 and exists(select 1 from public.hh_smart_notes n where n.id::text=(storage.foldername(objects.name))[1] and not n.archived and (n.owner_id=(select auth.uid()) or n.shared)));
create policy sho_note_attachment_delete on storage.objects for delete to authenticated
using (bucket_id='sho-smart-note-attachments' and exists(select 1 from public.hh_smart_notes n where n.id::text=(storage.foldername(objects.name))[1] and not n.archived and (n.owner_id=(select auth.uid()) or (n.shared and objects.owner_id=(select auth.uid())::text))));
