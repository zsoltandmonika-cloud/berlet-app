// HealthHub Clinical Intelligence I-04: no real medical records used.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{},console,Date,Map,Intl};
vm.runInNewContext(fs.readFileSync('healthhub/live-v391-clinical.js','utf8'),sandbox);
const engine=sandbox.window.HH_CLINICAL_EVIDENCE_V391;
const now=Date.parse('2026-10-11T17:00:00+02:00');
const summary=(id='doc-001',date='2024-06-17')=>({
 type:'json_summary',documentId:id,title:'Kórházi zárójelentés '+id,
 date,datePrecision:'day',uploadDate:'2026-08-20T12:20:00+02:00',
 datesMentioned:['2024-06-17','2024-06-24'],text:'Korábbi, nem hitelesített JSON-összefoglaló. Az eredeti PDF tartalma itt nem ellenőrzött.'});
const pdf=(id='doc-001',date='2024-06-17')=>({
 ...summary(id,date),type:'original_pdf_extract',page:3,
 text:'A kinyert eredeti PDF-hivatkozás harmadik oldalának szintetikus adata. A konkrét esemény nem igazol diagnózist.'});
function ctx(p='monika'){return{profile:p,medications:[{name:'Példakészítmény A',strength:'5 mg',schedule:'este',status:''},{name:'Példakészítmény B',status:'aktívnak jelölt'}]}}
function request(profile='monika',doc=[summary(),pdf()]){
 return {schema:'healthhub.ask-lena/1',profile,consent:true,
  question:'Mit mutatnak a korábbi leletek?',originalDocumentsConsent:true,
  sources:[],extra:[],documentEvidence:doc};
}
{
 const req=request(),snapshot=JSON.stringify(req),c=ctx();
 const report=engine.assemble(req,c,{now,expectedProfile:'monika'});
 assert.equal(report.profile,'monika');
 assert.equal(report.quality.originals,1);
 assert.equal(report.quality.summaries,1);
 assert.equal(report.quality.medications,2);
 assert.equal(report.payload.documentEvidence.length,2);
 assert.ok(report.manifest.some(x=>x.type==='original_pdf_extract'&&x.page===3));
 assert.ok(report.manifest.some(x=>x.type==='json_summary'&&x.trust.includes('JSON')));
 assert.ok(report.medications[0].status.includes('nincs megerősített'));
 assert.ok(report.warnings.some(x=>x.includes('nem igazolt gyógyszeregyeztetés')));
 assert.ok(report.payload.extra.some(x=>x.domain==='documents'&&x.label.includes('I-04')));
 assert.equal(JSON.stringify(req),snapshot,'source request must never be mutated');
 assert.equal(JSON.stringify(c),JSON.stringify(ctx()),'medication records unchanged');
 assert.ok(JSON.stringify({sources:report.payload.sources,extra:report.payload.extra}).length<19000);
}
{
 const req=request('monika',[summary(),pdf()]);
 req.originalDocumentsConsent=false;
 const report=engine.assemble(req,ctx(),{now});
 assert.equal(report.quality.originals,0);
 assert.equal(report.quality.summaries,1);
 assert.equal(report.quality.rejected,1);
 assert.ok(report.payload.documentEvidence.every(x=>x.type==='json_summary'));
 assert.equal(report.payload.originalDocumentsConsent,false);
 assert.ok(report.warnings.some(x=>x.includes('nem engedélyezett')));
}
{
 const report=engine.assemble(request('monika',[
  pdf('event-001','2024-03-11'),pdf('event-002','2024-10-02'),pdf('event-001','2024-03-11')
 ]),ctx(),{now});
 assert.equal(report.quality.originals,2,'separate clinical events in same year retained');
 assert.equal(report.quality.rejected,1,'duplicate original extract rejected');
 assert.equal(report.manifest[0].date,'2024-03-11');
 assert.equal(report.manifest[1].date,'2024-10-02');
 assert.notEqual(report.manifest[0].documentId,report.manifest[1].documentId);
}
{
 const req=request('monika',[summary('unknown-date','2024-02-31')]);
 const report=engine.assemble(req,ctx(),{now});
 assert.equal(report.manifest[0].date,'');
 assert.ok(report.manifest[0].dateMeaning.includes('nincs igazolva'));
 assert.ok(report.warnings.some(x=>x.includes('dátuma nem ellenőrizhető')));
}
{
 const req=request('monika',[pdf()]);
 req.documentEvidence[0].page=0;
 const report=engine.assemble(req,ctx(),{now});
 assert.equal(report.quality.originals,0);
 assert.equal(report.quality.rejected,1);
}
{
 const req=request('monika',[summary('upload-only','')]);
 req.documentEvidence[0].date='';
 req.documentEvidence[0].datePrecision='unknown';
 const report=engine.assemble(req,ctx(),{now});
 assert.equal(report.manifest[0].date,'');
 assert.ok(report.manifest[0].dateMeaning.includes('nem igazolva'));
 assert.ok(report.payload.documentEvidence[0].uploadDate);
}
{
 assert.throws(()=>engine.assemble(request('monika'),ctx('zsolt'),{now}),/profil/);
 assert.throws(()=>engine.assemble(request('monika'),ctx(),{now,expectedProfile:'zsolt'}),/profilváltás/);
 assert.throws(()=>engine.assemble({...request(),consent:false},ctx(),{now}),/jóváhagyás/);
 const req=request('zsolt',[]),report=engine.assemble(req,ctx('zsolt'),{now});
 assert.equal(report.quality.sourceCount,0);
 assert.ok(report.warnings.some(x=>x.includes('nem érkezett eredeti lelet')));
}
console.log('PASS I-04: explicit PDF consent, dates versus upload, page proof, separate events, med status, profile and nonmutation');
