'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'mkb-timeline-v674.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'hh-mkb-facts-admin-v670.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const m={exports:{}};
new Function('module',src)(m);
const {groups}=m.exports;
function f(id,profile_key,source_id,label,date,type,more={}){
 return {id,profile_key,source_id,label,observed_date:date,
  fact_type:type,review_status:'pending',value_number:null,...more};
}
const facts=[
 f('vf1','monika','a','Kamrafibrilláció miatti reanimáció (2024-06-17)','2024-06-17','clinical_event'),
 f('vf2','monika','b','Kamrafibrilláció miatti reanimáció (2024.06.17.)','2024-06-17','clinical_event'),
 f('c1','monika','a','Coronarographia (2024-06-17)','2024-06-17','procedure'),
 f('c2','monika','b','Coronarographia (2024.06.17.)','2024-06-17','procedure'),
 f('lab1','zsolt','s','Vizelettenyésztés: Escherichia coli (2026-03-27)','2026-03-27','laboratory'),
 f('lab2','zsolt','s','Vizelettenyésztés: Citrobacter koseri (2026-03-27)','2026-03-27','laboratory'),
 f('lab3','zsolt','s','Vizelettenyésztés: Staphylococcus aureus (2026-03-27)','2026-03-27','laboratory')
];
test('two cardiac event families remain distinct while same-day reports appear together',()=>{
 const g=groups(facts,[]),mon=g.filter(x=>x.profile_key==='monika');
 assert.equal(mon.length,2);
 assert.deepEqual(mon.map(x=>x.records.length),[2,2]);
 assert.notEqual(mon[0].title,mon[1].title);
});
test('same specimen, multiple named organisms are ONE read-only timeline grouping',()=>{
 const z=groups(facts,[]).filter(x=>x.profile_key==='zsolt');
 assert.equal(z.length,1);
 assert.equal(z[0].records.length,3);
 assert.equal(z[0].title,'Vizelettenyésztés');
});
test('clinical safety: different source cultures, EF values, profiles and rejected facts never silently merge',()=>{
 const list=[
 ...facts,
 f('labother','zsolt','other','Vizelettenyésztés: Escherichia coli (2026-03-27)','2026-03-27','laboratory'),
 f('ef45','monika','x','EF (2024-06-17)','2024-06-17','cardiac',{value_number:45,original_unit:'%'}),
 f('ef65','monika','x','EF (2024-06-17)','2024-06-17','cardiac',{value_number:65,original_unit:'%'}),
 f('rejected','monika','b','Coronarographia (2024-06-17)','2024-06-17','procedure',{review_status:'rejected'}),
 f('third','zsolt','a','Coronarographia (2024-06-17)','2024-06-17','procedure')
 ];
 const g=groups(list,[]);
 assert.equal(g.filter(x=>x.profile_key==='zsolt'&&x.kind==='laboratory').length,2);
 assert.equal(g.filter(x=>x.kind==='cardiac').length,2);
 assert.equal(g.find(x=>x.profile_key==='monika'&&x.title==='Coronarographia').records.length,2);
 assert.equal(g.filter(x=>x.title==='Coronarographia').length,2);
});
test('source evidence references never cross fact source IDs or profiles',()=>{
 const ev=[
  {fact_id:'vf1',profile_key:'monika',source_id:'a',page_no:1,evidence_role:'supports',excerpt:'OK'},
  {fact_id:'vf2',profile_key:'monika',source_id:'a',page_no:1,evidence_role:'supports',excerpt:'WRONG_SOURCE'},
  {fact_id:'vf1',profile_key:'zsolt',source_id:'a',page_no:1,evidence_role:'supports',excerpt:'WRONG_PROFILE'},
  {fact_id:'vf1',profile_key:'monika',source_id:'a',page_no:1,evidence_role:'refutes',excerpt:'NOT_SUPPORT'},
  {fact_id:'lab1',profile_key:'zsolt',source_id:'s',page_no:1,evidence_role:'supports',excerpt:'LAB'}
 ];
 const g=groups(facts,ev);
 assert.equal(g.find(x=>x.title==='Kamrafibrilláció miatti reanimáció').evidences.length,1);
 assert.equal(g.find(x=>x.title==='Vizelettenyésztés').evidences.length,1);
});
test('private read-only UI is deployed and never mutates fact records',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.doesNotThrow(()=>new Function(admin));
 assert.match(index,/v674-source-grounded-timeline/);
 assert.match(index,/mkb-timeline-v674\.js\?v=674-event-grouping/);
 assert.match(index,/hh-mkb-facts-admin-v670\.js\?v=674-timeline-ui/);
 assert.match(admin,/hhMkbTimelineShow674/);
 const p=admin.split('async function showTimeline(){')[1].split('async function scan(){')[0];
 assert.match(p,/authorizedProfiles|allowed\(p\)/);
 assert.match(p,/guard\(p\)/);
 assert.match(p,/profile_key=eq\./);
 assert.match(p,/timeline\.groups\(facts,evidence\)/);
 assert.doesNotMatch(p,/(?:method:\s*'POST'|method:\s*'PATCH'|method:\s*'DELETE')/);
 assert.doesNotMatch(p,/localStorage\.setItem/);
});