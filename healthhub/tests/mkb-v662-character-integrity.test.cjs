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
  assert.match(index, /v663-mkb-batch-character-audit/);
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
