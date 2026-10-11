// Synthetic HealthHub v393 adaptive research and original-document retrieval regressions.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const files={};let active='m',allowPdf=true,ctx=null,readCalls=[],screen=[],docs={};
function request(v){
 const q={};
 Promise.resolve().then(function(){q.result=v;if(q.onsuccess)q.onsuccess()});
 return q;
}
const database={
 objectStoreNames:{contains:function(n){return ['documents','documentBlobs'].includes(n)}},
 transaction:function(){return {objectStore:function(n){return {get:function(id){
  if(n==='documents')return request(docs[id]&&docs[id].metadata||undefined);
  return request(docs[id]&&docs[id].file?{blob:docs[id].file}:undefined);
 }}}}},
 close:function(){}
};
const documentStub={getElementById:function(){return null}};
const ctxSandbox={
 console,Blob,Uint8Array,Promise,Date,Set,Map,
 document:documentStub,
 localStorage:{
  getItem:function(k){if(k==='hh-profile')return active;
   if(k.startsWith('hh-ask-original-excerpts-allowed'))return allowPdf?'yes':'no';
   return null}
 },
 indexedDB:{open:function(){return request(database)}},
 window:{
  addEventListener:function(){},
  hhRefreshLenaHealthContext289:async function(){},
  hhGetLenaHealthContext289:function(p){return p==='monika'?ctx:null},
  pdfjsLib:{
   getDocument:function(){return {promise:Promise.resolve({
    numPages:18,
    getPage:async function(p){readCalls.push(p);return {
     getTextContent:async function(){return{items:[
      {str:p===15?'2024. június 17. OMSZ mentő CPR defibrilláció ROSC újraélesztés. ':'2024. kórházi ellátás részletei. '},
      {str:'Szintetikus szöveg minden klinikai adat nélkül. '.repeat(7)}
     ]}}
    }},
    destroy:function(){}
   })}}
  }
 },
 fetch:async function(){throw Error('No network access allowed by test')}
};
vm.createContext(ctxSandbox);
for(const p of ['healthhub/live-v393-research.js','healthhub/live-v364-evidence.js'])
 vm.runInContext(fs.readFileSync(p,'utf8'),ctxSandbox,{filename:p});
const plan=ctxSandbox.window.HH_DEEP_RESEARCH_V393;
const evid=ctxSandbox.window.HH_ASK_LENA_EVIDENCE_V364;
function doc(id,date,p='monika'){
 return {id,profile:p,title:'OMSZ intenzív osztályos zárójelentés '+id+' 2024',
  category:'intenzív ellátás',date,dateSource:'document',
  uploadedAt:'2026-10-01T12:20:00+02:00',
  explanation:{summary:'Korábbi másodlagos magyarázat a kórházi történésekről. '.repeat(3)}}}
function prepareFixtures(){
 ctx={profile:'monika',documents:{index:[doc('A','2024-06-17'),doc('B','2024-07-05'),
  doc('C','2024-07-13','zsolt')]}};
 docs={
 A:{metadata:{id:'A',profile:'monika'},file:new Blob(['%PDF-1.4 original A'],{type:'application/pdf'})},
 B:{metadata:{id:'B',profile:'monika'},file:new Blob(['%PDF-1.4 original B'],{type:'application/pdf'})},
 C:{metadata:{id:'C',profile:'zsolt'},file:new Blob(['%PDF-1.4 original C'],{type:'application/pdf'})}
 };
}
(async()=>{
 const question='Mikor érkeztek a mentők 2024. június 17-én és mi történhetett a szívmegállástól a kómáig? Kérem a leletekkel igazolt pontos időrendet és a hiányzó adatokat is.';
 const mode=plan.decide(question);
 assert.equal(mode.mode,'deep');
 assert.equal(mode.documents,true);
 assert.ok(mode.pagesPerDocument>12,'deep mode must inspect more than the first 12 pages');
 const a=plan.apply({schema:'healthhub.ask-lena/1',profile:'monika',consent:true,extra:[]},question,
  {quality:{originals:0,summaries:3}},mode);
 assert.ok(a.payload.question.includes('eredeti kivonatok hiánya nem azonos az esemény dokumentálatlanságával'),'missing source text must not be conflated with missing clinical documentation');
 assert.ok(a.payload.question.includes('NE')||a.payload.question.includes('ne '),'prompt contains safety limits');
 assert.ok(a.payload.question.includes('Mikor érkeztek'));
 assert.equal(a.payload.depth,'detailed');
 assert.ok(a.payload.question.length<=1900);
 assert.equal(plan.decide('Mennyi lépésem volt ma?').mode,'standard');
 assert.equal(plan.decide('Mennyi lépésem volt ma?').documents,false);
 assert.throws(()=>plan.apply({profile:'zsolt',consent:false},question,null),/hozzájárulás/);

 prepareFixtures();allowPdf=true;readCalls=[];
 const before=JSON.stringify(ctx);
 const res=await evid.prepare(question,'monika',{plan:mode});
 assert.equal(res.diagnostics.status,'original_pages_available');
 assert.ok(res.originals>=2,'original PDF excerpts must be available when metadata/permission is correct');
 assert.ok(res.originals<=12,'bound original extracts');
 assert.ok(res.summaries>=1);
 assert.ok(res.items.length<=8);
 assert.ok(res.items.some(x=>x.type==='original_pdf_extract'&&x.page===15),
  'critical relevant page 15 must not be skipped');
 assert.ok(res.items.every(x=>x.documentId!=='C'),'exclude other patient even if index accidentally includes it');
 assert.equal(res.diagnostics.attempted,2);
 assert.ok(res.diagnostics.pagesScanned>=30,'both eligible PDF files covered to deep 18-page limit');
 assert.ok(res.items.some(x=>x.date==='2024-06-17'));
 assert.ok(res.items.some(x=>x.date==='2024-07-05'));
 assert.equal(JSON.stringify(ctx),before,'source clinical context must not be changed');
 assert.equal(readCalls.length,36);

 allowPdf=false;readCalls=[];
 const noConsent=await evid.prepare(question,'monika',{plan:mode});
 assert.equal(noConsent.originals,0);
 assert.equal(noConsent.diagnostics.status,'no_original_consent');
 assert.equal(readCalls.length,0);
 assert.equal(noConsent.originalConsent,false);
 assert.ok(noConsent.summaries>=1);
 assert.ok(noConsent.diagnostics.missing.includes('original_pdf_consent_disabled'));

 allowPdf=true;docs.A.metadata.profile='zsolt';
 const mismatch=await evid.prepare(question,'monika',{plan:mode});
 assert.ok(mismatch.diagnostics.missing.includes('profile_mismatch'));
 assert.ok(mismatch.items.filter(x=>x.type==='original_pdf_extract').every(x=>x.documentId!=='A'));

 active='z';await assert.rejects(()=>evid.prepare(question,'monika',{plan:mode}),/Profilváltás/);
 console.log('PASS v393: general depth, source date, 18-page PDF, clinical provenance, strict profiles and explicit PDF permission');
})().catch(e=>{console.error(e);process.exitCode=1});