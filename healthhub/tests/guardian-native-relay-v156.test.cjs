'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('healthhub/guardian/guardian-native-dropbox-v156.js');
const html=read('healthhub/guardian/index.html');
const live=read('healthhub/guardian/guardian-live-v785.js');
const kotlin=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardNativeRelay.kt');
const main=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
function setup(payload,now=Date.now(),authorized=true){
 const state=new Map();let calls=[];
 if(authorized){
  state.set('hh-dropbox-token-v2',JSON.stringify({refresh_token:'unit-test-refresh-zsolt',access_token:'unit-test-zsolt',expires_at:now+1000000,account_id:'dbid:unit-outlook'}));
  state.set('hh-remote-service-token-v1',JSON.stringify({refresh_token:'unit-test-refresh-monika',access_token:'unit-test-monika',expires_at:now+1000000,account_id:'dbid:unit-gmail'}));
 }
 const window={localStorage:{getItem(k){return state.get(k)||null},setItem(k,v){state.set(k,v)}},
  fetch:async(u,o)=>{calls.push({u,o});return {ok:true,status:200,json:async()=>payload}},
  HH_DROPBOX_VAULT:null,
  crypto:{subtle:{async digest(_alg,bytes){
   const source=new TextDecoder().decode(bytes);
   const digest=source==='dbid:unit-gmail'?'eb35bda6b9e5b3328aaa6b0f2f7aeda74e86a31f5c1e33cadb2d4829863c9d64':'0'.repeat(64);
   return Uint8Array.from(digest.match(/../g),hex=>parseInt(hex,16)).buffer;
  }}}
 };
 vm.runInNewContext(js,{window,URLSearchParams,Date,JSON,Object,Number,Math,Error,String,TextEncoder,Uint8Array,Array});
 return {api:window.HH_GUARDIAN_NATIVE_V156,calls};
}
test('standalone Family Guard loads private, read-only native Dropbox feed',()=>{
 assert.match(html,/guardian-native-dropbox-v156\.js\?v=1172-dual-dropbox-owner-routing/);
 assert.match(live,/HH_GUARDIAN_NATIVE_V156/);
 assert.match(live,/Date\.parse\(nativeFix\.updated_at\)>Date\.parse\(selected\.updated_at\)/);
 assert.match(live,/status==='revoked'/);
 assert.match(live,/data\.source==='HH One Native GPS'\?75_000:AGE_MS/);
 assert.doesNotMatch(js,/files\/upload|navigator\.geolocation|MediaRecorder|getUserMedia/);
});
test('no Dropbox session means no network request or false live location',async()=>{
 const c=setup({},Date.now(),false);
 const r=await c.api.read('monika');
 assert.equal(r.status,'not-connected');
 assert.equal(c.calls.length,0);
});
test('valid signed-in private latest snapshot returns only matching owner profile',async()=>{
 const raw={schema:'healthhub.guardian.native/1',source:'HH One Native GPS',profile:'monika',
  active:true,latitude:47.5,longitude:19.02,accuracy_m:10,updated_at:new Date().toISOString()};
 const c=setup(raw),r=await c.api.read('monika');
 assert.equal(r.status,'ok');assert.equal(r.data.profile_key,'monika');
 assert.equal(r.data.latitude,47.5);
 assert.equal(c.calls.length,1);
 assert.equal(c.calls[0].o.headers.Authorization,'Bearer unit-test-monika');
 assert.match(c.calls[0].o.headers['Dropbox-API-Arg'],/\/HealthHub\/guardian\/native-live\/monika\.json/);
 const bad=await c.api.read('zsolt');assert.equal(bad.status,'invalid');
});
test('Gmail Monika reading does not borrow the Outlook token',async()=>{
 const raw={schema:'healthhub.guardian.native/1',source:'HH One Native GPS',profile:'monika',active:true,
   latitude:47.5,longitude:19,accuracy_m:30,updated_at:new Date().toISOString()};
 const c=setup(raw);
 assert.equal((await c.api.read('zsolt')).status,'invalid');
 assert.equal(c.calls[0].o.headers.Authorization,'Bearer unit-test-zsolt');
 assert.equal((await c.api.read('monika')).status,'ok');
 assert.equal(c.calls[1].o.headers.Authorization,'Bearer unit-test-monika');
});
test('explicit revocation is authoritative even without coordinate properties',async()=>{
 const c=setup({schema:'healthhub.guardian.native/1',source:'HH One Native GPS',
  profile:'zsolt',active:false,updated_at:new Date().toISOString()});
 const r=await c.api.read('zsolt');assert.equal(r.status,'revoked');assert.equal(r.data,null);
});
test('no stale, implausible, out-of-range or synthetic position is shown',async()=>{
 for(const patch of [
  {latitude:100},{longitude:200},{accuracy_m:300},
  {updated_at:new Date(Date.now()-13*3600*1000).toISOString()},
  {updated_at:new Date(Date.now()+100000).toISOString()}
 ]){
  const v={schema:'healthhub.guardian.native/1',source:'HH One Native GPS',
   profile:'zsolt',active:true,latitude:47.5,longitude:19,accuracy_m:5,updated_at:new Date().toISOString(),...patch};
  const r=await setup(v).api.read('zsolt');assert.equal(r.status,'invalid',JSON.stringify(patch));
 }
});
test('Android shares only after separate consent and has durable revocation with no track history',()=>{
 assert.match(main,/toggleNativeFamilyShare\(\)/);
 assert.match(main,/Kifejezetten jóváhagyom/);
 assert.match(kotlin,/FamilyGuardContinuity\.enabled\(context\)/);
 assert.match(kotlin,/DropboxVaultClient\.hasRefreshToken/);
 assert.match(kotlin,/FamilyGuardContinuity\.hasBackgroundLocation/);
 assert.match(kotlin,/OneTimeWorkRequestBuilder<GuardianNativeRevokeWorker>/);
 assert.match(kotlin,/put\("active", false\)/);
 assert.match(kotlin,/put\("active", true\)/);
 assert.match(kotlin,/uploadLock\.lock\(\)/);
 assert.match(kotlin,/location\.accuracy > 100f/);
 assert.match(kotlin,/isSelectedPhysicalPhone\(app, profile\)/);
 assert.match(kotlin,/device-registry-v401\.json/);
 assert.match(kotlin,/GuardianLegacyRegistryDecision\.inspect\(legacy, profile, id\)/);
 assert.match(kotlin,/GuardianLegacyRegistryDecision\.Result\.CONFLICT/);
 assert.match(kotlin,/GuardianLegacyRegistryDecision\.Result\.INVALID -> false/);
 assert.match(kotlin,/phones\.opt\(profile\)/);
 assert.match(kotlin,/phones\.optString\(peer\) == deviceId/);
 assert.match(kotlin,/not-selected-in-device-registry/);
 assert.match(kotlin,/NativeGpsUploadPolicy\.minimumUploadMs/);
 assert.doesNotMatch(kotlin,/Firestore|RoomDatabase|insertHistory|trackPoints|MediaRecorder|CameraManager/);
});
