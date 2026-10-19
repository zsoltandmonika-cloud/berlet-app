#!/usr/bin/env node
'use strict';
// No live credentials, patient documents or HTTP requests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../supabase/functions/hh-mkb-search-preview/index.ts'),'utf8');
const find=(s)=>src.indexOf(s);
for(const s of ['client.auth.getUser','from("hh_profile_access")','body?.originalDocumentsConsent===true','hh_mkb_verify_selected_pages_internal','streamClinicalV395'])
  assert.ok(find(s)>0,'missing security/control point: '+s);
assert.ok(find('client.auth.getUser')<find('hh_mkb_verify_selected_pages_internal'),'authentication before retrieval');
assert.ok(find('from("hh_profile_access")')<find('hh_mkb_verify_selected_pages_internal'),'profile authorization before retrieval');
assert.ok(find('body?.originalDocumentsConsent===true')<find('hh_mkb_verify_selected_pages_internal'),'original PDF consent before retrieval');
assert.ok(find('hh_mkb_verify_selected_pages_internal')<find('streamClinicalV395(key,body.question.trim()'),'verification before model');
assert.ok(src.includes('slice(0,16).map((d:Evidence)=>({source_id:d.documentId,page_no:d.page,quote:d.text}))'),'verification scope equals transmitted approved excerpt IDs/pages');
assert.ok(!src.includes('hh_mkb_search_verified_internal'),'no broad document-search RPC');
assert.ok(!src.includes('documents.push({type:"original_pdf_extract"'),'no silently appended original documents');
assert.ok(src.includes('A település említése nem igazol kezelési helyszínt'),'place mention is not mistaken for care location');
console.log('PASS: preview limits backend verification to explicitly approved excerpts only');
