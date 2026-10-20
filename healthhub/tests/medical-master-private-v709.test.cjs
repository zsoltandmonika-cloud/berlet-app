#!/usr/bin/env node
'use strict';
// v709 synthetic only. NEVER read patient data; files in Dropbox are private.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert').strict;
const root=path.join(__dirname,'..');
const preview=fs.readFileSync(path.join(root,'medical-master-preview-v708.js'),'utf8');
const pilot=fs.readFileSync(path.join(root,'medical-master-private-v709.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'live-v304.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(loader.includes("get('hhMasterPilot')==='v1'"));
assert(loader.includes("medical-master-private-v709.js?v=709-guarded"));
assert(index.includes("masterPilot=709"));
assert(!pilot.includes('api.openai.com')&&!pilot.includes('OPENAI_API_KEY'));
assert(!pilot.includes('localStorage.setItem(')&&!pilot.includes('indexedDB.open('));
const store={
 '/HealthHub/master/manifest.json':{schema:'healthhub.master.manifest/1',updatedAt:'2026-10-20T06:40:48.619Z'},
 '/HealthHub/master/documents.json':{schema:'healthhub.master.documents/1',updatedAt:'2026-10-20T06:40:42.840Z',documents:[
  {id:'m1',profile:'monika',documentDate:'2024-06-17',originalName:'synthetic document M1'},
  {id:'z1',profile:'zsolt',documentDate:'2024-06-18',originalName:'synthetic document Z1'}
 ]},
 '/HealthHub/master/explanations.json':{schema:'healthhub.master.explanations/1',updatedAt:'2026-10-20T06:40:42.840Z',explanations:[
  {id:'m1',profile:'monika',imported:{title:'Synthetic M1',summary:'synthetic summary'}},
  {id:'z1',profile:'zsolt',imported:{title:'Synthetic Z1',summary:'synthetic summary'}}
 ]},
 '/HealthHub/master/medications.json':{schema:'healthhub.master.medications/1',updatedAt:'2026-10-20T06:40:42.840Z',privateReference:{profiles:{monika:{medications:[]},zsolt:{medications:[]}}}},
 '/HealthHub/master/profiles.json':{schema:'healthhub.master.profiles/1',updatedAt:'2026-10-20T06:40:42.840Z',profiles:[{profile:'monika',medicalData:'test'},{profile:'zsolt',medicalData:'test'}]},
 '/HealthHub/master/appointments.json':{schema:'healthhub.master.appointments/1',updatedAt:'2026-10-20T06:40:42.840Z',appointments:[]}
};
const cloned=x=>JSON.parse(JSON.stringify(x));
const calls=[];
const vault={connected:()=>true,
 downloadJson:async key=>cloned(store[key]||null),
 uploadJson:async(key,value)=>{calls.push(key);store[key]=cloned(value);return true;}};
const context={window:{location:{search:''},HH_DROPBOX_VAULT:vault},URLSearchParams,Date};
vm.runInNewContext(preview,context,{timeout:2000});
vm.runInNewContext(pilot,context,{timeout:2000});
const api=context.window.HH_MEDICAL_MASTER_PRIVATE_V709;
assert.equal(api.target,'/HealthHub/master/medical-master.json');
(async()=>{
 const originals=cloned(store);
 const master=await api.prepare();
 assert.equal(calls.length,0,'read-only prepare');
 assert.equal(master.schema,'healthhub.medical-master/1');
 assert.equal(master.audit.sourceDocuments,2);
 assert.equal(master.audit.sourceExplanations,2);
 assert.equal(master.patients.monika.lenaExplanations[0].imported.title,'Synthetic M1');
 assert.deepEqual(cloned(store),originals,'no original files changed by prepare');
 const saved=await api.save(master);
 assert.equal(saved.verified,true);
 assert.deepEqual(calls,[api.target],'ONLY seventh private Dropbox JSON is written');
 assert.deepEqual(cloned(store[api.target]),cloned(master),'exact read-after-write');
 for(const name of Object.keys(originals))assert.deepEqual(store[name],originals[name],'source untouched '+name);
 const lower=cloned(master);lower.audit.sourceDocuments=1;lower.audit.monika.documents=0;lower.patients.monika.documents=[];
 await assert.rejects(()=>api.save(lower),/adatvesztés|Forrás-összerendelési hiba|Magyarázat dokumentumkapcsolat/);
 assert.deepEqual(calls,[api.target],'loss guard prevents writes');
 store['/HealthHub/master/manifest.json'].updatedAt='2026-10-20T07:40:48.619Z';
 await assert.rejects(()=>api.save(master),/források a próba óta frissültek/);
 assert.deepEqual(calls,[api.target],'stale guard prevents writes');
 store['/HealthHub/master/manifest.json'].updatedAt=originals['/HealthHub/master/manifest.json'].updatedAt;
 const badStamp=cloned(originals);
 badStamp['/HealthHub/master/explanations.json'].updatedAt='2026-10-20T07:40:42.840Z';
 Object.assign(store,badStamp);
 await assert.rejects(()=>api.prepare(),/forrás frissítés közben eltért/);
 console.log('PASS v709: private 6-to-1 Master; no source writes; read-back check; missing/stale/shrink guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
