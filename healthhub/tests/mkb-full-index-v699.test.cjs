'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const load=name=>fs.readFileSync(path.join(base,name),'utf8');
const index=load('index.html'),fullCode=load('mkb-full-index-v699.js'),relevanceCode=load('mkb-evidence-i10-v698.js');
const sourceUI=load('ask-lena-mkb-v676.js'),chatUI=load('ask-lena-chat-enhance-v566.js');
function moduleFrom(src){const module={exports:{}};new Function('module',src)(module);return module.exports}
const full=moduleFrom(fullCode),ranker=moduleFrom(relevanceCode);
const sum=s=>createHash('sha256').update(s,'utf8').digest('hex');
const uuid=i=>'11111111-1111-4111-8111-'+String(i).padStart(12,'0');
function mock(profile,n,start=1){
 const documents=[],sources=[],pages=[];
 for(let i=0;i<n;i++){
  const id=start+i,doc=uuid(id),source=uuid(1000+id),hash=sum('raw PDF original '+id);
  sources.push({id:source,profile_key:profile,source_kind:'pdf',origin:'google_drive',
   parse_status:'complete',sha256:hash,source_metadata:{ingest_scope:'included'},
   original_name:id===12?'Entresto kardiológiai javaslat.pdf':'Labor '+id+'.pdf',
   original_observed_at:'2026-10-16T12:45:00Z',duplicate_of:null});
  documents.push({id:doc,mkb_source_id:source,profile_key:profile,
   status:'complete',text_integrity_status:'verified',sha256:hash,
   pages_verified:1,total_pages:1,duplicate_of:null});
  const text='Az eredeti dokumentumban szereplő ellenőrizhető szöveges forrás. '+
   (id===12?'Entresto adagolási javaslat és szívbetegség. ':'Vizeletvizsgálati laboreredmény. ')+
   String(id).repeat(9);
  pages.push({document_id:doc,page_no:1,page_text:text,text_sha256:sum(text)});
 }
 return{documents,sources,pages};
}
test('v699 asset order and one-click reset are loaded with explicit cache keys',()=>{
 for(const source of [fullCode,relevanceCode,sourceUI,chatUI])assert.doesNotThrow(()=>new Function(source));
 assert.match(index,/v699-full-medical-source-catalog/);
 assert.match(index,/mkb-full-index-v699\.js\?v=699-verified-patient-catalog/);
 assert.ok(index.indexOf('mkb-evidence-i10-v698.js')<index.indexOf('mkb-full-index-v699.js'));
 assert.ok(index.indexOf('mkb-full-index-v699.js')<index.indexOf('ask-lena-mkb-v676.js'));
 assert.match(sourceUI,/id='hhAskMkbClear699'/);
 assert.match(sourceUI,/clear\.addEventListener\('click',clearForNewResearch\)/);
 assert.match(sourceUI,/if\(run&&run\.disabled\)return/);
 assert.match(sourceUI,/version\+\+;prepared=null;approved=null/);
 assert.match(sourceUI,/hhMkbCatalogSearch699/);
 assert.match(sourceUI,/hhAskMkbAnalysis699/);
 assert.match(sourceUI,/run\.click\(\)/);
 assert.doesNotMatch(sourceUI,/hhAskMkbUse677|\.type='checkbox'/);
});
test('catalog includes all 164 eligible Mónika and all 43 Zsolt originals, never intermixing patients',()=>{
 const m=mock('monika',164),z=mock('zsolt',43,300),rows=m.documents.concat(z.documents),
  origins=m.sources.concat(z.sources);
 assert.equal(full.catalog(rows,origins,'monika').length,164);
 assert.equal(full.catalog(rows,origins,'zsolt').length,43);
 assert.equal(full.catalog(rows,origins,'monika').filter(x=>x.profile==='zsolt').length,0);
 assert.equal(full.filterCatalog(full.catalog(rows,origins,'monika'),'Entresto').length,1);
 assert.equal(full.filterCatalog(full.catalog(rows,origins,'monika'),'').length,164);
});
test('excluded/unverified/wrong-profile/duplicate sources never enter catalog',()=>{
 const a=mock('monika',4),b=mock('zsolt',1,900);
 a.sources[0].source_metadata.ingest_scope='excluded';
 a.sources[1].sha256='a'.repeat(64);
 a.documents[2].text_integrity_status='mismatch';
 a.documents[3].duplicate_of=a.documents[2].id;
 assert.equal(full.catalog(a.documents.concat(b.documents),a.sources.concat(b.sources),'monika').length,0);
 assert.equal(full.catalog(a.documents.concat(b.documents),a.sources.concat(b.sources),'zsolt').length,1);
});
test('relevant historical original pages beat unrelated newer titles; 5 excerpts maximum',async()=>{
 const a=mock('monika',164),rows=full.catalog(a.documents,a.sources,'monika');
 const r=await full.rankPages(rows,a.pages,'Milyen Entresto adagolást javasoltak?',async s=>sum(s),ranker);
 assert.equal(r.documents,164);assert.equal(r.eligiblePages,164);
 assert.ok(r.selected.length>0&&r.selected.length<=5);
 assert.match(r.selected[0].title,/Entresto/);
 assert.equal(r.selected[0].review,'pending');
 assert.equal(r.selected[0].dateKind,'source_metadata');
 assert.equal(r.selected[0].quote,a.pages[11].page_text.slice(0,400));
 assert.equal(JSON.stringify(r).includes('_fullText'),false);
});
test('tampered page hash is never forwarded, next candidate may still be used',async()=>{
 const a=mock('monika',25),rows=full.catalog(a.documents,a.sources,'monika');
 a.pages[11].text_sha256='f'.repeat(64);
 const r=await full.rankPages(rows,a.pages,'Entresto adagolás',async s=>sum(s),ranker);
 assert.equal(r.integrityRejected,1);
 assert.equal(r.selected.some(x=>x.title.includes('Entresto')),false);
});
test('one-tap explicit research is the only consent, bound to actual current question',()=>{
 assert.match(sourceUI,/approved=prepared;run\.click\(\)/);
 assert.match(sourceUI,/var cache=prepared,granted=!!\(cache&&approved===cache\)/);
 assert.match(sourceUI,/cache\.question!==String\(question\|\|''\)\.trim\(\)/);
 assert.match(sourceUI,/Date\.now\(\)-cache\.at>5\*60\*1000/);
 assert.match(sourceUI,/window\.addEventListener\('healthhub:profile-changed',reset\)/);
 assert.match(sourceUI,/window\.addEventListener\('healthhub:central-auth-changed',reset\)/);
 assert.match(sourceUI,/run&&run\.disabled/);
});
test('quick questions are profile-local, editable, scrollable, with no silent transmission',()=>{
 assert.match(chatUI,/hh-ask-quick-v699-/);
 assert.match(chatUI,/function profile\(\)/);
 assert.match(chatUI,/id='hhChat566Wheel699'/);
 assert.match(chatUI,/hhChat566Edit/);
 assert.match(chatUI,/hhChat566QuickChoice/);
 assert.match(chatUI,/store\(state\.p,rows\)/);
 assert.match(chatUI,/localStorage\.setItem\(key\(p\),JSON\.stringify\(xs\)\)/);
 assert.doesNotMatch(chatUI,/fetch\(|\\.stream\(|\\.request\(|hh_ask_lena_history/);
});
test('relevance catalog never mutates PDFs, medicine list, knowledge facts or AI history',()=>{
 assert.doesNotMatch(fullCode,/fetch\(|\\.request\(|\\.stream\(|localStorage\.setItem|indexedDB|DELETE|POST|PUT|PATCH/);
 assert.doesNotMatch(fullCode,/hh_mkb_facts|hh_kb_documents|hh_kb_pages|hh_ask_lena_history/);
 assert.match(sourceUI,/fetchPages\(p,v,'hh_kb_documents'/);
 assert.match(sourceUI,/fetchPages\(p,v,'hh_kb_pages'/);
 assert.match(sourceUI,/fullIndex\.catalog\(docs,sources,p\)/);
 assert.match(sourceUI,/fullIndex\.rankPages\(catalog,pages,question,digest,ranker\)/);
});
