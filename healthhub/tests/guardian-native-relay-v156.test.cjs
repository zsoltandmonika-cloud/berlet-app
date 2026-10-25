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
 if(authorized)state.set('hh-dropbox-token-v2',JSON.stringify({refresh_token:'unit-test-refresh-token-not-real',access_token:'unit-test-access',expires_at:now+1000000}));
 const window={localStorage:{getItem(k){return state.get(k)||null},setItem(k,v){state.set(k,v)}},
  fetch:async(u,o)=>{calls.push({u,o});return {ok:true,status:200,json:async()=>payload}},
  HH_DROPBOX_VAULT:null
 };
 vm.runInNewContext(js,{window,URLSearchParams,Date,JSON,Object,Number,Math,Error,String});
 return {api:window.HH_GUARDIAN_NATIVE_V156,calls};
}
test('standalone Family Guard loads private, read-only native Dropbox feed',()=>{
 assert.match(html,/guardian-native-dropbox-v156\.js\?v=156-private-native-relay/);
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
 assert.match(c.calls[0].o.headers['Dropbox-API-Arg'],/\/HealthHub\/guardian\/native-live\/monika\.json/);
 const bad=await c.api.read('zsolt');assert.equal(bad.status,'invalid');
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
 assert.match(kotlin,/registry\.optJSONObject\("activePhones"\)\?\.optString\(profile\) != id/);
 assert.match(kotlin,/not-selected-in-device-registry/);
 assert.match(kotlin,/now - lastQueuedAt < maxOf\(30_000L/);
 assert.doesNotMatch(kotlin,/Firestore|RoomDatabase|insertHistory|trackPoints|MediaRecorder|CameraManager/);
});
