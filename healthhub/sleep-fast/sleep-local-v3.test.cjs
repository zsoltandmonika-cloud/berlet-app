'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const hh=path.resolve(__dirname,'..');
const cacheSource=fs.readFileSync(path.join(__dirname,'sleep-local-v3.js'),'utf8');
const sleepSource=fs.readFileSync(path.join(hh,'live-v170.js'),'utf8');
const page=fs.readFileSync(path.join(hh,'sleep-one/index.html'),'utf8');
const now=new Date(),ago=(days)=>new Date(now.getTime()-days*86400000).toISOString();
const day=now.toISOString().slice(0,10);
const session=(id,days=1)=>({id,startTime:ago(days+0.35),endTime:ago(days),
 stages:[{stage:5,startTime:ago(days+0.2),endTime:ago(days+0.1)},{stage:6,startTime:ago(days+0.1),endTime:ago(days)}],
 sourcePackage:'Samsung Health',privateNote:'NEVER STORE THIS'});
const raw=(profile,steps)=>({profile,exportedAt:ago(0),records:{
 sleepSessions:[session(profile+'-latest',1),session(profile+'-old',96)],
 heartRate:[{samples:[{bpm:steps}]}],oxygenSaturation:[{percent:98}],measurements:[{condition:'PRIVATE'}]
}});
function makeDb(){
 const state=new Map();let opens=0,readCount=0,writeCount=0;
 const indexedDB={open(name,version){opens++;assert.equal(name,'sho-sleep-local-v3');assert.equal(version,1);
  const request={};queueMicrotask(()=>{
   request.result={objectStoreNames:{contains(){return true}},close(){},
    transaction(_,mode){
     const tx={};
     tx.objectStore=()=>({
      get(profile){readCount++;const r={};queueMicrotask(()=>{r.result=state.get(profile)||null;r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return r},
      put(value){assert.equal(mode,'readwrite');writeCount++;state.set(value.profile,value)}
     });return tx;
    }};
   request.onsuccess?.();
  });
  return request;
 }};
 const window={};
 vm.runInNewContext(cacheSource,{window,indexedDB,Date,Promise,Array,Number,JSON,Math,String,console});
 return {api:window.HH_SLEEP_LOCAL_V3,state,stats:()=>({opens,readCount,writeCount})};
}
test('Sleep cache persists only bounded measured sleep stage times, never raw Health Connect/biometrics',async()=>{
 const h=makeDb(),file=raw('monika',87);
 assert.equal(await h.api.save('monika',file),true);
 const result=await h.api.read('monika');
 assert.equal(result.profile,'monika');
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0].id,'monika-latest');
 assert.equal(result.rows[0].stages.length,2);
 assert.ok(!JSON.stringify(h.state.get('monika')).includes('PRIVATE'));
 assert.ok(!JSON.stringify(h.state.get('monika')).includes('heartRate'));
 assert.ok(!JSON.stringify(h.state.get('monika')).includes('oxygenSaturation'));
 assert.equal(await h.api.save('zsolt',file),false,'cross-owner write refused');
 assert.equal(await h.api.read('zsolt'),null,'no fallback to another owner');
 assert.equal(h.stats().writeCount,1);
});
test('Sleep cache refuses stale/future/cross-owner exports and never overwrites a newer one',async()=>{
 const h=makeDb(),fresh=raw('zsolt',50);
 await h.api.save('zsolt',fresh);
 const old={...fresh,exportedAt:ago(12)};
 old.records.sleepSessions=[session('older',10)];
 await h.api.save('zsolt',old);
 assert.equal((await h.api.read('zsolt')).rows[0].id,'zsolt-latest');
 assert.equal(h.api.snapshot('monika',fresh),null);
 assert.equal(h.api.snapshot('zsolt',{...fresh,exportedAt:ago(98)}),null);
 assert.equal(h.api.snapshot('zsolt',{...fresh,exportedAt:new Date(now.getTime()+86400000).toISOString()}),null);
 assert.equal(h.api.snapshot('zsolt',{...fresh,records:{sleepSessions:[]}}),null);
});
test('canonical Sleep always starts Dropbox and uses local snapshot as explicitly older first paint',()=>{
 assert.match(sleepSource,/var authoritative=sleepSessions\(requestedProfile\),completed=false,previewShown=false/);
 assert.match(sleepSource,/fast\.read\(requestedProfile\)/);
 assert.match(sleepSource,/fast\.save\(profile,raw\)/);
 assert.match(sleepSource,/data-hh-sleep-source/);
 assert.match(sleepSource,/Korábbi, helyben mentett alvás/);
 assert.match(sleepSource,/renderId!==sleepRenderSeq\|\|pkey\(\)!==requestedProfile/);
 assert.match(sleepSource,/Dropbox Health Connect ellenőrizve/);
 assert.match(sleepSource,/window\.hhRefreshSleepNowV1018=/);
 assert.match(sleepSource,/indexedDB\.open\(BRIDGE_DB\)/);
 assert.doesNotMatch(sleepSource,/indexedDB\.open\(BRIDGE_DB,2\)/);
});
test('Sleep One lightweight source boots on the same canonical profile without heavy HealthHub bundle',()=>{
 assert.match(page,/sleep-fast\/sleep-local-v3\.js\?v=/);
 assert.match(page,/live-v170\.js\?v=20261117-sleep-localfirst-v3/);
 assert.match(page,/sleep-three-views-v428\.js/);
 assert.match(page,/hhSleepToggleProfile\(e\)/);
 assert.match(page,/sleepGoldenBottom/);
 assert.match(page,/HH_CHATGPT_PROJECT_SHORTCUT_V712\.openProject\(e\)/);
 assert.doesNotMatch(page,/HHB13_0[0-9]|document\.open\(\)|premium-glass-home-v520/);
 const assets=[...page.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.deepEqual(assets,[
  './activity-fast/vault-read-v3.js','./activity-fast/single-profile-cloud-v3.js',
  './sleep-fast/sleep-local-v3.js','./sleep-three-views-v428.js',
  './live-v170.js','./hc-wear-history-v1150.js','./chatgpt-project-shortcut-v712.js'
 ]);
});
