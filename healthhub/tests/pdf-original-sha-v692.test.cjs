'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../live-v201.js'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=source.indexOf('/* v690: read-only server Drive fallback');
const end=source.indexOf('window.openHrDocument=async function(id){');
assert.ok(start>=0&&end>start);
const pdf=Uint8Array.from(Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF','utf8'));
const checksum=createHash('sha256').update(pdf).digest('hex');
const goodDoc={id:'patient-doc-12345',profile:'monika',originalName:'test.pdf',sha256:checksum};
const baseFile=(id,sha,profile='monika',documentId='patient-doc-12345')=>
 ({id,mimeType:'application/pdf',appProperties:{profile,documentId,sha256:sha}});
function response(opts={}){
 return {ok:opts.ok!==false,status:opts.status||200,
  headers:{get:()=>opts.mime||'application/pdf'},
  json:async()=>opts.payload||{error:'drive_document_locator_ambiguous'},
  arrayBuffer:async()=>Uint8Array.from(opts.pdf||pdf).buffer};
}
function make(files,opts={}){
 let current='m',calls=[],pending=null;
 const vault={
  getStatus:()=>({authenticated:true,authorizedProfiles:['monika']}),
  stream:async(path,req)=>{
   calls.push({...req});
   if(opts.waitInventory&&req.action==='archive_inventory')await new Promise(resolve=>{pending=resolve});
   if(req.action==='archive_inventory')return response({payload:{profile:'monika',files}});
   if(req.action==='archive_document'&&!req.fileId)return response({ok:false,status:503});
   if(req.action==='archive_document'&&req.fileId)return response({pdf:opts.pdf});
   throw Error('unexpected request');
  }
 };
 const context=vm.createContext({window:{HH_DAILY_HEALTH_SYNC_V319:vault},
  localStorage:{getItem:()=>current},crypto:webcrypto,Uint8Array,Blob,ArrayBuffer,
  Error,Array,String,Number,Promise,Set});
 vm.runInContext(source.slice(start,end)+'\nthis.runPdfV692=pdfFromPrivateDriveV690;',context);
 return {run:(doc=goodDoc)=>context.runPdfV692(doc,'monika',0),calls,
  move(){current='z'},release(){if(!pending)throw Error('Not waiting');pending()}};
}
test('v692 code is parsed and cache-busted, original server identity checks retained',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(index,/v699-full-medical-source-catalog/);
 assert.match(index,/live-v201\.js\?v=693-verified-cross-id-pdf/);
 assert.match(source,/action:'archive_pdf',profile:p,fileId:located\.fileId/);
 assert.match(source,/if\(actual!==expected\)throw Error\('drive_pdf_hash_mismatch'\)/);
 assert.match(source,/archive_inventory/);
});
test('multiple tag copies: select only exact SHA candidate, never by filename/date',async()=>{
 const x=make([baseFile('driveFILE_BAD00001','1'.repeat(64)),
   baseFile('driveFILE_GOOD0001',checksum)]);
 const blob=await x.run();
 assert.equal(blob.type,'application/pdf');
 assert.equal(blob.size,pdf.length);
 assert.deepEqual(x.calls.map(x=>x.action),['archive_document','archive_inventory','archive_document']);
 assert.equal(x.calls[2].fileId,'driveFILE_GOOD0001');
 assert.equal(x.calls[2].profile,'monika');
 assert.equal(x.calls[2].documentId,goodDoc.id);
 assert.equal(x.calls[0].fileId,undefined);
});
test('multiple identical tagged SHA copies: exact bytes still independently verified',async()=>{
 const x=make([baseFile('driveFILE_BBBBBBBB',checksum),
  baseFile('driveFILE_AAAAAAAA',checksum)]);
 const blob=await x.run();
 assert.equal(blob.size,pdf.length);
 assert.equal(x.calls[2].fileId,'driveFILE_AAAAAAAA');
 const corrupted=make([baseFile('driveFILE_AAAAAAAA',checksum),
  baseFile('driveFILE_BBBBBBBB',checksum)],{pdf:Uint8Array.from(Buffer.from('%PDF-1.4\nmodified\n'))});
 await assert.rejects(()=>corrupted.run(),/drive_pdf_hash_mismatch/);
});
test('missing sha, foreign profile, or wrong sha fails closed without unsafe hinted ID',async()=>{
 const missing=make([baseFile('driveFILE_12345678',checksum),baseFile('driveFILE_87654321',checksum)]);
 await assert.rejects(()=>missing.run({...goodDoc,sha256:null}),/drive_document_hash_required/);
 assert.equal(missing.calls.length,1);
 const wrong=make([baseFile('driveFILE_12345678','a'.repeat(64)),baseFile('driveFILE_87654321','b'.repeat(64))]);
 await assert.rejects(()=>wrong.run(),/drive_document_hash_unmatched/);
 assert.equal(wrong.calls.length,2);
 const foreign=make([baseFile('driveFILE_12345678',checksum,'zsolt'),
   baseFile('driveFILE_87654321',checksum,'zsolt')]);
 await assert.rejects(()=>foreign.run(),/drive_document_not_indexed/);
 assert.equal(foreign.calls.length,2);
});
test('asynchronous profile change aborts before any hinted file request',async()=>{
 const x=make([baseFile('driveFILE_AAAAAAAA',checksum),baseFile('driveFILE_BBBBBBBB',checksum)],
  {waitInventory:true});
 const opened=x.run();
 for(let i=0;i<10&&x.calls.length<2;i++)await Promise.resolve();
 assert.equal(x.calls.length,2);
 x.move();x.release();
 await assert.rejects(()=>opened,/pdf_open_cancelled/);
 assert.equal(x.calls.length,2);
});
