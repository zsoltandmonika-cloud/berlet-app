'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const engineText=fs.readFileSync(path.join(root,'mkb-evidence-i10-v698.js'),'utf8');
const lens=fs.readFileSync(path.join(root,'ask-lena-mkb-v676.js'),'utf8');
const packer=fs.readFileSync(path.join(root,'mkb-ai-context-v677.js'),'utf8');
const assistant=fs.readFileSync(path.join(root,'live-v331.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const em={exports:{}};new Function('module',engineText)(em);
const engine=em.exports;
const pm={exports:{}};new Function('module',packer)(pm);
const {pack}=pm.exports;
const id=(i)=>'11111111-1111-4111-8111-'+String(i).padStart(12,'0');
const excerpt=(s)=>s+' · dokumentált, ellenőrzött szöveges forrásidézet';
const row=(i,more={})=>({
 date:'2026-09-'+String(i+10).padStart(2,'0'),title:'Kiegészítő lelet '+i,
 source:'test-'+i+'.pdf',sourceId:id(i),page:1,quote:excerpt('Szintetikus'),
 review:'pending',factType:'measurement',valueNumber:null,originalUnit:'',...more
});
const request={schema:'healthhub.ask-lena/1',consent:true,profile:'monika',
 sources:[{id:'vitals',entries:[{key:'pulse',value:'63'}]}],extra:[],documentEvidence:[],originalDocumentsConsent:false};
test('v698 modules parse and load before consent, question and live build keys agree',()=>{
 for(const s of [engineText,lens,packer,assistant])assert.doesNotThrow(()=>new Function(s));
 assert.match(index,/v698-evidence-relevance-intelligence/);
 assert.match(index,/var v='698-evidence-relevance-intelligence'/);
 assert.match(index,/mkb-evidence-i10-v698\.js\?v=698-question-relevance/);
 assert.match(index,/ask-lena-mkb-v676\.js\?v=698-question-bound-one-shot/);
 assert.match(index,/mkb-ai-context-v677\.js\?v=698-discrepancy-guard/);
 assert.match(index,/live-v331\.js\?v=698-question-bound-sources/);
 assert.ok(index.indexOf('mkb-evidence-audit-v675.js')<index.indexOf('mkb-evidence-i10-v698.js'));
 assert.ok(index.indexOf('mkb-evidence-i10-v698.js')<index.indexOf('ask-lena-mkb-v676.js'));
});
test('older matching source beats more recent irrelevant source, no new sources added',()=>{
 const rows=[row(0,{date:'2024-06-17',title:'Entresto adagolási javaslat',
 quote:excerpt('Entresto 24/26')}),
  row(1,{date:'2026-10-16',title:'Egyéb laboratóriumi lelet',
 quote:excerpt('Vizelet kémiai paraméterek')}),
  row(2,{date:'2026-10-17',title:'Beutaló'})];
 const result=engine.rank(rows,'Milyen Entresto adagolási javaslatom volt?');
 assert.equal(result.selected[0].title,'Entresto adagolási javaslat');
 assert.equal(result.count,3);
 assert.equal(result.relevant,1);
 assert.equal(result.selected.length,3);
 assert.equal(result.mode,'read_only_relevance_not_diagnosis');
 assert.equal(rows[0].relevanceScore,undefined);
});
test('Hungarian diacritics, medical synonyms and no-question state are deterministic',()=>{
 assert.deepEqual(engine.tokens('Miért vagyok fáradtság miatt kimerült?'),['faradtsag','miatt','kimerult']);
 const res=engine.rank([row(0,{title:'Fáradékonyság és alvásnapló'})],
  'Mostanában fáradtságot érzek');
 assert.equal(res.selected.length,1);
 assert.ok(res.selected[0].relevanceScore>0);
 assert.equal(res.questionReady,true);
 assert.equal(engine.rank([row(0)],'').questionReady,false);
});
test('same-day numeric differences from distinct sources are noticed without selecting truth',()=>{
 const one=row(1,{date:'2026-10-16',title:'Ejekciós frakció',factType:'cardiology',
  valueNumber:55,originalUnit:'%',sourceId:id(1)});
 const two=row(2,{date:'2026-10-16',title:'Ejekciós frakció',factType:'cardiology',
  valueNumber:57,originalUnit:'%',sourceId:id(2)});
 const report=engine.rank([one,two],'Mennyi az ejekciós frakció EF értéke?');
 assert.equal(report.conflictSignals,2);
 assert.equal(report.selected.filter(r=>r.caution).length,2);
 assert.match(report.selected[0].caution,/Nem dönthető el automatikusan/);
 assert.equal(one.caution,undefined);
 const noWarning=engine.rank([one,{...two,date:'2026-10-17'}],'Mennyi az EF?');
 assert.equal(noWarning.conflictSignals,0);
});
test('different units, same source, no numeric value never trigger discrepancy',()=>{
 const a=row(0,{date:'2026-10-16',title:'Vérnyomás',factType:'vitals',valueNumber:100,originalUnit:'Hgmm'});
 assert.equal(engine.rank([a,{...a,valueNumber:120}],'Mennyi?').conflictSignals,0);
 assert.equal(engine.rank([a,{...a,sourceId:id(3),originalUnit:'kPa',valueNumber:120}],'Mennyi?').conflictSignals,0);
 assert.equal(engine.rank([a,{...a,sourceId:id(3),valueNumber:null}],'Mennyi?').conflictSignals,0);
});
test('rejected rows excluded; maximum five source excerpts and no diagnosis',()=>{
 const rows=Array.from({length:8},(_,i)=>row(i,{date:'2026-10-'+String(i+10),title:'Labor lelet '+i}));
 rows[3].review='rejected';
 const result=engine.rank(rows,'Labor leleteim',{max:100});
 assert.equal(result.count,7);
 assert.equal(result.selected.length,5);
 assert.ok(result.selected.every(x=>x.review!=='rejected'));
});
test('SSE Ask query and single-use MKB consent must be the identical question',()=>{
 assert.match(assistant,/mkbConsent\.consume\(p,question\)/);
 assert.match(lens,/consume:function\(p,question\)/);
 assert.match(lens,/cache\.question!==String\(question\|\|''\)\.trim\(\)/);
 assert.match(lens,/if\(opt\)opt\.checked=false/);
 assert.match(lens,/prepared=null/);
 assert.match(lens,/!allowed\(p\)/);
 assert.match(lens,/Date\.now\(\)-cache\.at>5\*60\*1000/);
 assert.match(lens,/g\.evidences\.every\(e=>qa\.get\(e\.id\)\?\.verified\)/);
 assert.match(lens,/ranker\.rank\(candidateRows,question,\{max:5\}\)/);
 assert.match(lens,/consentPreview\.textContent/);
 assert.match(lens,/\.quote\.slice\(0,160\)/);
 assert.match(lens,/healthhub:profile-changed',reset/);
 assert.match(lens,/healthhub:central-auth-changed',reset/);
});
test('user-approved discrepancies remain explicitly uncertain and source-bounded in AI request',()=>{
 const item={sourceId:id(1),date:'2026-10-16',title:'Ejekciós frakció',
  source:'test.pdf',page:1,quote:excerpt('EF 55 %'),review:'pending',
  caution:'Azonos napon eltérő dokumentált számszerű értékek vannak'};
 const result=pack(request,'monika',[item],'Mennyi az EF?');
 assert.equal(result.added,1);
 assert.match(result.payload.extra[0].value,/azonos napi eltérő mérés/);
 assert.match(result.payload.extra[0].value,/szakmai ellenőrzésre vár/);
 assert.equal(result.payload.documentEvidence.length,1);
 assert.ok(result.payload.extra[0].value.length<=235);
 const noGrant=pack(request,'monika',null,'Mennyi az EF?');
 assert.strictEqual(noGrant.payload,request);
});
test('no background API, write, token, or persistence; original PDFs not sent by ranker',()=>{
 for(const s of [engineText,lens,packer]){
  assert.doesNotMatch(s,/localStorage\.setItem|sessionStorage\.setItem|setInterval\(/);
  assert.doesNotMatch(s,/\.stream\(|method:\s*['"](?:POST|PUT|DELETE|PATCH)['"]/);
 }
 assert.doesNotMatch(engineText,/fetch\(|supabase|oauth|api[_-]?key/i);
 assert.match(packer,/oldDocuments\.length\+docs\.length>12/);
 assert.match(packer,/original\.length\+items\.length>72/);
});
