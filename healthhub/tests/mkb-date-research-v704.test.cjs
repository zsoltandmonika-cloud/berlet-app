#!/usr/bin/env node
'use strict';
// Synthetic only. No real patient records, document bytes, credentials or network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..');
const load=(s)=>fs.readFileSync(path.join(base,s),'utf8');
function moduleFrom(s){const module={exports:{}};new Function('module',load(s))(module);return module.exports}
const ranker=moduleFrom('mkb-evidence-i10-v698.js');
const index=moduleFrom('mkb-full-index-v699.js');
const packer=moduleFrom('mkb-ai-context-v677.js');
const sum=(s)=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const uuid=(i)=>'11111111-1111-4111-8111-'+String(i).padStart(12,'0');
function evidence(){
 const docs=[],sources=[],pages=[];
 for(let i=1;i<=18;i++){
  const iso=i===3?'2024-06-17':i<8?'2024-06-18':'2024-12-01';
  const content=i===3?('Kórházi anamnézis. Diagnózis: szintetikus példa. Ellátási előzmény és dokumentáció. ').repeat(8):
    ('Vizsgálat, kardiológiai kontroll és kórházi lelet szintetikus adatokkal. ').repeat(8);
  const hash=sum('mock-pdf-'+i);
  docs.push({id:uuid(i),mkb_source_id:uuid(i+100),profile_key:'monika',
    status:'complete',text_integrity_status:'verified',sha256:hash,
    pages_verified:1,total_pages:1,duplicate_of:null});
  sources.push({id:uuid(i+100),profile_key:'monika',source_kind:'pdf',
    origin:'google_drive',parse_status:'complete',sha256:hash,
    source_metadata:{ingest_scope:'included'},original_name:iso+' - '+(i===3?'Kórházi zárójelentés':'Vizsgálat '+i)+'.pdf',
    original_observed_at:'2026-10-08T12:00:00Z',duplicate_of:null});
  pages.push({document_id:uuid(i),page_no:1,page_text:content,text_sha256:sum(content)});
 }
 return {docs,sources,pages};
}
test('Hungarian historic date is normalized to the exact calendar day',()=>{
 assert.equal(ranker.questionDay('Mi történt Mónikával 2024 junius 17 .én?'),'2024-06-17');
 assert.equal(ranker.questionDay('Mi történt 2024. június 17-én?'),'2024-06-17');
 assert.equal(ranker.questionDay('2024-06-17'),'2024-06-17');
 assert.equal(ranker.questionDay('2024 február 30'),'');
 assert.equal(ranker.questionDay('Mi történt aznap?'),'');
});
test('2024-06-17 PDF takes priority over more recent matching 2024 PDF',async()=>{
 const data=evidence(),catalog=index.catalog(data.docs,data.sources,'monika');
 const query='Mi történt Mónikával 2024 junius 17 .én?';
 const ranked=await index.rankPages(catalog,data.pages,query,async x=>sum(x),ranker);
 assert.equal(ranked.documents,18);
 assert.ok(ranked.selected.length>=1);
 assert.equal(ranked.selected[0].title,'2024-06-17 - Kórházi zárójelentés.pdf');
 assert.equal(ranked.selected[0].date,'2024-06-17');
 assert.equal(ranked.selected[0].dateKind,'source_filename');
 assert.equal(ranked.selected[0].review,'pending');
 assert.ok(!JSON.stringify(ranked).includes('page_text'));
});
test('PDF filename date remains metadata, never an asserted event time',async()=>{
 const data=evidence(),ranked=await index.rankPages(index.catalog(data.docs,data.sources,'monika'),data.pages,
  'Mi történt Mónikával 2024 június 17-én?',async x=>sum(x),ranker);
 const request={schema:'healthhub.ask-lena/1',consent:true,profile:'monika',
  question:'Mi történt Mónikával 2024 június 17-én?',sources:[{id:'records',title:'Kórlapok',status:'ready',entries:[{name:'A',value:'B'}]}],
  extra:[],documentEvidence:[],originalDocumentsConsent:false};
 const result=packer.pack(request,'monika',[ranked.selected[0]],request.question);
 assert.equal(result.added,1);
 assert.equal(result.originalExcerpts,1);
 assert.equal(result.payload.originalDocumentsConsent,true);
 assert.match(result.payload.extra[0].value,/PDF-fájlnév dátuma \(nem eseménydátum\)/);
 assert.match(result.payload.documentEvidence[0].title,/PDF-dátum nem feltétlen eseménydátum/);
 const rejected=packer.pack(request,'zsolt',[ranked.selected[0]],request.question);
 assert.equal(rejected.added,undefined); // mismatched profile is rejected before forwarding
});
test('Ask Léna source-free dated history is stopped before an ungrounded answer',()=>{
 const src=load('live-v331.js');
 assert.match(src,/var asksHistoricalEvent=/);
 assert.match(src,/if\(\(asksOwnDocument\|\|asksHistoricalEvent\)\&\&researchPlan\.clinical\&\&!verifiedOriginals\.length\)/);
 assert.match(src,/mkbQAMode=mkbQARequested\&\&mkbSourceUsed>0\&\&data\.originalDocumentsConsent===true/);
 assert.match(load('ask-lena-mkb-v676.js'),/approved=prepared;run\.click\(\)/);
});
