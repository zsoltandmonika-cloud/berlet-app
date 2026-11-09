'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const central=read('family-device-central-v1.js');
const legacy=read('device-registry-v401.js');
const main=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const worker=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const native=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyDeviceCentral.kt');
const webview=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const html=read('index.html');
function harness(authorized=true){
 const calls=[],events=[],input={value:''};
 const status={authenticated:authorized,authorizedProfiles:authorized?['zsolt','monika']:[]};
 const vault={getStatus:()=>status,openLogin:()=>events.push('login'),request:async(url,options)=>{
  calls.push({url,options});
  if(url.includes('hh_family_devices_v1'))return[];
  return null;
 }};
 const w={HH_DAILY_HEALTH_SYNC_V319:vault,addEventListener:()=>{},dispatchEvent:e=>events.push(e.type),crypto:webcrypto};
 const d={getElementById:id=>id==='hhFcCodeV1'?input:null};
 vm.runInNewContext(central,{window:w,document:d,Event,TextEncoder,crypto:webcrypto,Date,Promise,Uint8Array,Array});
 return {api:w.HH_FAMILY_DEVICE_CENTRAL_V1,calls,events,input,status};
}
test('central devices start empty, never pretend Dropbox snapshots are verified Android heartbeat',async()=>{
 const h=harness();
 assert.match(h.api.render(),/Még nincs hitelesített Android-jelentés/);
 h.api.begin();await new Promise(r=>setImmediate(r));
 assert.equal(h.calls[0].url.includes('hh_family_devices_v1'),true);
 assert.deepEqual(Array.from(h.api.devices()),[]);
});
test('pairing is exact-device, SHA-256 challenge, never stores plaintext secret',async()=>{
 const h=harness(),id='android-12345678-1234-1234-1234-123456789abc',secret='a'.repeat(64);
 h.input.value=id+':'+secret;
 await h.api.click('central-pair');
 assert.equal(h.calls.length,1);
 assert.equal(h.input.value,'');
 assert.equal(h.calls[0].url,'/rest/v1/hh_family_device_pair_requests_v1');
 assert.equal(h.calls[0].options.data.profile_key,'zsolt');
 assert.equal(h.calls[0].options.data.device_id,id);
 assert.equal(h.calls[0].options.data.proof_hash,createHash('sha256').update(secret).digest('hex'));
 assert.doesNotMatch(JSON.stringify(h.calls[0]),/a{40,}/);
 assert.match(h.api.render(),/párosítás jóváhagyva/);
});
test('bad or unauthenticated pairing never writes a central request',async()=>{
 const a=harness(),b=harness(false);
 a.input.value='android-invalid:password';b.input.value='android-invalid:password';
 await a.api.click('central-pair');await b.api.click('central-pair');
 assert.equal(a.calls.length,0);
 assert.equal(b.calls.length,0);
 assert.match(a.api.render(),/formátuma érvénytelen/);
 assert.match(b.api.render(),/Health Vault-belépés szükséges/);
});
test('manual legacy removal is reversible metadata and protects both selected IDs',()=>{
 assert.match(legacy,/Eltávolítás a listából/);
 assert.match(legacy,/archivedLegacy/);
 assert.match(legacy,/oldArchived/);
 assert.match(legacy,/Object\.values\(next\.activePhones\)\.includes\(d\.deviceId\)/);
 assert.match(legacy,/await api\(\)\.uploadJson\(backup/);
 assert.match(legacy,/await api\(\)\.uploadJson\(PATH,next\)/);
 assert.match(legacy,/A kézi eltávolítás archiválás/);
 assert.doesNotMatch(legacy,/localStorage\.clear\(|indexedDB\.deleteDatabase\(/);
 assert.match(legacy,/window\.hhAdminScrollActiveV748\?\.\(\)/);
});
test('native WebView accepts Android approximate-location consent without auto-exfiltration',()=>{
 assert.match(webview,/permissions\[Manifest\.permission\.ACCESS_COARSE_LOCATION\] == true/);
 assert.match(webview,/Manifest\.permission\.ACCESS_COARSE_LOCATION\) ==/);
 assert.match(webview,/origin != "https:\/\/" \+ HOST/);
 assert.match(webview,/GeolocationPermissions\.Callback/);
});
test('native phone pairing is Zsolt-only opt-in; Dropbox sync and ID remain intact',()=>{
 assert.match(native,/owner != "zsolt"/);
 assert.match(native,/SecureRandom\(\)\.nextBytes/);
 assert.match(native,/family_registry_device_secret_v1/);
 assert.match(native,/pairing_not_approved/);
 assert.match(native,/"verified"/);
 assert.doesNotMatch(native,/remove\("orchestrator_device_id_v1"\)|remove\("dropbox_refresh_token"\)/);
 assert.match(worker,/FamilyDeviceCentral\.heartbeat\(prefs, owner, id/);
 assert.ok(worker.indexOf('FamilyDeviceCentral.heartbeat')<worker.indexOf('if (!DropboxVaultClient.hasRefreshToken'));
 assert.match(main,/Központi párosítókód másolása/);
 assert.match(html,/family-device-central-v1\.js\?v=1-family-registry-pilot/);
});
