'use strict';
/* Synthetic schema regression: never use real family files, labs or medicines. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261018171500_healthhub_mkb_v2_core.sql'),'utf8');
const tables=['hh_mkb_sources','hh_mkb_json_records','hh_mkb_facts',
  'hh_mkb_evidence','hh_mkb_image_annotations','hh_mkb_ingest_jobs'];
for(const t of tables){
  assert.match(sql,new RegExp('create table if not exists public\\.'+t+'\\s*\\('),'table '+t);
  assert.ok(sql.includes("'"+t+"'"),'RLS loop includes '+t);
}
assert.match(sql,/foreach tbl in array/i,'all new tables use profile-scoped RLS');
assert.match(sql,/hh_profile_access a/,'relies on existing per-user authorizations');
assert.match(sql,/a\.user_id\s*=\s*\(select auth\.uid\(\)\)/,'JWT identity checked');
assert.match(sql,/foreign key \(source_id,profile_key\)\s+references public\.hh_mkb_sources\(id,profile_key\)/i,'source/fact cross-profile FK');
assert.match(sql,/foreign key \(fact_id,profile_key\)\s+references public\.hh_mkb_facts\(id,profile_key\)/i,'fact/evidence cross-profile FK');
assert.match(sql,/foreign key \(duplicate_of,profile_key\)/i,'duplicates cannot point to another profile');
assert.match(sql,/hh_kb_docs_mkb_source_profile_fk/,'old PDF KB linked without migration of existing values');
assert.match(sql,/hh_mkb_json_records[\s\S]+?original_value jsonb not null/,'original JSON value preserved');
assert.match(sql,/source_kind <> 'image'[\s\S]*archive_consent_at is not null/,'Ask Lena photo archival must have explicit approval');
assert.match(sql,/hh_mkb_originals_insert[\s\S]*original_path=name/,'private image upload requires pre-authorized source');
assert.match(sql,/unique \(profile_key,origin,origin_ref,source_version\)/,'file versions idempotent');
assert.match(sql,/json_pointer/,'nested JSON field provenance');
assert.match(sql,/page_no integer/,'PDF page citations');
assert.match(sql,/image_region jsonb/,'photo region citations');
assert.match(sql,/original_unit text/,'unit normalization cannot discard original unit');
assert.match(sql,/review_status.*pending/,'unverified facts default pending');
assert.match(sql,/revoke delete on/,'no accidental patient record deletion by clients');
assert.doesNotMatch(sql,/\b(drop table|truncate|delete from public\.hh_|update public\.hh_kb_pages)\b/i,'no destructive old-record changes');
assert.doesNotMatch(sql,/insert into public\.hh_mkb_(sources|facts|evidence)/i,'migration carries zero patient data');
console.log('Medical KB v2 foundation: 6 private tables, byte source pointers, photo consent, page-level provenance, no data mutations PASS');
