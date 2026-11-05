'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const code=read('sh9/wallet/smart-valet-private-v7.js');
const html=read('sh9/wallet/index.html');
const css=read('sh9/wallet/smart-valet-private-v7.css');
const sql=read('supabase/migrations/20261105125000_sho_smart_valet_private_v7.sql');
const hardening=read('supabase/migrations/20261105142500_sho_smart_valet_table_privilege_hardening_v7.sql');
function runner(){
 const w={crypto:webcrypto,location:{search:'?valetPilot=v7'},localStorage:{getItem(k){return k==='hh-profile'?'m':'hu'}},addEventListener(){}};
 const d={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(code,{window:w,document:d,Uint8Array,Array,Map,Date,URL,Blob,console,
  Number,String,Object,Promise,URLSearchParams},{filename:'smart-valet-private-v7.js'});
 return w.SH9_VALET_PRIVATE_V7;
}
function file(name,type,bytes){
 const b=new Blob([Buffer.from(bytes)],{type});
 return{name,type,size:b.size,slice:(a,z)=>b.slice(a,z),arrayBuffer:()=>b.arrayBuffer()};
}
test('private upload API is available without pilot flag, but authenticates every operation',()=>{
 const w={crypto:webcrypto,location:{search:''},localStorage:{getItem(){return 'z'}},addEventListener(){}};
 const d={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(code,{window:w,document:d,URLSearchParams,Uint8Array,Array,Map,Date,URL,Blob,console,
  Number,String,Object,Promise});
 assert.ok(w.SH9_VALET_PRIVATE_V7);
 assert.doesNotMatch(code,/get\('valetPilot'\)!=='v7'/);
 assert.match(code,/await c\.auth\.getUser\(\)/);
});
test('strict PDF/JPEG/PNG/WebP signatures and 15 MB cap, reject spoofing and empty files',async()=>{
 const api=runner();
 assert.equal((await api.validate(file('boarding.pdf','application/pdf',Buffer.from('%PDF-1.7\nsample original ticket')))).ext,'pdf');
 assert.equal((await api.validate(file('ticket.jpg','image/jpeg',[255,216,255,224,0,1]))).mime,'image/jpeg');
 assert.equal((await api.validate(file('pass.png','image/png',[137,80,78,71,13,10,26,10,0,0]))).ext,'png');
 assert.equal((await api.validate(file('poster.webp','image/webp',Buffer.from('RIFF1234WEBP1234')))).ext,'webp');
 for(const f of [
  file('fake.pdf','application/pdf',Buffer.from('NOT A PDF')),
  file('fake.png','image/png',Buffer.from('%PDF-1.2')),
  file('fake.exe','application/octet-stream',Buffer.from('MZ000')),
  file('empty.pdf','application/pdf',[]),
  file('fake.pdf','image/png',Buffer.from('%PDF-1.7'))
 ])await assert.rejects(api.validate(f),/BAD_FILE/);
 assert.ok(!api.allowedTypes.includes('application/x-msdownload'));
});
test('all private files are session-authenticated, profile-granted, and original binary stays unchanged',()=>{
 assert.match(code,/storageKey:'hh-guardian-family-auth-v785'/);
 assert.match(code,/detectSessionInUrl:false/);
 assert.match(code,/await c\.auth\.getUser\(\)/);
 assert.match(code,/\.from\('hh_profile_access'\)\.select\('profile_key'\)/);
 assert.match(code,/\.eq\('user_id',user\.id\)\.eq\('profile_key',profile\)\.maybeSingle\(\)/);
 assert.match(code,/upload\(path,f,\{contentType:info\.mime,upsert:false\}\)/);
 assert.match(code,/sha256:info\.sha256,storage_path:path/);
 assert.match(code,/\.not\('uploaded_at','is',null\)/);
 assert.match(code,/\.from\(BUCKET\)\.download\(item\.storage_path\)/);
 assert.match(code,/\.remove\(\[item\.storage_path\]\)/);
 assert.doesNotMatch(code,/getPublicUrl|createSignedUrl|service_role|secretKey|setTimeout\(.*poll/i);
});
test('RLS metadata and Storage require actual owner AND profile access, never global authenticated access',()=>{
 assert.match(sql,/create table if not exists public\.hh_valet_items/);
 assert.match(sql,/alter table public\.hh_valet_items enable row level security/);
 assert.match(sql,/created_by=\(select auth\.uid\(\)\)/);
 assert.match(sql,/a\.user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/profile_key in \('zsolt','monika'\)/);
 assert.match(sql,/storage_path = profile_key \|\| '\/' \|\| id::text/);
 assert.match(sql,/public,false|false,15000000/);
 assert.match(sql,/bucket_id='hh-smart-valet-private'/);
 assert.match(sql,/grant update\(uploaded_at\) on public\.hh_valet_items to authenticated/);
 assert.match(hardening,/revoke all on table public\.hh_valet_items from public, anon, authenticated/);
 assert.match(hardening,/grant update\(uploaded_at\) on table public\.hh_valet_items to authenticated/);
 assert.doesNotMatch(sql,/to anon|for all to authenticated|using \(true\)|with check \(true\)|public=true/i);
});
test('Golden Standard display and approved BKK image unchanged; only companion upload JS added',()=>{
 assert.match(html,/smart-valet-v1\.js\?v=5-approved-bkk-card/);
 assert.match(html,/smart-valet-bkk-approved-v5\.js\?v=5-approved-budapest-pass/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
 assert.match(html,/smart-valet-private-v7\.js\?v=9-loyalty-private/);
 assert.match(html,/sho-private-document-reader-v1\.js\?v=2-loyalty-image-zoom/);
 assert.match(html,/smart-valet-private-v7\.css\?v=9-loyalty-list/);
 assert.match(html,/central-vault\/config\.js\?v=8-wallet-prod/);
 assert.match(html,/\@supabase\/supabase-js\@2\.57\.2/);
 assert.match(css,/\.sv-vault-form-v7\[hidden\]/);
 assert.match(code,/id="svVaultCameraInputV7" accept="image\/\*" capture="environment"/);
 assert.match(code,/Bankkártyát, személyi igazolványt, útlevelet/);
 assert.match(html,/Nem érvényes belépőkód/,'demo samples remain clearly invalid');
});
