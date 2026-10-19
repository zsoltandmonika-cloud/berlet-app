'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'live-v201.js'),'utf8');
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
const api=fs.readFileSync(path.join(root,'../supabase/functions/hh-drive-oauth-v682/index.ts'),'utf8');
const from=source.indexOf('/* v690: read-only server Drive fallback');
const to=source.indexOf('window.openHrDocument=async function(id){');
assert.ok(from>=0&&to>from,'v690 gateway helper must exist');

function setup(options={}){
 let current=options.profile||'m',calls=[];
 const pdf=Uint8Array.from(Buffer.from('%PDF-1.4\n%%EOF\n','utf8'));
 const state=options.status||{authenticated:true,authorizedProfiles:['monika']};
 const stream=async(endpoint,body)=>{
  calls.push({endpoint,body});
  if(options.promise)return await options.promise;
  return {
   ok:options.ok!==false,status:options.statusCode||200,
   headers:{get:()=>options.mime||'application/pdf'},
   json:async()=>({error:options.error||'drive_document_locator_ambiguous'}),
   arrayBuffer:async()=>Uint8Array.from(options.bytes||pdf).buffer
  };
 };
 const context=vm.createContext({
  window:{HH_DAILY_HEALTH_SYNC_V319:{getStatus:()=>state,stream}},
  localStorage:{getItem:()=>current},
  crypto:webcrypto,Uint8Array,Blob,ArrayBuffer,Error,Array,String,Number
 });
 vm.runInContext(source.slice(from,to)+'\nthis.remote=pdfFromPrivateDriveV690;\nthis.message=pdfGatewayMessageV690;\nthis.current=pdfProfileV690;\n',context);
 return {context,calls,setProfile(p){current=p},pdf};
}
function doc(pdf,changes={}){
 return {id:'patient-report-12345',profile:'monika',originalName:'sample.pdf',
 sha256:createHash('sha256').update(pdf).digest('hex'),...changes};
}
test('v690 syntax and published build cache key',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(page,/v694-four-local-pdf-repair/);
 assert.match(page,/live-v201\.js\?v=694-reused-verified-viewer/);
});
test('only local missing-blob path invokes server original, with patient metadata and cancellation',()=>{
 assert.match(source,/if\(!d\|\|d\.profile!==profile\)/);
 assert.match(source,/if\(!original\)\{[\s\S]*?pdfFromPrivateDriveV690\(d,profile,serial\)/);
 assert.match(source,/function cleanDocument\(\)\{\s*pdfOpenSerialV690\+\+/);
 assert.match(source,/healthhub:profile-changed/);
 assert.doesNotMatch(source,/hhGetGoogleDriveToken292|www\.googleapis\.com\/drive/);
});
test('server gateway enforces profile permissions, tagged identity, and real Drive folder',()=>{
 assert.match(api,/if\(!await profileAllowed\(owner,profile\)\)/);
 assert.match(api,/matches\.length!==1/);
 assert.match(api,/f\.appProperties\?\.documentId===documentId/);
 assert.match(api,/m\.appProperties\?\.documentId!==documentId/);
 assert.match(api,/m\.parents\.includes\(folder\)/);
 assert.match(api,/if\(length!==expected\)/);
 assert.match(api,/drive_pdf_invalid_signature/);
});
test('valid tagged PDF is read in memory, profile and documentId are exact, SHA verified',async()=>{
 const x=setup();const blob=await x.context.remote(doc(x.pdf),'monika',0);
 assert.equal(blob.type,'application/pdf');assert.equal(blob.size,x.pdf.length);
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].endpoint,'/functions/v1/hh-drive-oauth-v682');
 assert.equal(x.calls[0].body.action,'archive_document');
 assert.equal(x.calls[0].body.profile,'monika');
 assert.equal(x.calls[0].body.documentId,'patient-report-12345');
 assert.equal(x.calls[0].body.fileId,undefined);
});
test('absence of Vault authorization fails closed without network request',async()=>{
 const x=setup({status:{authenticated:false,authorizedProfiles:[]}});
 await assert.rejects(()=>x.context.remote(doc(x.pdf),'monika',0),/health_vault_required/);
 assert.equal(x.calls.length,0);
});
test('wrong bytes or hash, missing marker and unavailable archive are rejected',async()=>{
 const wrong=setup({bytes:Buffer.from('%PDF-1.4\nchanged\n')});
 await assert.rejects(()=>wrong.context.remote(doc(wrong.pdf),'monika',0),/drive_pdf_hash_mismatch/);
 const html=setup({mime:'text/html'});
 await assert.rejects(()=>html.context.remote(doc(html.pdf),'monika',0),/drive_pdf_invalid_type/);
 const missing=setup({ok:false,statusCode:503,error:'drive_document_locator_ambiguous'});
 await assert.rejects(()=>missing.context.remote(doc(missing.pdf,{sha256:null}),'monika',0),/drive_document_hash_required/);
 const img=setup();
 await assert.rejects(()=>img.context.remote(doc(img.pdf,{originalName:'x.png'}),'monika',0),/remote_pdf_only/);
 assert.equal(img.calls.length,0);
});
test('async response after profile switch is discarded',async()=>{
 let release;const promise=new Promise(r=>{release=r});
 const x=setup({promise});
 const task=x.context.remote(doc(x.pdf),'monika',0);
 x.setProfile('z');
 release({ok:true,status:200,headers:{get:()=> 'application/pdf'},
 arrayBuffer:async()=>Uint8Array.from(x.pdf).buffer});
 await assert.rejects(()=>task,/pdf_open_cancelled/);
});
