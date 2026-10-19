'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const {webcrypto,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const frontend=fs.readFileSync(path.join(root,'hh-pdf-local-archive-repair-v694.js'),'utf8');
const backend=fs.readFileSync(path.join(root,'../supabase/functions/hh-drive-repair-v694/index.ts'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fake=Uint8Array.from(Buffer.from('%PDF-1.7\nsynthetic original only\n%%EOF'));
const hash=createHash('sha256').update(fake).digest('hex');
const base64=Buffer.from(fake).toString('base64');
const sample={profile:'monika',documentId:'verified-legacy-1234',originalName:'health-report.pdf',sha256:hash,base64};

test('both modules parse and are included after Admin and document viewer',()=>{
 assert.doesNotThrow(()=>new vm.Script(frontend));
 const clean=stripTypeScriptTypes(backend.replace(/^import [^\n]+\n/m,''));
 assert.doesNotThrow(()=>new vm.Script(clean));
 assert.match(index,/v694-four-local-pdf-repair/);
 assert.match(index,/hh-pdf-local-archive-repair-v694\.js\?v=694-explicit-four-originals/);
 assert.ok(index.indexOf('hh-pdf-local-archive-repair-v694.js')>index.indexOf('live-v201.js'));
});
test('client never automatically uploads and only accepts exactly four indexed local originals',()=>{
 assert.match(frontend,/rows\.length!==4/);
 assert.match(frontend,/window\.confirm\(/);
 assert.match(frontend,/upload\.disabled=true/);
 assert.match(frontend,/check\.addEventListener\('click',inspect\)/);
 assert.match(frontend,/upload\.addEventListener\('click',repair\)/);
 assert.match(frontend,/await bytesSha\(bytes\.buffer\)/);
 assert.match(frontend,/action:'archive_inventory'/);
 assert.match(frontend,/action:'repair_upload_original_v694'/);
 assert.match(frontend,/proof\.arrayBuffer\(\)/);
 assert.match(frontend,/await bytesSha\(downloaded\)/);
 assert.doesNotMatch(frontend,/localStorage\.setItem|indexedDB\.deleteDatabase|\.delete\(|\.put\(|files\/upload/);
});
test('new server function requires profile ownership, original hash, file ancestry and idempotency',()=>{
 assert.match(backend,/ownerWithProfile\(req,profile\)/);
 assert.match(backend,/hh_profile_access/);
 assert.match(backend,/req\.headers\.get\("origin"\)!==ORIGIN/);
 assert.match(backend,/await hex\(bytes\)!==sha/);
 assert.match(backend,/const existing=await existingHashes/);
 assert.match(backend,/if\(existing\.length\)return reply\(\{ok:true,result:"already_archived"/);
 assert.match(backend,/parents:\[folder\]/);
 assert.match(backend,/uploaded\.ok/);
 assert.match(backend,/archive_upload_verify_failed/);
 assert.doesNotMatch(backend,/\bDELETE\b|\.delete\(|uploadType=media/);
});
function unit(){
 let handler=null,network=0;
 const stripped=stripTypeScriptTypes(backend.replace(/^import [^\n]+\n/m,''));
 const Deno={env:{get:k=>({
  SUPABASE_URL:'https://a.supabase.co',SUPABASE_ANON_KEY:'fakeAnon',
  SUPABASE_SERVICE_ROLE_KEY:'fakeService',HH_GOOGLE_DRIVE_CLIENT_ID:'fakeClient',
  HH_GOOGLE_DRIVE_CLIENT_SECRET:'fakeSecret',HH_GOOGLE_DRIVE_EXPECTED_EMAIL:'test@example.com',
  HH_GOOGLE_DRIVE_ENCRYPTION_KEY:Buffer.alloc(32).toString('base64')
 })[k]},serve(fn){handler=fn}};
 const ctx=vm.createContext({Deno,createClient(){throw Error('MUST NOT ACCESS DB')},
  crypto:webcrypto,Response,Request,Blob,TextEncoder,TextDecoder,Uint8Array,
  btoa,atob,URL,URLSearchParams,AbortSignal,fetch(){network++;throw Error('NETWORK FORBIDDEN')}});
 vm.runInContext(stripped+'\nthis.verifyLocal=repairUpload;\n',ctx);
 return {verify:(payload)=>ctx.verifyLocal('mock-owner',payload),get network(){return network},handler};
}
test('tampered medical bytes cannot trigger Google API transfer',async()=>{
 const u=unit();
 const reply=await u.verify({...sample,sha256:'f'.repeat(64)});
 assert.equal(reply.status,409);
 assert.equal((await reply.json()).error,'original_sha_mismatch');
 assert.equal(u.network,0);
});
test('too large or malformed medical archive payload is rejected before any Drive network',async()=>{
 const u=unit();
 for(const payload of [{...sample,base64:'not base64?'},{...sample,originalName:'../escape.pdf'},
   {...sample,sha256:'bad'},{...sample,profile:'other'}]){
  const r=await u.verify(payload);
  assert.ok(r.status===400||r.status===413);
 }
 assert.equal(u.network,0);
});
test('denies wrong origin, wrong method, or no authorization before upload',async()=>{
 const u=unit();
 const noOrigin=await u.handler(new Request('https://example.test/functions/v1/hh-drive-repair-v694',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'repair_upload_original_v694',...sample})
 }));
 assert.equal(noOrigin.status,403);
 const badMethod=await u.handler(new Request('https://example.test/functions/v1/hh-drive-repair-v694',{
  method:'GET',headers:{origin:'https://zsoltandmonika-cloud.github.io'}
 }));
 assert.equal(badMethod.status,403);
 const noAuth=await u.handler(new Request('https://example.test/functions/v1/hh-drive-repair-v694',{
  method:'POST',headers:{origin:'https://zsoltandmonika-cloud.github.io','Content-Type':'application/json'},
  body:JSON.stringify({action:'repair_upload_original_v694',...sample})
 }));
 assert.equal(noAuth.status,403);
 assert.equal(u.network,0);
});
