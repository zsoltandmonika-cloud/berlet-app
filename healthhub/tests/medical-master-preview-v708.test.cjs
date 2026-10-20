#!/usr/bin/env node
'use strict';
// Synthetic data only. Does not access Dropbox, patients or API endpoints.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'medical-master-preview-v708.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'live-v304.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(loader.includes("get('hhMasterPreview')==='v1'"),'preview behind explicit URL switch');
assert(loader.includes("medical-master-preview-v708.js?v=708-readonly"));
assert(index.includes('masterPreview=708'),'modified loader not stale in browser cache');
for(const unsafe of ['.uploadJson(','.uploadFile(','api.openai.com','fetch(','localStorage.setItem(','indexedDB.open(','supabase.co/']){
 assert(!src.includes(unsafe),'read-only code should not send or persist personal data: '+unsafe);
}
const context={window:{location:{search:''}}, URLSearchParams};
vm.runInNewContext(src,context,{timeout:2000});
const api=context.window.HH_MEDICAL_MASTER_PREVIEW_V708;
assert.equal(typeof api.build,'function');
const raw={
 manifest:{schema:'healthhub.master.manifest/1',updatedAt:'2026-10-20T08:00:00Z',counts:{}},
 documents:{schema:'healthhub.master.documents/1',updatedAt:'2026-10-20T08:00:00Z',documents:[
  {id:'m1',profile:'monika',originalName:'2024-06-27 - intenzív.pdf',documentDate:'2024-06-27',sha256:'abc'},
  {id:'z1',profile:'zsolt',originalName:'2026-05-02 - labor.pdf',documentDate:'2026-05-02',sha256:'def'},
  {id:'m2',profile:'monika',originalName:'2024-06-26 - labor.pdf',documentDate:'2024-06-26',sha256:'xyz'}]},
 explanations:{schema:'healthhub.master.explanations/1',updatedAt:'2026-10-20T08:00:00Z',explanations:[
  {id:'m1',profile:'monika',manual:{title:'Felébresztés',summary:'Extubálás június 24-én',keyFindings:['Fontos eredmény']},imported:{title:'Eredeti',summary:'Eredeti magyarázat'}},
  {id:'z1',profile:'zsolt',imported:{title:'Labor',summary:'Labor magyarázat'}},
  {id:'orphan',profile:'monika',manual:{summary:'Link nélkül'}}]},
 medications:{schema:'healthhub.master.medications/1',updatedAt:'2026-10-20T08:00:00Z',privateReference:{profiles:{monika:{medications:[{name:'synthetic med A'}]},zsolt:{medications:[{name:'synthetic med B'}]}}}},
 profiles:{schema:'healthhub.master.profiles/1',updatedAt:'2026-10-20T08:00:00Z',profiles:[
  {profile:'monika',heightCm:164,address:'private',email:'private@example.org',clinicalNote:'mock'},
  {profile:'zsolt',heightCm:172,taj:'secret'}],legacyProfiles:{}},
 appointments:{schema:'healthhub.master.appointments/1',updatedAt:'2026-10-20T08:00:00Z',appointments:[
  {id:'a',profile:'monika',title:'Mock control'}, {id:'b',profile:'zsolt',title:'Mock test'}]}
};
const obj=JSON.parse(JSON.stringify(api.build(raw)));
assert.equal(obj.status,'LOCAL_PREVIEW_READ_ONLY_NOT_AI_UPLOADED');
assert.equal(obj.audit.monika.documents,2);
assert.equal(obj.audit.monika.lenaExplanations,1);
assert.equal(obj.audit.monika.withoutExplanation,1);
assert.equal(obj.audit.zsolt.documents,1);
assert.equal(obj.audit.zsolt.lenaExplanations,1);
assert.equal(obj.audit.unmatchedExplanations,1);
assert.equal(obj.patients.monika.lenaExplanations[0].manual.summary,'Extubálás június 24-én');
assert.equal(obj.patients.monika.lenaExplanations[0].imported.summary,'Eredeti magyarázat');
assert(!JSON.stringify(obj).includes('private@example.org'));
assert(!JSON.stringify(obj).includes('private"'));
assert(!JSON.stringify(obj).includes('secret'));
assert.equal(obj.patients.monika.medications[0].name,'synthetic med A');
assert.equal(obj.patients.zsolt.medications[0].name,'synthetic med B');
assert.equal(obj.patients.monika.appointments[0].profile,'monika');
assert.equal(obj.patients.zsolt.appointments[0].profile,'zsolt');
assert.equal(obj.patients.monika.documents[0].originalName,'2024-06-26 - labor.pdf');
const bad=JSON.parse(JSON.stringify(raw));delete bad.manifest;
assert.throws(()=>api.build(bad),/manifest JSON hiányzik/);
const swapped=JSON.parse(JSON.stringify(raw));swapped.explanations.explanations[0].profile='zsolt';
assert.throws(()=>api.build(swapped),/profilja eltér/);
const duplicate=JSON.parse(JSON.stringify(raw));duplicate.documents.documents.push({...duplicate.documents.documents[0]});
assert.throws(()=>api.build(duplicate),/Ismétlődő dokumentumazonosító/);
console.log('PASS: Medical Master v708 preview, six-source strictness, patient separation, original explanations, no writes');
