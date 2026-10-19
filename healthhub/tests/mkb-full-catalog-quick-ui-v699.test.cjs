'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const catalogSrc=read('mkb-full-index-v699.js'),rankSrc=read('mkb-evidence-i10-v698.js'),
 panel=read('ask-lena-mkb-v676.js'),quick=read('ask-lena-chat-enhance-v566.js'),
 historyLocal=read('live-v342.js'),historyCloud=read('live-v364-history.js'),
 compact=read('live-v340.js'),css=read('ask-lena-chat-glass-v566.css'),index=read('index.html');
const load=code=>{const module={exports:{}};new Function('module',code)(module);return module.exports;};
const full=load(catalogSrc),ranker=load(rankSrc),sha=s=>createHash('sha256').update(s).digest('hex');
const uuid=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
function fixture(n,p='monika'){
 const documents=[],sources=[],pages=[];
 for(let i=1;i<=n;i++){
  const hash=sha('ORIGINAL PDF '+p+i),sourceId=uuid(3000+i),id=uuid(4000+i);
  const title=i===42?'Entresto adagolás.pdf':'Lelet '+i+'.pdf';
  const count=p==='monika'&&i<=105?2:1;
  sources.push({id:sourceId,profile_key:p,origin:'google_drive',source_kind:'pdf',
   parse_status:'complete',source_metadata:{ingest_scope:'included'},
   sha256:hash,original_name:title,original_observed_at:'2026-10-16T11:00:00Z',duplicate_of:null});
  documents.push({id,profile_key:p,mkb_source_id:sourceId,sha256:hash,duplicate_of:null,
   status:'complete',text_integrity_status:'verified',total_pages:count,pages_verified:count});
  for(let pg=1;pg<=count;pg++){
   const text=(i===42?'Entresto dózis 24/26 mg szakorvosi javaslat. ':'Szimulált orvosi vizsgálat. ').repeat(5);
   pages.push({document_id:id,page_no:pg,page_text:text,text_sha256:sha(text)});
  }
 }
 return {documents,sources,pages};
}
test('v699 loads full catalog before one-click research and compact UI',()=>{
 for(const c of [catalogSrc,rankSrc,panel,quick,historyLocal,historyCloud,compact])
  assert.doesNotThrow(()=>new Function(c));
 assert.match(index,/v699-full-medical-source-catalog/);
 assert.match(index,/mkb-full-index-v699\.js\?v=699-verified-patient-catalog/);
 assert.ok(index.indexOf('mkb-full-index-v699.js')<index.indexOf('ask-lena-mkb-v676.js'));
 assert.match(panel,/fullIndex\.catalog\(docs,sources,p\)/);
 assert.match(panel,/fullIndex\.rankPages\(catalog,pages,question,digest,ranker\)/);
});
test('all 164 patient originals and 269 pages appear; 43 Zsolt remain separate',()=>{
 const m=fixture(164),z=fixture(43,'zsolt');
 const docs=[...m.documents,...z.documents],sources=[...m.sources,...z.sources];
 const monika=full.catalog(docs,sources,'monika'),zsolt=full.catalog(docs,sources,'zsolt');
 assert.equal(monika.length,164);assert.equal(zsolt.length,43);
 assert.equal(m.pages.length,269);assert.equal(z.pages.length,43);
 assert.equal(full.filterCatalog(monika,'').length,164);
 assert.equal(full.filterCatalog(monika,'Entresto').length,1);
 assert.ok(monika.every(x=>x.profile==='monika'));
});
test('exclusion, wrong hash, wrong profile and incomplete PDF fail closed',()=>{
 const m=fixture(4),z=fixture(1,'zsolt');
 m.sources[0].source_metadata.ingest_scope='excluded';
 m.documents[1].sha256='f'.repeat(64);
 m.documents[2].pages_verified=0;
 assert.equal(full.catalog([...m.documents,...z.documents],[...m.sources,...z.sources],'monika').length,1);
 assert.equal(full.catalog([...m.documents,...z.documents],[...m.sources,...z.sources],'zsolt').length,1);
});
test('relevant older PDF page wins after SHA check; no full source text leaks to AI',async()=>{
 const f=fixture(164),rows=full.catalog(f.documents,f.sources,'monika');
 const r=await full.rankPages(rows,f.pages,'Milyen Entresto dózis szerepel a leletemen?',sha,ranker);
 assert.equal(r.documents,164);assert.equal(r.eligiblePages,269);
 assert.equal(r.selected[0].title,'Entresto adagolás.pdf');
 assert.ok(r.selected.length>=1&&r.selected.length<=5);
 assert.ok(r.selected.every(x=>x.review==='pending'&&!('_fullText' in x)&&!('_expected' in x)));
 assert.ok(r.selected.every(x=>x.dateKind==='source_metadata'));
});
test('tampered high-scoring PDF page is never forwarded',async()=>{
 const f=fixture(164);f.pages.find(x=>x.document_id===uuid(4042)).text_sha256='f'.repeat(64);
 const r=await full.rankPages(full.catalog(f.documents,f.sources,'monika'),f.pages,'Entresto adagolás',sha,ranker);
 assert.ok(r.integrityRejected>0);
 assert.ok(r.selected.every(x=>!(x.title==='Entresto adagolás.pdf'&&x.page===1)));
 assert.ok(r.selected.some(x=>x.title==='Entresto adagolás.pdf'&&x.page===2));
});
test('quick questions are per-profile, editable, scrollable and never auto-submit',()=>{
 assert.match(quick,/hh-ask-quick-v699-/);
 assert.match(quick,/function profile\(\)/);
 assert.match(quick,/hhChat566Suggestions/);
 assert.match(quick,/question|q\.value=t/);
 assert.match(quick,/state\.rows=rows/);
 assert.match(quick,/Törlés/);
 assert.match(quick,/Alapértelmezett/);
 assert.match(css,/max-height:152px!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.doesNotMatch(quick,/hhRun299.*click\(|HH_DAILY_HEALTH_SYNC|fetch\(|request\(/);
});
test('composer shrunk, textarea internally scrollable, send remains mounted',()=>{
 assert.match(compact,/height:190px;min-height:190px;display:flex/);
 assert.match(compact,/height:82px!important;min-height:78px!important;max-height:110px!important/);
 assert.match(compact,/Math\.max\(78,Math\.min\(q\.scrollHeight,110\)\)/);
 assert.match(compact,/toolbar\.appendChild\(mic\);toolbar\.appendChild\(send\)/);
 assert.match(css,/max-height:110px!important;overflow-y:auto!important/);
});
test('both Ask histories skip redundant render and never flash loading on every refresh',()=>{
 assert.match(historyLocal,/hhHistoryRenderedFingerprint/);
 assert.match(historyLocal,/hhHistoryRenderedProfile===p/);
 assert.match(historyLocal,/list\.scrollTop=preservedScroll/);
 assert.match(historyLocal,/if\(!list\.dataset\.hhHistoryRenderedProfile&&!list\.children\.length\)/);
 assert.match(historyCloud,/hhHistoryRenderSignature===signature/);
 assert.match(historyCloud,/if\(current&&current\.textContent!==statusText\)/);
 assert.match(historyCloud,/if\(prevProfile===p\)list\.scrollTop=scroll/);
 assert.match(historyCloud,/if\(list\.children\[i\]!==row\)list\.insertBefore/);
 assert.doesNotMatch(historyCloud,/box\.innerHTML=/);
});
test('new-research reset preserves actual patient archives and honors live generation guard',()=>{
 assert.match(panel,/clear\.id='hhAskMkbClear699'/);
 assert.match(panel,/clear\.addEventListener\('click',clearForNewResearch\)/);
 assert.match(panel,/if\(run&&run\.disabled\)return/);
 assert.match(panel,/version\+\+;prepared=null;approved=null;busy=false/);
 assert.match(panel,/cache\.question!==String\(question\|\|''\)\.trim\(\)/);
 assert.match(panel,/approved=prepared;run\.click\(\)/);
 assert.doesNotMatch(panel,/type='checkbox'/);
 assert.doesNotMatch(panel,/localStorage\.setItem|indexedDB\.deleteDatabase|deleteDatabase/);
});
