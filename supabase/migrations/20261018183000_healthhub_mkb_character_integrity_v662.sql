-- MKB 2.0 v662: exact Unicode character audit against independently read-back PDF page text.
-- Existing verified medical originals and data are unaffected.
-- This additive table change inherits existing hh_kb_documents profile-scoped RLS.
alter table public.hh_kb_documents
 add column if not exists extracted_characters bigint not null default 0 check (extracted_characters >= 0),
 add column if not exists stored_characters bigint not null default 0 check (stored_characters >= 0),
 add column if not exists pages_verified integer not null default 0 check (pages_verified >= 0 and pages_verified <= 3000),
 add column if not exists text_integrity_status text not null default 'pending'
  check (text_integrity_status in ('pending','verified','partial','mismatch')),
 add column if not exists text_verified_at timestamptz;

comment on column public.hh_kb_documents.extracted_characters is
 'Unicode code points extracted from verified original PDF, canonical source only';
comment on column public.hh_kb_documents.stored_characters is
 'Unicode code points independently read back from persisted hh_kb_pages';
comment on column public.hh_kb_documents.text_integrity_status is
 'Verified requires independent page-text readback, SHA-256 equality and exact Unicode character counts. Does not imply clinician-verified facts.';
