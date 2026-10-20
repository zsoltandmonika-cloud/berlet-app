#!/usr/bin/env node
'use strict';
/* Synthetic-only v715 QA: no real patient records, tokens or Dropbox requests. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'..');
const load=file=>fs.readFileSync(path.join(dir,file),'utf8');
const preview=load('medical-master-preview-v708.js');
const privateMaster=load('medical-master-private-v709.js');
const module=load('medical-master-export-v715.js');
const index=load('index.html');
assert(index.includes('medical-master-export-v715.js'),'The normal HealthHub page must load the module');
assert(module.includes('healthhub:master-vault-synced'),'Auto-refresh event missing');
assert(module.includes("'document-upload'")&&module.includes("'explanation-save'"),'Required upload/explanation triggers missing');
assert(!module.includes('api.openai.com')&&!module.includes('localStorage.setItem('),'No remote AI/persistent PHI in the export module');
const base='/HealthHub/master/';
const manifestStamp='2026-10-20T10:00:00.000Z';
const sourceStamp='2026-10-20T09:59:59.000Z';
const clone=x=>JSON.parse(JSON.stringify(x));
const db={
 [base+'manifest.json']:{schema:'healthhub.master.manifest/1',updatedAt:manifestStamp},
 [base+'documents.json']:{schema:'healthhub.master.documents/1',updatedAt:sourceStamp,documents:[
  {id:'synthetic-m',profile:'monika',originalName:'SYNTHETIC DOCUMENT M'},
  {id:'synthetic-z',profile:'zsolt',originalName:'SYNTHETIC DOCUMENT Z'}]},
 [base+'explanations.json']:{schema:'healthhub.master.explanations/1',updatedAt:sourceStamp,explanations:[
  {id:'synthetic-m',profile:'monika',manual:{summary:'SYNTHETIC M EXPLANATION'}},
  {id:'synthetic-z',profile:'zsolt',imported:{summary:'SYNTHETIC Z EXPLANATION'}}]},
 [base+'medications.json']:{schema:'healthhub.master.medications/1',updatedAt:sourceStamp,
  privateReference:{profiles:{monika:{medications:[]},zsolt:{medications:[]}}}},
 [base+'profiles.json']:{schema:'healthhub.master.profiles/1',updatedAt:sourceStamp,profiles:[
  {profile:'monika'},{profile:'zsolt'}]},
 [base+'appointments.json']:{schema:'healthhub.master.appointments/1',updatedAt:sourceStamp,appointments:[]}
};
let online=true;
const writes=[];
const listeners={};
const window={
 location:{search:''},
 HH_DROPBOX_VAULT:{
  connected:()=>online,
  downloadJson:async p=>clone(db[p]||null),
  uploadJson:async(p,json)=>{writes.push(p);db[p]=clone(json)}
 },
 addEventListener:(name,fn)=>{listeners[name]=fn},
 setTimeout:()=>0,clearTimeout:()=>{}
};
const document={
 readyState:'loading',baseURI:'https://example.org/healthhub/',
 body:{},documentElement:{},scripts:[],
 getElementById:()=>null,addEventListener:()=>{}
};
class MockMutationObserver{observe(){}}
const context=vm.createContext({window,document,MutationObserver:MockMutationObserver,
 URLSearchParams,URL,Blob,Date,JSON,Promise,Set,Map,TextEncoder,console});
for(const source of [preview,privateMaster,module])vm.runInContext(source,context,{timeout:3000});
(async()=>{
 const api=window.HH_MEDICAL_MASTER_EXPORT_V715;
 const originalSix=clone(db);
 const first=await api.latest();
 assert.equal(first.schema,'healthhub.medical-master/1');
 assert.equal(first.audit.sourceDocuments,2);
 assert.equal(first.audit.sourceExplanations,2);
 assert.deepEqual(writes,[base+'medical-master.json'],'Only seventh private JSON can be written');
 for(const file of Object.keys(originalSix))
  assert.deepEqual(db[file],originalSix[file],'Source must be immutable: '+file);
 await api.latest();
 assert.equal(writes.length,1,'Same manifest must not overwrite current master');
 const nextManifest='2026-10-20T10:02:00.000Z';
 db[base+'manifest.json'].updatedAt=nextManifest;
 for(const name of ['documents','explanations','profiles','medications','appointments'])
  db[base+name+'.json'].updatedAt='2026-10-20T10:01:59.000Z';
 db[base+'documents.json'].documents.push({
  id:'synthetic-m2',profile:'monika',originalName:'SYNTHETIC DOCUMENT M2'});
 db[base+'explanations.json'].explanations.push({
  id:'synthetic-m2',profile:'monika',manual:{summary:'SYNTHETIC M2 EXPLANATION'}});
 const updated=await api.latest();
 assert.equal(updated.sourceManifestVersion,nextManifest);
 assert.equal(updated.audit.sourceDocuments,3);
 assert.equal(writes.length,2,'New source version must trigger seventh JSON refresh');
 db[base+'explanations.json'].updatedAt='2026-10-20T10:04:00.000Z';
 db[base+'manifest.json'].updatedAt='2026-10-20T10:05:00.000Z';
 await assert.rejects(()=>api.latest(),/frissítés közben eltért/,'Source timestamp mismatch must fail closed');
 assert.equal(writes.length,2,'Failed validation must never overwrite master');
 online=false;
 await assert.rejects(()=>api.latest(),/csatlakoztasd/,'Dropbox disconnected must fail closed');
 assert.equal(writes.length,2);
 console.log('PASS v715: six sources immutable; auto-refresh hook; latest-only export; stale/partial/disconnected protection');
})().catch(error=>{console.error(error);process.exitCode=1});
