import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {isValidManifest,sha256}
 from '../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs';

const NOW=Date.parse('2026-11-01T17:00:00Z');
function manifest(){return {
 schema:'sh9.bkk.feed-manifest/1',
 filename:'bkk-selected-routes-v1106.json',
 sha256:'a'.repeat(64),sourceSha256:'b'.repeat(64),
 bytes:4931984,source:'BKK Zrt., CC BY 4.0',
 license:'CC-BY-4.0',coverage:'stop-to-stop',live:false,
 generatedAt:'2026-10-29T12:00:00Z',
 validatedAt:'2026-11-01T16:25:47Z',
 routes:['17','19','41','260'],feedStart:'2026-10-30',feedEnd:'2026-12-01'
}}
test('valid daily-checked official timetable is readable without rebuilding 5MB daily',()=>{
 assert.equal(isValidManifest(manifest(),NOW),true);
});
test('stale validation, stale feed and wrong license fail closed',()=>{
 for(const invalid of [
  {validatedAt:'2026-10-29T10:00:00Z'},
  {generatedAt:'2026-10-01T10:00:00Z'},
  {feedEnd:'2026-11-01'}, {sourceSha256:null},{sha256:'not-a-digest'},
  {license:'unknown'}, {live:true},{bytes:12000000}
 ]){
  assert.equal(isValidManifest({...manifest(),...invalid},NOW),false,JSON.stringify(invalid));
 }
});
test('SHA256 content hash matches standard SHA256 implementation',async()=>{
 const bytes=new TextEncoder().encode('BKK Zrt. CC BY 4.0').buffer;
 const digest=await sha256(bytes,webcrypto.subtle);
 assert.match(digest,/^[0-9a-f]{64}$/);
 assert.equal(digest,'0dd57383c8bf91d68185d1c1b2f1ab285f9990331a6707b91ad0cc2d9a04c1c0');
});
