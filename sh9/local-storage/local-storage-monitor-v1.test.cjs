'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('sh9/local-storage/local-storage-monitor-v1.js');
const html=read('sh9/local-storage/index.html');
const admin=read('healthhub/hh-admin-mobile-focus-v748.js');
const api=require('../local-storage/local-storage-monitor-v1.js');
test('monitor appears in existing Admin with separate route, no changes to Book Studio',()=>{
 assert.match(admin,/id='hhLocalStorageOpenV1'/);
 assert.match(admin,/new URL\('\.\.\/sh9\/local-storage\/',w\.location\.href\)/);
 assert.match(html,/local-storage-monitor-v1\.js\?v=1/);
 assert.match(html,/Local Storage Monitor/);
 assert.match(html,/\.\.\/\.\.\/healthhub\/index\.html\?sh9nav=admin/);
 assert.match(html,/id="refreshStorage"/);
});
test('budget is advisory only, with no automatic browser or cloud data deletion',()=>{
 assert.match(html,/Tervezési cél: 2 GB/);
 assert.match(html,/Figyelmeztetési küszöb: 4 GB/);
 assert.match(source,/const TARGET=2\*GB,WARNING=4\*GB/);
 assert.match(source,/No cache eviction, quota modification or background polling/);
 assert.doesNotMatch(source,/(?:\.delete\(|\.clear\(|\.remove\(|\bfetch\s*\(|XMLHttpRequest|\.from\()/);
 assert.equal(api.budgetLevel(1e9),'ok');
 assert.equal(api.budgetLevel(2.5e9),'warn');
 assert.equal(api.budgetLevel(4e9),'danger');
});
test('total browser usage is an estimate scoped to the current origin',async()=>{
 const estimate=await api.measureBrowser({navigator:{storage:{estimate:async()=>({usage:123000000,quota:8900000000})}}});
 assert.deepEqual(estimate,{usage:123000000,quota:8900000000});
 assert.match(api.readable(123000000),/123 MB/);
 assert.equal((await api.measureBrowser({navigator:{}})).usage,null);
});
test('unknown storage APIs never create new databases or claim module measurements',async()=>{
 const stats=await api.measureBooks({databases:null,open:()=>{throw Error('must not open')}});
 assert.equal(stats.supported,false);
 assert.equal(stats.localBytes,null);
 const known=await api.measureBooks({databases:async()=>[],open:()=>{throw Error('must not create')}});
 assert.equal(known.supported,true);
 assert.equal(known.localBytes,0);
 assert.equal(known.cloudBytes,0);
 assert.equal(known.missing,true);
});
test('known database scan reads only size metadata and never Blob contents',async()=>{
 const when=new Date('2026-11-16T09:00:00Z').toISOString();
 const tables={
  'sh9-book-studio-device-library-v22':{books:[
   {source:'local',size_bytes:1250000,cover:{size:50000},updated_at:when},
   {source:'local',size_bytes:900000,updated_at:when}
  ]},
  'sh9-book-studio-covers-books-v3':{items:[
   {kind:'file',bytes:2100000},{kind:'cover',bytes:80000}
  ],offline_catalog_v21:[{synced:Date.parse(when)}]}
 };
 const indexedDB={
  databases:async()=>Object.keys(tables).map(name=>({name})),
  open(name){
   const request={};
   request.result={
    objectStoreNames:{contains:store=>Object.hasOwn(tables[name],store)},
    transaction(store){
     const tr={};
     tr.objectStore=()=>({openCursor(){
      const cursorReq={};let i=0;
      function step(){
       const row=tables[name][store][i++];
       cursorReq.result=row?{value:row,continue:()=>queueMicrotask(step)}:null;
       cursorReq.onsuccess?.({target:cursorReq});
       if(!row)queueMicrotask(()=>tr.oncomplete?.());
      }
      queueMicrotask(step);return cursorReq;
     }});
     tr.abort=()=>queueMicrotask(()=>tr.onabort?.());
     return tr;
    },close(){}
   };
   queueMicrotask(()=>request.onsuccess?.());
   return request;
  }
 };
 const stats=await api.measureBooks(indexedDB);
 assert.equal(stats.localBytes,2200000);
 assert.equal(stats.cloudBytes,2180000);
 assert.equal(stats.localBooks,2);
 assert.equal(stats.cloudBooks,1);
 assert.equal(stats.covers,1);
 assert.equal(stats.lastLocal,Date.parse(when));
 assert.equal(stats.lastCatalogue,Date.parse(when));
 assert.equal(stats.partial,false);
});
test('privacy of monitor: whitelist Book Studio stores and no other IndexedDB content',()=>{
 assert.match(source,/sh9-book-studio-device-library-v22/);
 assert.match(source,/sh9-book-studio-covers-books-v3/);
 assert.match(source,/openCursor\(\)/);
 assert.match(source,/row\.size_bytes/);
 assert.match(source,/row\.bytes/);
 assert.doesNotMatch(source,/blob\.arrayBuffer\(|getAll\(|getAllKeys\(/);
 assert.match(html,/külön tárhelyet/);
 assert.match(html,/Automatikus cache-törlés nincs bekapcsolva/);
 assert.doesNotThrow(()=>new Function(source));
});
