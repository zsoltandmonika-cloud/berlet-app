'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(base,'live-v128.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const begin=src.indexOf('window.hhCommitDocumentUpload=async function(){');
const end=src.indexOf('window.hhOpenDocumentDetail=async function(id){');
assert.ok(begin>=0&&end>begin);

function harness(opts={}){
 const docs=[],files=[],blobs=new Map(),metrics={newDocs:0,blobAdds:0,overwrite:0,notes:0,sync:0,toast:''};
 const identities=['a','b','c','d'];
 identities.forEach((id,i)=>{
  const data=Buffer.from('%PDF-1.7\nSYNTHETIC-SAFE-'+id+'\n%%EOF');
  const sha=createHash('sha256').update(data).digest('hex');
  docs.push({id:'existing-medical-id-'+id,profile:opts.mismatchProfile===id?'zsolt':'monika',sha256:sha});
  files.push({name:'synthetic-'+id+'.pdf',size:data.length,arrayBuffer:async()=>Uint8Array.from(data).buffer});
 });
 const notes=docs.map((d,i)=>({fileName:files[i].name,sha256:d.sha256,profile:'monika',category:'cardiology',
  documentDate:'2026-10-16',explanation:{title:'Safe synthetic',summary:'Test only',
    keyFindings:[],meaning:[],attention:[],questions:[]}}));
 const manifest={schema:'healthhub.medical.document-import/1',targetProfile:'monika',
  importMode:'restore-existing-originals',documents:notes};
 const ui={hhDocToolOverlay:{classList:{remove(){}}},
   hhDuProfile:{value:'monika'},hhDuCategory:{value:'cardiology'},hhDuDate:{value:'2026-10-16'},hhDuAuto:{checked:true}};
 const win={hhPendingDocFiles:files,hhPendingDocManifest:manifest,
  renderHealthSection:async()=>{},hhSyncFullMigrationDashboard(){metrics.sync++}};
 const st={profile:'monika',showAll:false};
 const fakeDb=()=>({close(){},transaction(store,mode){
  assert.equal(store,'documentBlobs');assert.equal(mode,'readwrite');
  const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){
   return{add(val){
    assert.ok(!blobs.has(val.id));blobs.set(val.id,val.blob);metrics.blobAdds++;
    setTimeout(()=>tx.oncomplete&&tx.oncomplete(),0);
   }};
  }};return tx;
 }});
 const ctx=vm.createContext({
  window:win,st,document:{getElementById:id=>ui[id]},
  pkey:()=>opts.activeProfile||'monika',
  hashSet:async()=>new Set(docs.map(d=>d.sha256)),
  all:async s=>{assert.equal(s,'documents');return docs;},
  sha256:async arr=>createHash('sha256').update(Buffer.from(arr)).digest('hex'),
  one:async(s,id)=>{assert.equal(s,'documentBlobs');return blobs.has(id)?{id,blob:blobs.get(id)}:null},
  put:async (store,val)=>{assert.equal(store,'documents');metrics.notes++;},
  openDb:async()=>fakeDb(),
  toastMsg:x=>{metrics.toast=x},console,
  inferCat:()=>{throw Error('unexpected new document import')},
  crypto:webcrypto,Blob,Uint8Array,Promise,Array,Map,Set,
  setTimeout,
 });
 vm.runInContext(src.slice(begin,end),ctx);
 return {run:()=>ctx.window.hhCommitDocumentUpload(),manifest,docs,files,blobs,metrics,win};
}
test('v695 build and cached import script updated, no new archive gateway deployed',()=>{
 assert.doesNotThrow(()=>new Function(src));
 assert.match(index,/v698-evidence-relevance-intelligence/);
 assert.match(index,/live-v128\.js\?v=695-safe-4pdf-reattach/);
 assert.match(src,/importMode==='restore-existing-originals'/);
 assert.match(src,/files\.length!==4\|\|manifest\.documents\.length!==4/);
 assert.match(src,/if\(!restoreExisting&&window\.hhSyncFullMigrationDashboard\)/);
});
test('four SHA-matched synthetic originals are restored to old IDs, explanations attached, no duplicate records or migration',async()=>{
 const x=harness();await x.run();
 assert.equal(x.blobs.size,4);
 assert.equal(x.metrics.blobAdds,4);
 assert.equal(x.metrics.notes,4);
 assert.equal(x.metrics.sync,0);
 assert.equal(x.docs.filter(d=>d.lenaExplanationImported).length,4);
 assert.match(x.metrics.toast,/Eredeti PDF visszacsatolva: 4/);
 assert.equal(x.win.hhPendingDocFiles.length,0);
});
test('second attempt does not overwrite existing original bytes',async()=>{
 const x=harness();await x.run();
 x.win.hhPendingDocFiles=x.files;
 x.win.hhPendingDocManifest=x.manifest;
 await x.run();
 assert.equal(x.metrics.blobAdds,4);
 assert.match(x.metrics.toast,/már helyben: 4/);
});
test('foreign profile content is not restored or annotated',async()=>{
 const x=harness({mismatchProfile:'b'});await x.run();
 assert.equal(x.metrics.blobAdds,3);
 assert.equal(x.metrics.notes,3);
 assert.match(x.metrics.toast,/nem párosítható: 1/);
});
test('when active profile differs from target, the repair fails closed',async()=>{
 const x=harness({activeProfile:'zsolt'});await x.run();
 assert.equal(x.metrics.blobAdds,0);
 assert.equal(x.metrics.notes,0);
 assert.equal(x.metrics.sync,0);
 assert.match(x.metrics.toast,/Feltöltési hiba/);
});
test('unmatched SHA does not create a new document or modify existing original',async()=>{
 const x=harness();x.files[3].arrayBuffer=async()=>Uint8Array.from(Buffer.from('%PDF-1.7\nWRONG-ORIGINAL\n%%EOF')).buffer;
 await x.run();
 assert.equal(x.metrics.blobAdds,3);
 assert.equal(x.metrics.notes,3);
 assert.match(x.metrics.toast,/nem párosítható: 1/);
});
