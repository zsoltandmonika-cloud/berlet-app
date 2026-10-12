'use strict';
/* Run: node healthhub/tests/intelligence-v402.test.cjs
 * Synthetic data ONLY. Never loads patient files or sends network requests. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sandbox={window:{}};
vm.createContext(sandbox);
for(const name of ['intelligence-i05-quality-v402.js','intelligence-i06-narrative-v402.js','intelligence-i07-context-v402.js']){
 vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
}
const q=sandbox.window.HH_CLINICAL_QUALITY_GATE_I05_V402;
const n=sandbox.window.HH_NARRATIVE_INTELLIGENCE_I06_V402;
const c=sandbox.window.HH_CONTEXTUAL_REASONING_I07_V402;
let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label)}
const time='2026-10-11T10:00:00.000Z';
function base(){return {schema:'healthhub.ask-lena/1',profile:'monika',consent:true,question:'Mit jelent ez a mérés?',
 sources:[{id:'vitals',title:'Mérés',status:'ready',entries:[{name:'pulzus',value:65,unit:'/perc',observedAt:time}]}],
 extra:[],documentEvidence:[],originalDocumentsConsent:false}}
test('I-05 consent and profile guard',()=>{
 assert.throws(()=>q.preflight({...base(),profile:'zsolt'},'monika'),/I-05/);
 assert.throws(()=>q.preflight({...base(),consent:false},'monika'),/I-05/);
});
test('I-05 future timestamps quarantined without mutating input',()=>{
 const b=base();b.sources[0].entries.push({name:'bad',value:999,observedAt:'2040-01-01T10:00:00Z'});
 const x=q.preflight(b,'monika',{now:Date.parse('2026-10-12T08:00:00Z')});
 assert.equal(x.quality.droppedFutureMeasurements,1);assert.equal(b.sources[0].entries.length,2);
 assert.equal(x.payload.sources[0].entries.length,1);
});
test('I-05 original PDF consent/page and deduplication',()=>{
 const b=base();
 b.documentEvidence=[
  {type:'original_pdf_extract',documentId:'doc',page:2,title:'Lelet',text:'Dokumentált információ megtalálható'},
  {type:'original_pdf_extract',documentId:'doc',page:2,title:'Lelet',text:'Dokumentált információ megtalálható'}];
 const a=q.preflight(b,'monika');assert.equal(a.payload.documentEvidence.length,0);
 b.originalDocumentsConsent=true;const x=q.preflight(b,'monika');
 assert.equal(x.payload.documentEvidence.length,1);assert.equal(x.quality.rejectedDocuments,1);
});
test('I-05 no personal source fails closed',()=>{
 const b=base();b.sources=[];assert.throws(()=>q.preflight(b,'monika'),/I-05/);
});
test('I-05 routine answer is NOT falsely verified',()=>{
 const p=q.preflight(base(),'monika');
 assert.equal(q.finalAudit('A mért pulzus időpontja a megadott rekordban szerepel.',p,null,false).kind,'preflight_only');
});
test('I-05 clinical answer requires real server audit',()=>{
 const p=q.preflight(base(),'monika');
 assert.throws(()=>q.finalAudit('A klinikai történet megfogalmazott bekezdése.',p,null,true),/szerveroldali/);
 assert.equal(q.finalAudit('A klinikai történet megfogalmazott bekezdése.',p,
 {mode:'clinical-v395',checkedParagraphs:2,unsupportedDates:0},true).kind,'verified_excerpt_audit');
});
test('I-05 clinical audit flags unsupported numbers',()=>{
 const p=q.preflight(base(),'monika');
 assert.equal(q.finalAudit('A klinikai történet megfogalmazott bekezdése.',p,
 {mode:'clinical-v395',checkedParagraphs:2,unsupportedDates:1},true).kind,'limited');
});
test('I-06 natural narrative asks for source-backed chronology',()=>{
 const x=n.guide({mode:'deep',chronology:true},{quality:{originals:2}});
 assert.match(x,/időrendben/);assert.match(x,/orvosnevet/);assert.match(x,/PDF-oldal/);
 assert.ok(x.length<=790);
});
test('I-06 preserves original question and backend 2400-char limit',()=>{
 const b=base();b.question='Mónika kérdése?'+'x'.repeat(1500);
 const a=n.apply(b,'Mónika kérdése?',{mode:'deep',chronology:true},{quality:{originals:1}});
 assert.ok(a.payload.question.startsWith('Mónika kérdése?'));
 assert.ok(a.payload.question.length<=2400);
 assert.equal(b.question.length,1516);
});
test('I-06 rejects cross-identity consent',()=>{
 assert.throws(()=>n.apply({...base(),consent:false},'A kérdésem?',{},{}),/I-06/);
});
const observed=[
 {id:'a',profile:'monika',classification:'measured',type:'systolic_mmhg',value:118,observedAt:time,sourceSystem:'omron'},
 {id:'b',profile:'monika',classification:'measured',type:'diastolic_mmhg',value:76,observedAt:time,sourceSystem:'omron'},
 {id:'c',profile:'monika',classification:'measured',type:'pulse_bpm',value:67,observedAt:'2026-10-11T10:17:00.000Z',sourceSystem:'measurement'},
 {id:'d',profile:'monika',classification:'reported',type:'steps',value:6500,observedAt:'2026-10-11',sourceSystem:'activity-cache'}];
sandbox.window.HH_INTELLIGENCE_LEDGER_V389={
 build:()=>({observations:observed,comparisons:[]})
};
const ctx={profile:'monika'};
const clinical={profile:'monika',manifest:[
 {type:'original_pdf_extract',documentId:'one',title:'Irat 1',date:'2024-06-17',datePrecision:'day',page:1},
 {type:'original_pdf_extract',documentId:'two',title:'Irat 2',date:'2024-06-19',datePrecision:'day',page:3}
]};
test('I-07 source-linked, time-limited correlation with NO causality',()=>{
 const r=c.prepare(base(),ctx,clinical);
 assert.ok(r.links.some(x=>x.kind==='temporally_close_vitals'));
 assert.ok(r.links.some(x=>x.kind==='document_date_index'));
 assert.ok(r.payload.extra.every(x=>!/(biztosan okozza|diagnosztiz)/i.test(x.value)));
 assert.equal(r.quality.causalInference,false);
});
test('I-07 refuses cross-profile mixing',()=>{
 assert.throws(()=>c.prepare(base(),{profile:'zsolt'},clinical),/I-07/);
});
test('I-07 does not infer co-observation from a separate day',()=>{
 sandbox.window.HH_INTELLIGENCE_LEDGER_V389.build=()=>({observations:observed.map(x=>x.type==='pulse_bpm'?
  {...x,observedAt:'2026-10-12T10:17:00Z'}:x),comparisons:[]});
 const r=c.prepare(base(),ctx,clinical);
 assert.ok(!r.links.some(x=>x.kind==='temporally_close_vitals'));
});
console.log('OK '+count+' synthetic intelligence checks');
