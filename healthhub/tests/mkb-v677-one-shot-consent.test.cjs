'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'mkb-ai-context-v677.js'),'utf8');
const ui=fs.readFileSync(path.join(base,'ask-lena-mkb-v676.js'),'utf8');
const ask=fs.readFileSync(path.join(base,'live-v331.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const moduleStub={exports:{}};new Function('module',source)(moduleStub);
const {pack,validDay}=moduleStub.exports;
const basePayload={schema:'healthhub.ask-lena/1',consent:true,profile:'monika',sources:[{id:'vitals',entries:[{name:'pulse',value:'63'}]}],extra:[{domain:'profile',label:'prior',value:'safe'}],documentEvidence:[],originalDocumentsConsent:false};
const pending=[{sourceId:'11111111-1111-4111-8111-111111111111',date:'2024-06-17',title:'Kamrafibrilláció miatti reanimáció',source:'hospital.pdf',page:2,quote:'kamrafibrilláció miatt dokumentált újraélesztés',review:'pending'}];

test('context pack never changes a source request when approval is absent',()=>{
 const out=pack(basePayload,'monika',null,'Milyen orvosi előzményeim vannak?');
 assert.equal(out.added,0);
 assert.strictEqual(out.payload,basePayload);
 assert.equal(basePayload.extra.length,1);
});
test('one approved, source-quoted observation retains date, page, pending status and 235-char cap',()=>{
 const out=pack(basePayload,'monika',pending,'Milyen orvosi előzményeim vannak?');
 assert.equal(out.added,1);
 assert.equal(out.payload.extra.length,2);
 assert.equal(out.payload.documentEvidence.length,1);
 assert.equal(out.payload.documentEvidence[0].page,2);
 assert.equal(out.payload.originalDocumentsConsent,true);
 assert.equal(out.payload.extra[0].domain,'documents');
 assert.match(out.payload.extra[0].value,/2024-06-17/);
 assert.match(out.payload.extra[0].value,/hospital\.pdf/);
 assert.match(out.payload.extra[0].value,/2\. oldal/);
 assert.match(out.payload.extra[0].value,/szakmai ellenőrzésre vár/);
 assert.match(out.payload.extra[0].label,/nem önálló diagnózis/);
 assert.ok(out.payload.extra[0].value.length<=235);
 assert.equal(basePayload.extra.length,1);
});
test('impossible or future dates, unsupported status, missing quote never enter an AI request',()=>{
 assert.equal(validDay('2024-02-30'),false);
 assert.equal(validDay('2099-01-01'),false);
 for(const changed of [
  {...pending[0],date:'2024-02-30'},
  {...pending[0],date:'2099-01-01'},
  {...pending[0],review:'rejected'},
  {...pending[0],quote:''},
  {...pending[0],page:0}
 ]){
  const out=pack(basePayload,'monika',[changed],'Milyen orvosi előzményeim vannak?');
  assert.equal(out.added,0);
 }
});
test('profile and consent mismatch fail closed',()=>{
 assert.throws(()=>pack(basePayload,'zsolt',pending,'Milyen leleteim vannak?'));
 assert.throws(()=>pack({...basePayload,consent:false},'monika',pending,'Kérdés?'));
 assert.throws(()=>pack({...basePayload,profile:'zsolt'},'monika',pending,'Kérdés?'));
});
test('existing data over server count or request size limits is not silently truncated',()=>{
 const large={...basePayload,extra:new Array(72).fill({domain:'documents',label:'large',value:'a'})};
 const out=pack(large,'monika',pending,'Milyen orvosi előzményeim vannak?');
 assert.equal(out.added,0);
 assert.strictEqual(out.payload,large);
});
test('one-use checkbox is off by default, scoped to profile and invalidated by auth/profile change',()=>{
 assert.match(ui,/opt\.type='checkbox';opt\.disabled=true/);
 assert.match(ui,/var opt=el\('hhAskMkbUse677'\),cache=prepared,granted=!!\(opt&&opt.checked\)/);
 assert.match(ui,/if\(opt\)opt\.checked=false/);
 assert.match(ui,/prepared=null;/);
 assert.match(ui,/cache\.generation!==version/);
 assert.match(ui,/Date\.now\(\)-cache\.at>5\*60\*1000/);
 assert.match(ui,/!allowed\(p\)/);
 assert.match(ui,/healthhub:profile-changed',reset/);
 assert.match(ui,/healthhub:central-auth-changed',reset/);
 assert.match(ui,/g\.evidences\.every\(e=>qa\.get\(e\.id\)\?\.verified\)/);
});
test('consented document notes enter ASK only after I-04/I-07, and before I-05 final preflight',()=>{
 assert.match(ask,/mkbConsent\.consume\(p\)/);
 assert.match(ask,/mkbPacker\.pack\(data,p,mkbGrant,question\)/);
 assert.ok(ask.indexOf('var clinical=clinicalEngine.assemble(data,clinicalCtx')<
  ask.indexOf('mkbPacker.pack(data,p,mkbGrant,question)'));
 assert.ok(ask.indexOf('mkbPacker.pack(data,p,mkbGrant,question)')<
  ask.indexOf('qualityEngine.preflight(data,p)'));
 assert.match(ask,/mkbGrant=null;/);
});
test('no local persistence and no uncapped PDF transmission',()=>{
 for(const file of [source,ui]){
  assert.doesNotMatch(file,/localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(file,/\.stream\(/);
  assert.doesNotMatch(file,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
 }
 assert.doesNotMatch(source,/fetch\(/);
 assert.match(source,/original\.length\+items\.length>72/);
 assert.match(source,/oldDocuments\.length\+docs\.length>12/);
 assert.match(source,/\.length>17500/);
});
test('v677 script build, module syntax and ordered bootstrapping',()=>{
 for(const s of [source,ui,ask])assert.doesNotThrow(()=>new Function(s));
 assert.match(index,/v679-source-grounded-story-facts-interpretation/);
 assert.match(index,/live-v331\.js\?v=679-default-audited-clinical/);
 assert.match(index,/ask-lena-mkb-v676\.js\?v=679-full-source-uuid/);
 assert.match(index,/mkb-ai-context-v677\.js\?v=679-prioritized-original-excerpt/);
});