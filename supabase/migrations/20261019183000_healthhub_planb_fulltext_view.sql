-- HealthHub Plan B: ONE read-only, profile-scoped full-text source table.
-- This VIEW reuses original UTF-8 page_text verbatim; it never copies, edits,
-- truncates, reclassifies or rewrites a single PDF or parsed page.
-- security_invoker is required: SELECT executes the four underlying RLS
-- policies as the authenticated patient (no elevated/definer privilege).
create or replace view public.hh_mkb_fulltext_search
with (security_invoker=true)
as
select
  d.profile_key,
  d.id as document_id,
  s.id as source_id,
  p.page_no,
  s.original_name as document_name,
  -- Filename date is only a filename/date label; not proven clinical event.
  replace(replace(substring(s.original_name from
    '(20[0-9]{2}[-._][01][0-9][-._][0-3][0-9])'),'.','-'),'_','-')
    as filename_date,
  s.original_observed_at::date as source_observed_date,
  case
    when s.original_name ~* 'kardio|szív|sziv|EKG|echokard|echo|cardio|holter|pacemaker' then 'Kardiológia'
    when s.original_name ~* 'labor|vér|ver|vizelet|hemato|biokém|biokem' then 'Labor'
    when s.original_name ~* 'szem|ophthal|retina' then 'Szemészet'
    when s.original_name ~* 'tüdő|tudo|pulmo|mellkas' then 'Pulmonológia'
    when s.original_name ~* 'neurol|ideg|koponya' then 'Neurológia'
    when s.original_name ~* 'fog|dent|száj|szaj' then 'Fogászat'
    when s.original_name ~* 'bőr|bor|dermat' then 'Bőrgyógyászat'
    else 'Egyéb'
  end as category,
  p.page_text as full_text,
  char_length(p.page_text) as character_count,
  p.text_sha256,
  d.sha256 as original_sha256,
  (s.duplicate_of is not null) as duplicate_source,
  (p.text_sha256 is not null and char_length(p.page_text)>0) as text_hash_available
from public.hh_kb_pages p
join public.hh_kb_documents d on d.id=p.document_id
join public.hh_mkb_sources s on s.id=d.mkb_source_id
where d.status='complete'
  and d.text_integrity_status='verified'
  and d.profile_key=s.profile_key
  and d.sha256=s.sha256
  and s.parse_status='complete'
  and s.origin='google_drive'
  and s.source_kind='pdf'
  and coalesce(s.source_metadata->>'ingest_scope','included') <> 'excluded';
revoke all on public.hh_mkb_fulltext_search from public, anon;
grant select on public.hh_mkb_fulltext_search to authenticated;
comment on view public.hh_mkb_fulltext_search is
 'Plan B full corpus: one row per original indexed PDF page; complete verbatim UTF-8 text, not the curated 4/6 evidence extracts. security_invoker underlying patient RLS.';
