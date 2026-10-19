'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash,webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'live-v201.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=source.indexOf('/* v690: read-only server Drive fallback');
const end=source.indexOf('window.openHrDocument=async function(id){');
assert.ok(start>=0&&end>start);
const original=new Uint8Array(Buffer.from('%PDF-1.7\nOriginal patient report\n%%EOF'));
const sha=createHash('sha256').update(original).digest('hex');
const record={id:'legacy-index-12345',profile:'monika',originalName:'report.pdf',sha256:sha};
function file(id,documentId,hash=sha,profile='monika'){
 return {id,mimeType:'application/pdf',appProperties:{profile,documentId,sha256:hash}};
}
function httpReply(bytes=original,status=200,error='drive_document_locator_ambiguous'){
 return {ok:status===200,status,headers:{get:()=> 'application/pdf'},
  arrayBuffer:async()=>Uint8Array.from(bytes).buffer,
  json:async()=>({error})};
}
function setup(files,settings={}){
 let current='m',calls=[],release;
 const vault={
  getStatus:()=>({authenticated:true,authorizedProfiles:['monika']}),
  stream:async(_,body)=>{
   calls.push({...body});
   if(body.action==='archive_inventory'){
    if(settings.blockInventory)await new Promise(r=>{release=r});
    return {ok:true,json:async()=>({profile:'monika',files})};
   }
   if(body.action==='archive_document'&&!body.fileId)return httpReply(original,503);
   if(body.action==='archive_pdf')return httpReply(settings.bytes||original);
   if(body.action==='archive_document'&&body.fileId)return httpReply(settings.bytes||original);
   throw Error('unexpected action '+body.action);
  }
 };
 const ctx=vm.createContext({window:{HH_DAILY_HEALTH_SYNC_V319:vault},
  localStorage:{getItem:()=>current},crypto:webcrypto,Uint8Array,Blob,ArrayBuffer,
  Array,Error,String,Number,Promise,Set});
 vm.runInContext(source.slice(start,end)+'\nthis.load=pdfFromPrivateDriveV690;',ctx);
 return {run:(d=record)=>ctx.load(d,'monika',0),calls,flip(){current='z'},release(){release()}};
}
test('v693 build includes verified cross-ID recovery and no direct Google token access',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(index,/v697-ask-lena-model-provenance/);
 assert.match(index,/live-v201\.js\?v=693-verified-cross-id-pdf/);
 assert.match(source,/located\.sameDocumentId[\s\S]*?action:'archive_pdf'/);
 assert.match(source,/if\(actual!==expected\)throw Error\('drive_pdf_hash_mismatch'\)/);
 assert.doesNotMatch(source,/hhGetGoogleDriveToken292|googleapis\.com\/drive/);
});
test('legacy document ID can be matched by strong SHA across another ID only in same patient folder',async()=>{
 const q=setup([file('DRIVE_BADFILE_1234','other-document','a'.repeat(64)),
  file('DRIVE_CORRECT_1234','different-historical-id')]);
 const blob=await q.run();
 assert.equal(blob.size,original.length);
 assert.deepEqual(q.calls.map(c=>c.action),
  ['archive_document','archive_inventory','archive_pdf']);
 assert.equal(q.calls[2].fileId,'DRIVE_CORRECT_1234');
 assert.equal(q.calls[2].profile,'monika');
 assert.equal(q.calls[2].documentId,undefined);
});
test('exact document ID is preferred and keeps strict server-side identity check',async()=>{
 const q=setup([file('DRIVE_OTHER_0000','unrelated-old-id'),file('DRIVE_EXACT_0000',record.id)]);
 await q.run();
 assert.equal(q.calls[2].action,'archive_document');
 assert.equal(q.calls[2].documentId,record.id);
 assert.equal(q.calls[2].fileId,'DRIVE_EXACT_0000');
});
test('malicious/mistaken archive metadata never beats downloaded-byte checksum',async()=>{
 const q=setup([file('DRIVE_CORRECT_1234','wrong-old-id')],{bytes:new Uint8Array(Buffer.from('%PDF-1.7\nNOT original\n%%EOF'))});
 await assert.rejects(()=>q.run(),/drive_pdf_hash_mismatch/);
 assert.equal(q.calls[2].action,'archive_pdf');
});
test('missing local sha, no SHA candidate or other profile cannot open a different report',async()=>{
 const noHash=setup([file('DRIVE_ANYTHING_1234','different')]);
 await assert.rejects(()=>noHash.run({...record,sha256:''}),/drive_document_hash_required/);
 assert.equal(noHash.calls.length,1);
 const wrongHash=setup([file('DRIVE_WRONG_0000','different','f'.repeat(64))]);
 await assert.rejects(()=>wrongHash.run(),/drive_document_not_indexed/);
 assert.equal(wrongHash.calls.length,2);
 const otherProfile=setup([file('DRIVE_ZSOLT_0000','different',sha,'zsolt')]);
 await assert.rejects(()=>otherProfile.run(),/drive_document_not_indexed/);
 assert.equal(otherProfile.calls.length,2);
});
test('profile switch mid-inventory cancels without downloading a PDF',async()=>{
 const q=setup([file('DRIVE_CORRECT_1234','other-id')],{blockInventory:true});
 const future=q.run();
 for(let i=0;i<20&&q.calls.length<2;i++)await Promise.resolve();
 assert.equal(q.calls.length,2);
 q.flip();q.release();
 await assert.rejects(()=>future,/pdf_open_cancelled/);
 assert.equal(q.calls.length,2);
});
