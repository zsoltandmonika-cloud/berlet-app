'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'mkb-evidence-audit-v675.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'hh-mkb-facts-admin-v670.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const m={exports:{}};
new Function('module',code)(m);
const {audit}=m.exports;
const sha='a'.repeat(64),text='Explicit original 2024-06-17 evidence';
function input(){
 return {
  facts:[{id:'fact1',profile_key:'monika',source_id:'source1',review_status:'pending'}],
  evidences:[{id:'ev1',fact_id:'fact1',profile_key:'monika',source_id:'source1',
   evidence_role:'supports',page_no:1,excerpt:'original 2024'}],
  sources:[{id:'source1',profile_key:'monika',origin:'google_drive',
   source_kind:'pdf',parse_status:'complete',source_metadata:{},sha256:sha}],
  docs:[{id:'doc1',profile_key:'monika',mkb_source_id:'source1',duplicate_of:null,
   status:'complete',text_integrity_status:'verified',pages_verified:1,total_pages:1,sha256:sha}],
  pages:[{document_id:'doc1',page_no:1,page_text:text,text_sha256:sha}]
 };
}
function run(v,hash=async()=>sha){return audit(v.facts,v.evidences,v.sources,v.docs,v.pages,hash).then(a=>a.get('ev1'))}
test('only matching source/page, SHA and substring attests a still-pending fact',async()=>{
 const row=await run(input());
 assert.equal(row.verified,true);
 assert.match(row.reason,/klinikai/);
});
test('a forged or absent excerpt cannot be labelled technically verified',async()=>{
 let x=input();x.evidences[0].excerpt='not in source';
 assert.equal((await run(x)).verified,false);
 x=input();x.pages=[];
 assert.equal((await run(x)).verified,false);
});
test('fresh digest mismatch fails closed',async()=>{
 assert.equal((await run(input(),async()=> 'b'.repeat(64))).verified,false);
});
test('patient, source, document, status, or page number mismatch fails closed',async()=>{
 const edits=[
  v=>v.evidences[0].profile_key='zsolt',
  v=>v.evidences[0].source_id='other',
  v=>v.facts[0].review_status='rejected',
  v=>v.sources[0].parse_status='failed',
  v=>v.sources[0].source_metadata.ingest_scope='excluded',
  v=>v.docs[0].sha256='b'.repeat(64),
  v=>v.docs[0].status='partial',
  v=>v.docs[0].text_integrity_status='mismatch',
  v=>v.docs[0].duplicate_of='another',
  v=>v.docs[0].pages_verified=0,
  v=>v.evidences[0].page_no=2,
  v=>v.evidences[0].evidence_role='refutes',
  v=>v.sources[0].origin='another',
  v=>v.docs.push({...v.docs[0],id:'ambiguous'})
 ];
 for(const change of edits){
  const v=input();change(v);
  assert.equal((await run(v)).verified,false,change.toString());
 }
});
test('deployment order, profile-scoped read-only QA and explicit medical limitation',()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.doesNotThrow(()=>new Function(admin));
 assert.match(html,/v680-trusted-refresh/);
 assert.ok(html.indexOf('mkb-evidence-audit-v675.js')>html.indexOf('mkb-timeline-v674.js'));
 assert.ok(html.indexOf('mkb-evidence-audit-v675.js')<html.indexOf('hh-mkb-facts-admin-v670.js'));
 const timeline=admin.split('async function showTimeline(){')[1].split('async function scan(){')[0];
 assert.match(timeline,/allowed\(p\)/);
 assert.match(timeline,/guard\(p\)/);
 assert.match(timeline,/auditor\.audit\(facts,evidence,sources,docs,pages,digest\)/);
 assert.match(timeline,/orvosi tartalom szakmai jóváhagyását/i);
 assert.match(timeline,/document\.createElement\('details'\)/);
 assert.match(timeline,/textContent/);
 assert.doesNotMatch(timeline,/(?:method:\s*'(POST|PATCH|DELETE)'|localStorage\.setItem)/);
});