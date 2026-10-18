-- HealthHub Medical Knowledge Base 2.0
-- Non-destructive foundation: original PDF / JSON / consented photo identity,
-- normalized facts, precise evidence, and idempotent processing.
-- No patient values or files are inserted by this migration.
-- Existing hh_kb_documents, hh_kb_pages and hh_kb_visuals remain authoritative
-- for the first-generation PDF page and EKG/image index.
--
-- IMPORTANT: An Ask Lena image is NOT inserted in this persistent catalog
-- until the person explicitly approves archiving it.
--
-- SOURCE OF TRUTH: unmodified original bytes at the verified source provider
-- (Drive/Dropbox) or the new private archive bucket, never public GitHub.

create table if not exists public.hh_mkb_sources (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  origin text not null check (origin in (
    'google_drive','dropbox','healthhub','ask_lena','health_connect',
    'samsung_health','manual','other'
  )),
  origin_ref text not null check (length(origin_ref) between 1 and 1000),
  source_version integer not null default 1 check (source_version > 0),
  source_kind text not null check (source_kind in ('pdf','json','image','other')),
  original_name text not null default '' check (length(original_name) <= 500),
  mime_type text not null check (length(mime_type) between 3 and 150),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  original_bytes bigint check (original_bytes is null or original_bytes >= 0),
  original_bucket text,
  original_path text,
  original_observed_at timestamptz,
  indexed_at timestamptz,
  parse_status text not null default 'discovered'
    check (parse_status in ('discovered','queued','processing','partial',
                            'complete','failed','needs_review')),
  source_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_metadata)='object'),
  duplicate_of uuid,
  archive_consent_at timestamptz,
  retention_policy text not null default 'archive'
    check (retention_policy in ('archive','approved_archive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key,origin,origin_ref,source_version),
  unique (id,profile_key),
  foreign key (duplicate_of,profile_key)
    references public.hh_mkb_sources(id,profile_key),
  check (duplicate_of is null or duplicate_of <> id),
  check ((original_bucket is null) = (original_path is null)),
  check (origin <> 'ask_lena' or source_kind <> 'image'
         or (archive_consent_at is not null and retention_policy='approved_archive'))
);

create index if not exists hh_mkb_sources_profile_kind
  on public.hh_mkb_sources(profile_key,source_kind,parse_status);
create index if not exists hh_mkb_sources_hash
  on public.hh_mkb_sources(profile_key,sha256);

-- Extends the existing PDF index, without changing its documents or pages.
alter table public.hh_kb_documents
  add column if not exists mkb_source_id uuid;
alter table public.hh_kb_documents
  add constraint hh_kb_docs_mkb_source_profile_fk
  foreign key (mkb_source_id,profile_key)
  references public.hh_mkb_sources(id,profile_key);

-- For JSON from monitoring tools, medications, AI reports or imported records.
-- Retain the parsed original value; the byte-for-byte source remains at origin.
create table if not exists public.hh_mkb_json_records (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  source_id uuid not null,
  json_pointer text not null default '' check (length(json_pointer) <= 1800),
  record_type text not null default 'unclassified'
    check (length(record_type) between 1 and 100),
  original_value jsonb not null,
  schema_name text check (schema_name is null or length(schema_name) <= 200),
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  unique (source_id,json_pointer),
  unique (id,profile_key),
  foreign key (source_id,profile_key)
    references public.hh_mkb_sources(id,profile_key)
);
create index if not exists hh_mkb_json_profile_type
  on public.hh_mkb_json_records(profile_key,record_type);

-- A typed evidence ledger. No unverified extraction can silently masquerade
-- as a clinician-verified medical fact. Values retain original units and dates.
create table if not exists public.hh_mkb_facts (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  source_id uuid not null,
  fact_type text not null check (fact_type in (
    'diagnosis','laboratory','cardiac','medication','procedure',
    'measurement','clinical_event','clinical_finding','symptom','other'
  )),
  label text not null check (length(label) between 1 and 350),
  code_system text check (code_system is null or length(code_system) <= 100),
  code text check (code is null or length(code) <= 100),
  value_number numeric,
  value_text text,
  original_unit text check (original_unit is null or length(original_unit) <= 100),
  detail jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detail)='object'),
  observed_at timestamptz,
  observed_date date,
  time_precision text not null default 'unknown'
    check (time_precision in ('unknown','year','month','day','minute','second')),
  polarity text not null default 'positive'
    check (polarity in ('positive','negative','uncertain')),
  assertion_type text not null default 'reported'
    check (assertion_type in ('reported','measured','inferred','historical')),
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected')),
  entered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,profile_key),
  foreign key (source_id,profile_key)
    references public.hh_mkb_sources(id,profile_key),
  check (value_number is not null or value_text is not null or detail <> '{}'::jsonb)
);
create index if not exists hh_mkb_facts_profile_type_date
  on public.hh_mkb_facts(profile_key,fact_type,observed_at desc);
create index if not exists hh_mkb_facts_profile_label
  on public.hh_mkb_facts(profile_key,label);
create index if not exists hh_mkb_facts_source on public.hh_mkb_facts(source_id);

-- Evidence may point at PDF page numbers, JSON Pointer, or a photo region.
-- Composite profile-scoped FKs make accidental cross-patient linkage invalid.
create table if not exists public.hh_mkb_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  fact_id uuid not null,
  source_id uuid not null,
  page_no integer check (page_no is null or page_no between 1 and 3000),
  json_pointer text check (json_pointer is null or length(json_pointer) <= 1800),
  image_region jsonb check (image_region is null or jsonb_typeof(image_region)='object'),
  excerpt text check (excerpt is null or length(excerpt) <= 6000),
  extraction_method text not null check (extraction_method in (
    'embedded_text','ocr','json_parse','image_review','manual','derived'
  )),
  evidence_role text not null default 'supports'
    check (evidence_role in ('supports','contradicts','context')),
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  foreign key (fact_id,profile_key)
    references public.hh_mkb_facts(id,profile_key),
  foreign key (source_id,profile_key)
    references public.hh_mkb_sources(id,profile_key)
);
create index if not exists hh_mkb_evidence_fact on public.hh_mkb_evidence(fact_id);
create index if not exists hh_mkb_evidence_source on public.hh_mkb_evidence(source_id,page_no);

-- Standalone user-supplied images, document photos, waveform candidates, etc.
-- A visual annotation is NOT an AI-certified medical diagnosis.
create table if not exists public.hh_mkb_image_annotations (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  source_id uuid not null,
  page_no integer check (page_no is null or page_no between 1 and 3000),
  image_kind text not null default 'unclassified'
    check (image_kind in ('unclassified','ekg_candidate','ultrasound',
      'medical_scan','document_photo','symptom_photo','device_display','other')),
  image_region jsonb check (image_region is null or jsonb_typeof(image_region)='object'),
  extracted_text text,
  description text,
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  foreign key (source_id,profile_key)
    references public.hh_mkb_sources(id,profile_key)
);
create index if not exists hh_mkb_images_profile_source
  on public.hh_mkb_image_annotations(profile_key,source_id);

-- Incremental, idempotent jobs; no blanket re-download/reprocessing.
create table if not exists public.hh_mkb_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.hh_profiles(profile_key),
  source_id uuid not null,
  task text not null check (task in ('extract','normalize','reindex','validate')),
  status text not null default 'queued'
    check (status in ('queued','running','partial','complete','failed','needs_review')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  pages_processed integer not null default 0 check (pages_processed >= 0),
  records_processed integer not null default 0 check (records_processed >= 0),
  error_code text check (error_code is null or length(error_code) <= 150),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (source_id,task),
  foreign key (source_id,profile_key)
    references public.hh_mkb_sources(id,profile_key)
);
create index if not exists hh_mkb_jobs_queue
  on public.hh_mkb_ingest_jobs(profile_key,status,queued_at);

-- Each table is private and honors the EXISTING hh_profile_access relation.
-- No DELETE privilege: versioned sources/facts require separate reviewed cleanup.
alter table public.hh_mkb_sources enable row level security;
alter table public.hh_mkb_json_records enable row level security;
alter table public.hh_mkb_facts enable row level security;
alter table public.hh_mkb_evidence enable row level security;
alter table public.hh_mkb_image_annotations enable row level security;
alter table public.hh_mkb_ingest_jobs enable row level security;

grant select,insert,update on
  public.hh_mkb_sources,
  public.hh_mkb_json_records,
  public.hh_mkb_facts,
  public.hh_mkb_evidence,
  public.hh_mkb_image_annotations,
  public.hh_mkb_ingest_jobs
to authenticated;

revoke delete on
  public.hh_mkb_sources,
  public.hh_mkb_json_records,
  public.hh_mkb_facts,
  public.hh_mkb_evidence,
  public.hh_mkb_image_annotations,
  public.hh_mkb_ingest_jobs
from anon, authenticated, public;

-- Single generic authorization expression, tied to the row's profile_key.
DO $mkb$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hh_mkb_sources','hh_mkb_json_records','hh_mkb_facts',
    'hh_mkb_evidence','hh_mkb_image_annotations','hh_mkb_ingest_jobs'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ' ||
      '(exists (select 1 from public.hh_profile_access a where ' ||
      'a.profile_key = %I.profile_key and a.user_id = (select auth.uid())))',
      tbl||'_select', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ' ||
      '(exists (select 1 from public.hh_profile_access a where ' ||
      'a.profile_key = %I.profile_key and a.user_id = (select auth.uid())))',
      tbl||'_insert', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ' ||
      '(exists (select 1 from public.hh_profile_access a where ' ||
      'a.profile_key = %I.profile_key and a.user_id = (select auth.uid()))) ' ||
      'WITH CHECK (exists (select 1 from public.hh_profile_access a where ' ||
      'a.profile_key = %I.profile_key and a.user_id = (select auth.uid())))',
      tbl||'_update',tbl,tbl,tbl
    );
  END LOOP;
END $mkb$;

-- Originals copied into HealthHub need a PRIVATE bucket. Drive/Dropbox
-- originals remain in place; their catalog rows need no duplicated bytes.
-- The source row must be created before authenticated object insertion.
insert into storage.buckets
  (id,name,public,file_size_limit,allowed_mime_types)
values ('hh-mkb-originals','hh-mkb-originals',false,25000000,
  array['application/pdf','application/json','image/png','image/jpeg',
        'image/webp','image/heic','image/heif']::text[])
on conflict (id) do nothing;

create policy hh_mkb_originals_read
on storage.objects for select to authenticated
using (
  bucket_id='hh-mkb-originals'
  and exists (
    select 1 from public.hh_mkb_sources s
    join public.hh_profile_access a on a.profile_key=s.profile_key
    where s.profile_key=split_part(name,'/',1)
      and s.id::text=split_part(name,'/',2)
      and s.original_bucket=bucket_id
      and s.original_path=name
      and a.user_id=(select auth.uid())
  )
);

create policy hh_mkb_originals_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='hh-mkb-originals'
  and exists (
    select 1 from public.hh_mkb_sources s
    join public.hh_profile_access a on a.profile_key=s.profile_key
    where s.profile_key=split_part(name,'/',1)
      and s.id::text=split_part(name,'/',2)
      and s.original_bucket=bucket_id
      and s.original_path=name
      and a.user_id=(select auth.uid())
  )
);
