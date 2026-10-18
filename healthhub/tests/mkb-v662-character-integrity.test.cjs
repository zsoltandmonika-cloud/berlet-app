'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const ingest = fs.readFileSync(path.join(root, 'knowledge-v407-ingest.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'hh-mkb-batch-admin-v662.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const schema = fs.readFileSync(path.join(root, '..', 'supabase', 'migrations',
 '20261018183000_healthhub_mkb_character_integrity_v662.sql'), 'utf8');

test('new ingestion, admin, and migration have valid syntax and deployment linkage', () => {
  assert.doesNotThrow(() => new Function(ingest));
  assert.doesNotThrow(() => new Function(admin));
  assert.equal(index.split('hh-mkb-batch-admin-v662.js').length - 1, 1);
  assert.match(index, /v671-medical-date-attribution/);
  for (const col of ['extracted_characters','stored_characters','pages_verified','text_integrity_status']) {
    assert.match(schema, new RegExp(col));
  }
});

function verifier(pages) {
  const start = ingest.indexOf('function codepoints(s)');
  const end = ingest.indexOf('async function extractDocument(',start);
  assert.ok(start > 0 && end > start);
  const source = ingest.slice(start,end);
  const active = () => ({request: async () => pages});
  const hash = async bytes => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const f = new Function('active','hash','TextEncoder',source+';return {codepoints,verifySavedPages}');
  return f(active,hash,TextEncoder);
}

test('canonical exact Unicode codepoint counts match independent readback and hashes', async () => {
  const samples = ['Szia Mónika 😊', 'EKG: ritmus / pulzus – 65'];
  const rows = samples.map((page_text,i) => ({
    page_no:i+1,page_text,text_sha256:crypto.createHash('sha256').update(page_text).digest('hex')
  }));
  const funcs=verifier(rows);
  const expected=rows.map(r=>({pageNo:r.page_no,sha:r.text_sha256,characters:funcs.codepoints(r.page_text)}));
  assert.equal(funcs.codepoints(samples[0]),[...samples[0]].length);
  const result=await funcs.verifySavedPages('monika','a'.repeat(36),expected,2);
  assert.equal(result.matched,true);
  assert.equal(result.pagesVerified,2);
  assert.equal(result.extractedCharacters,result.storedCharacters);
});
test('content corruption and missing pages never pass character audit', async () => {
  const original='Napi mérés: 106/73 😊';
  const checksum=crypto.createHash('sha256').update(original).digest('hex');
  const expected=[{pageNo:1,sha:checksum,characters:[...original].length}];
  const bad=verifier([{page_no:1,page_text:original+' ',text_sha256:checksum}]);
  assert.equal((await bad.verifySavedPages('monika','a'.repeat(36),expected,1)).matched,false);
  const missing=verifier([]);
  assert.equal((await missing.verifySavedPages('monika','a'.repeat(36),expected,1)).matched,false);
});
test('UI does not incorrectly claim full integrity with incomplete document coverage',()=>{
  assert.match(admin,/sourceCount===docs\.length/);
  assert.match(admin,/grand\.files===grand\.indexed/);
  assert.match(admin,/delta===0/);
  assert.match(admin,/authorizedProfiles/);
  assert.match(admin,/profile_key=eq\./);
});

test('Connection recovery calls the existing Health Vault login without automatic import',()=>{
  assert.match(admin,/function vaultLogin\(\)/);
  assert.match(admin,/service\.openLogin\(\)/);
  assert.match(admin,/if\(!beforeAction\(who\)\)return/);
  assert.match(admin,/requireDrive\(who\)/);
  assert.match(admin,/hhGetGoogleDriveToken292\(true\)|get\(true\)/);
  assert.match(admin,/healthhub:central-auth-changed/);
  const assertActive=admin.split('function assertActive(who){')[1].split('function vaultLogin(){')[0];
  assert.doesNotMatch(assertActive,/GoogleDriveToken/);
  assert.match(admin,/id="hhMkbVault662"/);
  assert.match(admin,/id="hhMkbDrive662"/);
});

test('Admin Vault auth with active session refreshes RLS-authorized profiles and supports manual retry', () => {
  const vault = fs.readFileSync(path.join(root, 'central-vault/daily-health-sync.js'), 'utf8');
  assert.doesNotThrow(() => new Function(vault));
  assert.match(vault, /function refreshProfileAccess\(\)/);
  assert.match(vault, /if\(session&&!profiles\)refreshProfileAccess\(\)/);
  assert.match(vault, /data-auth-v332="refresh"/);
  assert.match(vault, /profilejogosultságok nem tölthetők be/);
  assert.match(vault, /healthhub:central-auth-changed/);
  assert.doesNotMatch(vault.split('function refreshProfileAccess(){')[1].split('function renderLoginOverlay(){')[0], /sSave\(|upload\(|download\(/);
});

test('Vector-rich EKG fallback preserves embedded text on canvas failure and keeps visual review mandatory',()=>{
 assert.match(ingest,/for\(const scale of \[\.\.\.new Set\(\[first,Math\.min\(first,1\.65\),Math\.min\(first,1\.15\)\]\)\]\)/);
 assert.match(ingest,/try\{can=await canvasPage\(page\)\}/);
 assert.match(ingest,/result\.visualFailed\+\+/);
 assert.match(ingest,/if\(visual&&can\)/);
 assert.match(ingest,/if\(can\.hhRenderedScale<1\.6\)/);
 assert.match(ingest,/result\.pagesIndexed\+\+/);
 assert.match(ingest,/page_text:text/);
});

test('User-descoped wearable EKG source IDs are removed before repeat ingestion',()=>{
 const source=ingest.slice(ingest.indexOf('async function excludedDriveIds(p){'),
   ingest.indexOf('async function readDocuments(p){'));
 assert.match(source,/source_metadata\.ingest_scope==='excluded'/);
 assert.match(source,/return new Set/);
 assert.match(ingest,/var remaining=files\.filter\(f=>!excluded\.has\(f\.id\)/);
 assert.match(ingest,/if\(excluded\.has\(f\.id\)\)\{skipped\+\+;return\}/);
 assert.match(admin,/source_metadata\.ingest_scope==='excluded'/);
 assert.match(admin,/grand\.excluded/);
 assert.match(admin,/sourceCount===docs\.length/);
 const sourceFn=new Function('active',source+';return excludedDriveIds;');
 const get=sourceFn(()=>({request:async()=>[
  {origin_ref:'keep-a',source_metadata:{archive:'HealthHub Lena Archive'}},
  {origin_ref:'skip-e',source_metadata:{ingest_scope:'excluded'}},
  {origin_ref:'keep-b',source_metadata:{}}
 ]}));
 return get('monika').then(excluded=>{
  assert.equal(excluded.size,1);
  assert.equal(excluded.has('skip-e'),true);
  assert.equal(excluded.has('keep-a'),false);
 });
});

test('Verified empty PDF leaves are preserved, not mistaken for failed OCR', async () => {
 const a=ingest.indexOf('async function certifiedEmptyPdfPage(');
 const b=ingest.indexOf('async function extractDocument(',a);
 assert.ok(a>0&&b>a);
 const blank=new Function(ingest.slice(a,b)+'return certifiedEmptyPdfPage;')();
 const OPS={save:1,restore:2,beginText:3,showText:4,paintImageXObject:5,constructPath:6};
 const page={getAnnotations:async()=>[]};
 assert.equal(await blank(page,'',{fnArray:[1,1,1,2,2,1,2,2]},{OPS}),true);
 assert.equal(await blank(page,'Hb 16',{fnArray:[1,2]},{OPS}),false);
 assert.equal(await blank(page,'',{fnArray:[1,3,4,2]},{OPS}),false);
 assert.equal(await blank(page,'',{fnArray:[1,5,2]},{OPS}),false);
 assert.equal(await blank(page,'',{fnArray:[1,6,2]},{OPS}),false);
 assert.equal(await blank({getAnnotations:async()=>[{}]},'',{fnArray:[1,2]},{OPS}),false);
 assert.equal(await blank(page,'',null,{OPS}),false);
 assert.match(ingest,/needOcr=text.length<80&&!blank/);
 assert.match(ingest,/pagesNeedingOcr/);
});
