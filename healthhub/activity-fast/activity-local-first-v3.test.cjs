'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(__dirname,'activity-engine-v3.js'),'utf8');
const page=fs.readFileSync(path.join(base,'activity-one/index.html'),'utf8');
const single=fs.readFileSync(path.join(__dirname,'single-profile-cloud-v3.js'),'utf8');
const now=new Date(),day=now.toISOString().slice(0,10);
test('production Activity One runs Local-First engine before slow network settles',()=>{
 assert.match(page,/activity-fast\/activity-engine-v3\.js\?v=/);
 assert.doesNotMatch(page,/activity-profile-test\/activity-engine-v2\.js/);
 assert.match(page,/activity-fast\/single-profile-cloud-v3\.js/);
 assert.match(engine,/Promise\.all\(\[localPromise,heightPromise\]\)\.then/);
 assert.match(engine,/var sources=await Promise\.all\(\[localPromise,cloudPromise,heightPromise,samsungQuick\]\)/);
 assert.ok(engine.indexOf('Promise.all([localPromise,heightPromise]).then')<
  engine.indexOf('var sources=await Promise.all([localPromise,cloudPromise,heightPromise,samsungQuick])'));
 assert.match(engine,/data-hh-activity-source/);
 assert.match(engine,/Korábbi, helyben mentett aktivitás/);
 assert.match(engine,/Nincs friss Dropbox-ellenőrzés/);
 assert.match(engine,/String\(raw\.profile\|\|''\)\.toLowerCase\(\)===p/);
 assert.match(engine,/function openDb\(\).*indexedDB\.open\(DB\)/);
 assert.doesNotMatch(engine,/indexedDB\.open\(DB,3\)/);
});
function cacheHarness(){
 const state=new Map(),reads=[],writes=[];
 const db={
  close(){},
  transaction(_,mode){
   assert.equal(mode,'readwrite');
   const tx={oncomplete:null,onerror:null,onabort:null};
   tx.objectStore=()=>({
    get(k){
     reads.push(k);const r={};
     queueMicrotask(()=>{r.result=state.get(k)||null;r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});
     return r;
    },
    put(row){writes.push(row);state.set(row.profile,row)}
   });
   return tx;
  }
 };
 const start=engine.indexOf('async function fastSaveSnapshot('),end=engine.indexOf('function esc(',start);
 assert.ok(start>0&&end>start);
 const save=new Function('fastDb',engine.slice(start,end)+';return fastSaveSnapshot;')(async()=>db);
 return {save,reads,writes,state};
}
test('verified Activity-only local snapshot is bounded, profile keyed, and contains no raw heart samples',async()=>{
 const h=cacheHarness(),data={
  profile:'monika',exportedAt:now.toISOString(),schemaVersion:'healthhub.connect/1.3',
  records:{
   dailyActivity:[{date:day,steps:8024,activeMinutes:68},{date:'2020-01-01',steps:35}],
   exerciseSessions:[{startTime:now.toISOString(),endTime:now.toISOString(),name:'walk'}],
   heartRate:[{samples:[{time:now.toISOString(),bpm:68}]}],
   sleepSessions:[{startTime:now.toISOString()}],measurements:[{diagnosis:'private'}]
  }
 };
 assert.equal(await h.save('monika',data),true);
 const row=h.state.get('monika');
 assert.equal(row.profile,'monika');
 assert.equal(row.bundle.records.dailyActivity.length,1);
 assert.equal(row.bundle.records.dailyActivity[0].steps,8024);
 assert.equal(row.bundle.records.heartRate.length,0,'raw pulse samples must not be persisted');
 assert.deepEqual(Object.keys(row.bundle.records).sort(),['dailyActivity','exerciseSessions','heartRate']);
 assert.doesNotMatch(JSON.stringify(row),/diagnosis|sleepSessions|measurements/);
 assert.equal(h.state.has('zsolt'),false);
 assert.equal(await h.save('zsolt',data),false,'cross-profile write rejected');
 assert.equal(h.writes.length,1);
 const older={...data,exportedAt:new Date(now.getTime()-3600000).toISOString(),
  records:{...data.records,dailyActivity:[{date:day,steps:1}]}};
 await h.save('monika',older);
 assert.equal(h.state.get('monika').bundle.records.dailyActivity[0].steps,8024,'older export cannot overwrite a newer snapshot');
});
test('verified source memo deduplicates matching reads and blocks cross-profile requests',async()=>{
 const reads=[],root={
  localStorage:{getItem(k){return k==='hh-profile'?'m':null}},
  HH_DROPBOX_VAULT:{
   async downloadJson(file){reads.push(file);return {profile:'monika',records:{dailyActivity:[]}}}
  }
 };
 vm.runInNewContext(single,{window:root,Map,Date,Promise,Error,console},{filename:'single-profile-cloud-v3.js'});
 const path='/HealthHub/profiles/monika-health-connect.json';
 const result=await Promise.all([root.HH_DROPBOX_VAULT.downloadJson(path),root.HH_DROPBOX_VAULT.downloadJson(path)]);
 assert.equal(result.length,2);
 assert.equal(reads.length,1,'deduplicates one in-flight cloud read per profile');
 await assert.rejects(root.HH_DROPBOX_VAULT.downloadJson('/HealthHub/profiles/zsolt-health-connect.json'),/aktív profilját/);
 assert.equal(reads.length,1,'no cross-profile request was sent');
});
