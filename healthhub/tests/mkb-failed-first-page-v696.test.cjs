'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(dir,'knowledge-v407-ingest.js'),'utf8');
const admin=fs.readFileSync(path.join(dir,'hh-mkb-batch-admin-v662.js'),'utf8');
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const start=code.indexOf('function mkbInvalidUnicodeV696('),end=code.indexOf('async function listVisuals(',start);
assert.ok(start>0&&end>start);
const source=code.slice(start,end);
const SHA='a'.repeat(64);
function fixture(mode='readable',excludedIds=[],many=1){
 let profile='monika',reads=0,writes=0;
 const docs=Array.from({length:many},(_,i)=>({profile_key:'monika',status:'failed',
  text_integrity_status:'mismatch',sha256:SHA,
  source_file_id:'drive_VALIDFILE_'+String(i).padStart(6,'0')}));
 const files=docs.map(d=>({id:d.source_file_id.slice(6),size:1234,name:'SYNTHETIC.pdf'}));
 const page={cleanup(){},getTextContent:async()=>{
   if(mode==='text_throw')throw Error('never disclose sensitive raw message');
   return {items:[{str:mode==='unicode'?('\u0000'+'a'.repeat(100)):mode==='surrogate'?'a'.repeat(100)+'\ud800':
      mode==='empty'?'':'á'.repeat(100)}]};
  },getOperatorList:async()=>({fnArray:[111]})};
 const engine={getDocument:()=>({promise:Promise.resolve({
  numPages:1,getPage:async()=>page,destroy:async()=>{}
 })})};
 const ctx=vm.createContext({st:{running:false},active(p){if(p!==profile)throw Error('profile changed')},
  readDocuments:async()=>docs,excludedDriveIds:async()=>new Set(excludedIds),
  listFiles:async()=>{reads++;return files},
  blobFor:async()=>{reads++;return Uint8Array.from([37,80,68,70,45])},
  hash:async()=>SHA,pdfjs:async()=>engine,
  rawText:items=>(items||[]).map(x=>x.str||'').join(''),
  certifiedEmptyPdfPage:async()=>false,
  Set,Map,Array,Number,Promise,Uint8Array,Error,Object,Math,String,console});
 vm.runInContext(source+'\nthis.forensic=diagnoseFailedV696;this.unicode=mkbInvalidUnicodeV696;',ctx);
 return{run:(n=11)=>ctx.forensic('monika',{maxDocs:n}),unicode:ctx.unicode,
  get reads(){return reads},get writes(){return writes},flip(){profile='zsolt'},
  docs,files};
}
test('v696 read-only Admin diagnostic is manually invoked and cache-busted',()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.doesNotThrow(()=>new Function(admin));
 assert.match(index,/v698-evidence-relevance-intelligence/);
 assert.match(index,/hh-mkb-batch-admin-v662\.js\?v=696-mkb-scope-audit/);
 assert.match(admin,/knowledge-v407-ingest\.js\?v=696-readonly-failed-page-diagnostic/);
 assert.match(admin,/id="hhMkbForensic696"/);
 assert.match(admin,/addEventListener\('click',diagnoseFailed\)/);
 assert.match(admin,/engine\(\)\.diagnoseFailed\(who,\{maxDocs:11\}\)/);
 assert.doesNotMatch(source,/method:'(POST|PUT|PATCH|DELETE)'|docStatus\(|savePage\(|sourceStatus\(/);
});
test('intentionally excluded Watch EKG sources stay excluded: zero Drive downloads',async()=>{
 const f=fixture('readable',['VALIDFILE_000000','VALIDFILE_000001'],2);
 const r=await f.run();
 assert.equal(r.totalFailed,0);assert.equal(r.excludedByScope,2);assert.equal(r.tested,0);
 assert.equal(f.reads,0);assert.equal(f.writes,0);
});
test('readable first-page text is evidence of extraction ONLY; never claim stored',async()=>{
 const f=fixture();const r=await f.run();
 assert.equal(r.totalFailed,1);assert.equal(r.excludedByScope,0);
 assert.equal(r.categories.extraction_readable_storage_not_proven,1);
 assert.equal(r.tested,1);assert.equal(f.writes,0);
});
test('NUL and lone surrogate are rejected without rewriting clinical text',async()=>{
 const f=fixture();
 assert.equal(f.unicode('a\u0000b'),true);
 assert.equal(f.unicode('a\ud800b'),true);
 assert.equal(f.unicode('a\udc00b'),true);
 assert.equal(f.unicode('á😀β'),false);
 const x=await fixture('unicode').run();
 assert.equal(x.categories.embedded_text_unicode_invalid,1);
 const y=await fixture('surrogate').run();
 assert.equal(y.categories.embedded_text_unicode_invalid,1);
});
test('a parsing exception reports only a category, never error messages or PDF text',async()=>{
 const r=await fixture('text_throw').run();
 assert.equal(r.categories.text_extraction_failed,1);
 assert.doesNotMatch(JSON.stringify(r),/never disclose sensitive raw message|SYNTHETIC/);
});
test('diagnostic is limited to 11 authorized documents, with transparent not-tested count',async()=>{
 const r=await fixture('readable',[],13).run();
 assert.equal(r.totalFailed,13);
 assert.equal(r.tested,11);
 assert.equal(r.notTested,2);
});
