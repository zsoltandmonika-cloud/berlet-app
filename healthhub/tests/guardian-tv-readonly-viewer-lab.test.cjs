'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cp=require('node:child_process');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const rel='guardian/tv-share-lab/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read(rel+'guardian-readonly-codec-v1.js');
const helper=read(rel+'tv-share-lab.js');
const html=read(rel+'index.html');
const ctx={module:{exports:{}},crypto:webcrypto,Uint8Array,TextEncoder,TextDecoder,Buffer,Set,Date,Number,JSON,Error};
vm.runInNewContext(source,ctx);
const codec=ctx.module.exports;
const NOW=Date.now();
const verified=(owner,time=NOW)=>({status:'ok',data:{profile_key:owner,
 route_id:'gps.'+owner,read_account:'outlook',source:'HH One Native GPS',
 latitude:47.48,longitude:19.07,accuracy_m:8,updated_at:new Date(time).toISOString(),
 battery_pct:72,battery_charging:true,
 access_token:'never-send',refresh_token:'never-send',account_id:'not-to-TV'}});

test('read-only helper imports existing protected Guardian route, not a new GPS source',()=>{
 for(const name of ['guardian-native-dropbox-v156.js','guardian-gps-routes-v1177.js',
    'guardian-gps-router-v1177.js'])assert.ok(html.includes('../'+name),name);
 assert.match(helper,/HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(helper,/route\.read\(profile\)/);
 assert.match(helper,/trustedOutlookAccount/);
 assert.match(helper,/account_id\.slice\(-8\)===OUTLOOK_ACCOUNT_SUFFIX/);
 assert.doesNotMatch(helper,/navigator\.geolocation|getCurrentPosition|watchPosition|files\/upload|uploadJson|realtime\.channel|WebSocket|supabase\.from/);
 assert.doesNotMatch(html,/supabase\.js|service_role|file\/upload/);
 assert.match(helper,/startShare/);
 assert.match(helper,/if\(!trustedOpener\(\)\)/);
 assert.match(helper,/SHO_GUARDIAN_RO_HELPER_READY_V1/);
 assert.match(helper,/SHO_GUARDIAN_RO_HELPER_ACK_V1/);
 assert.match(helper,/event\.origin!==TV_REMOTE_ORIGIN/);
 assert.match(helper,/event\.source!==w\.opener/);
 assert.match(helper,/w\.opener\.postMessage\(event,TV_REMOTE_ORIGIN\)/);
 assert.doesNotMatch(helper,/\.postMessage\([^\n]*,\s*['"]\*['"]\s*\)/);
});
test('native owner proof remains strict across both original physical-phone routes',()=>{
 for(const owner of ['zsolt','monika']){
  const input=verified(owner);
  const result=codec.sanitizedNative(owner,input,NOW);
  assert.equal(result.status,'ok');
  assert.equal(result.fix.read_account,'outlook');
  assert.equal(result.fix.route_id,'gps.'+owner);
  for(const forbidden of ['access_token','refresh_token','account_id'])
   assert.equal(Object.hasOwn(result.fix,forbidden),false);
  assert.equal(codec.freshness(result.fix,NOW),'live');
  const bad=verified(owner);
  bad.data.read_account='gmail';
  assert.equal(codec.sanitizedNative(owner,bad,NOW).status,'invalid');
  const revoked=codec.sanitizedNative(owner,{status:'revoked',data:input.data},NOW);
  assert.equal(revoked.status,'revoked');
  assert.equal(Object.hasOwn(revoked,'fix'),false);
 }
});
test('consented E2E TV envelope discloses no user location or private token to Realtime',async()=>{
 const code=codec.makeCode(webcrypto);
 assert.match(code,/^[A-HJ-NP-Z2-9]{24}$/);
 const payload={v:1,at:NOW,profiles:['zsolt','monika'].map(p=>codec.sanitizedNative(p,verified(p),NOW))};
 const envelope=await codec.seal(code,payload,1,NOW,webcrypto);
 assert.doesNotMatch(JSON.stringify(envelope),/latitude|longitude|47\.48|19\.07|never-send|refresh_token|account_id/);
 const decrypted=await codec.unseal(code,envelope,NOW+1000,webcrypto);
 assert.equal(decrypted.profiles.length,2);
 assert.equal(decrypted.profiles[0].fix.latitude,47.48);
 await assert.rejects(codec.unseal(codec.makeCode(webcrypto),envelope,NOW,webcrypto));
 await assert.rejects(codec.unseal(code,envelope,NOW+91000,webcrypto));
});
test('one-time user consent only; no automatic reading or storage persistence',()=>{
 assert.match(helper,/\$\('startShare'\)\.addEventListener\('click',start\)/);
 assert.match(helper,/\$\('stopShare'\)\.addEventListener\('click'/);
 assert.match(helper,/w\.addEventListener\('pagehide'/);
 assert.match(helper,/setInterval\(poll,INTERVAL\)/);
 assert.match(helper,/if\(busy\|\|!enabled\|\|!gate\)return/);
 assert.match(helper,/CODEC\.seal\(secret,payload,\+\+seq/);
 assert.match(helper,/SHO_GUARDIAN_RO_HELPER_CIPHERTEXT_V1/);
 assert.doesNotMatch(helper,/localStorage\.setItem|sessionStorage\.setItem|indexedDB\.open/);
 for(const file of [rel+'guardian-readonly-codec-v1.js',rel+'tv-share-lab.js'])
  cp.execFileSync(process.execPath,['--check',path.join(root,file)]);
});
