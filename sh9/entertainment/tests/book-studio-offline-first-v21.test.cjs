'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=read('sh9/entertainment/book-studio/index.html');
const cache=read('sh9/entertainment/book-studio/book-cache-v3.js');
const cloud=read('sh9/entertainment/book-studio/onedrive-books-v2.js');
const offline=read('sh9/entertainment/book-studio/book-studio-offline-v21.js');
const worker=read('sh9/entertainment/book-studio/offline-reader-sw-v21.js');
const shelf=read('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.js');
test('V21 is optional: no silent download, explicit opt-in with privacy and progress UI',()=>{
 for(const id of ['bshelfMenuOffline','bshelfOfflinePanel','bshelfOfflineEnable',
  'bshelfOfflineDownload','bshelfOfflineCancel','bshelfOfflineRefresh',
  'bshelfOfflineDisable','bshelfOfflineStorage','bshelfOfflineBar'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/külön nem titkosítottak/i);
 assert.match(offline,/if\(!w\.confirm\(consent\)\)return false/);
 assert.match(offline,/const isEnabled=\(account,p\)=>/);
 assert.match(offline,/await navigator\.storage\?\.persist\?\.\(\)/);
 assert.match(offline,/prepareOffline\(/);
 assert.match(shelf,/admin\.dataset\.mode=target==='bshelfManagePanel'\?'manage':target==='bshelfOfflinePanel'\?'offline':'classic'/);
 assert.match(html,/book-studio-offline-v21\.js\?v=21/);
 assert.match(html,/book-cache-v3\.js\?v=21-offline-catalog/);
 const order=['book-cache-v3.js','book-studio.js','book-studio-wood-shelf-v10.js',
  'book-studio-offline-v21.js','onedrive-books-v2.js'].map(x=>html.indexOf(x));
 assert.ok(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'offline mode must load before OneDrive');
});
test('Durable local index contains only metadata and is scoped per account+profile',()=>{
 assert.match(cache,/indexedDB\.open\(DB,2\)/);
 assert.match(cache,/CATALOG='offline_catalog_v21',PENDING='offline_pending_v21'/);
 assert.match(cache,/async function cataloguePut\(account,profile,books,folderId,driveId\)/);
 assert.match(cache,/async function catalogueGet\(account,profile\)/);
 assert.match(cache,/async function pendingPut\(account,profile,b,patch\)/);
 assert.match(cache,/async function pendingList\(account,profile\)/);
 assert.match(cache,/async function pendingDelete\(account,profile,id,expectedAt\)/);
 assert.match(cache,/pinned:!!\(options\.pinned\|\|was\?\.pinned\)/);
 assert.match(cache,/all\.filter\(x=>!x\.pinned\)/);
 assert.doesNotMatch(cache,/download_url|refreshToken|accessToken|client_secret/);
 assert.doesNotMatch(offline,/client_secret|Files\.ReadWrite|service_role/);
});
test('Instant local first paint occurs before Graph OAuth, and local downloaded files bypass Graph entirely',()=>{
 const boot=cloud.slice(cloud.indexOf('displayConfig();setConnected(false);'));
 assert.ok(boot.indexOf('await hydrateLocal()')>=0);
 assert.ok(boot.indexOf('await hydrateLocal()')<boot.indexOf('await resume()'));
 assert.match(boot,/if\(w\.navigator\?\.onLine===false\)/);
 assert.match(boot,/if\(localMode\)\{/);
 assert.match(cloud,/w\.SH9_BOOKSHELF_V10\?\.update\(\(ready\|\|localMode\)\?source:\[\]/);
 const download=cloud.slice(cloud.indexOf('async function download(b,options={})'),cloud.indexOf('function zipPath(base,href)'));
 assert.ok(download.indexOf("CACHE.get(account,b,'file')")<download.indexOf('ensureAccess()'));
 assert.match(download,/if\(old\?\.size\)/);
 assert.match(download,/if\(!ready\)throw Error\('Ez a könyv még nincs letöltve/);
 assert.match(cloud,/async function prepareOffline/);
 assert.match(cloud,/CACHE\.put\(account,book,'file',blob,\{pinned:true\}\)/);
 assert.match(cloud,/await CACHE\.pin\(account,book,'cover'\)/);
 assert.match(cloud,/async function saveOfflineCatalog/);
 assert.doesNotMatch(cloud,/method:\s*['"]DELETE['"]|Files\.ReadWrite/);
});
test('Local bookmark writes are queued before cloud calls, with conflict protection',()=>{
 const save=cloud.slice(cloud.indexOf('async function saveProgress(b,patch={})'),cloud.indexOf('function getBook(id)'));
 assert.ok(save.indexOf('OFFLINE?.queueProgress')<save.indexOf('if(!progressCloud||!ready)return'));
 assert.match(save,/OFFLINE\.ackPending/);
 assert.match(cloud,/Number\(item\.at\)<Date\.parse\(book\.updated_at\)/);
 assert.match(cloud,/await OFFLINE\.ackPending\(account,p,item\.drive_item_id,item\.at\)/);
});
test('Worker is narrow, caches full reader including EPUB/PDF CDN but no private data',()=>{
 assert.match(worker,/const ROOT=new URL\('\.\/',self\.registration\.scope\)/);
 assert.match(worker,/\.\/book-studio-offline-v21\.js\?v=21/);
 assert.match(worker,/assets\/wood-shelf-v10\.webp/);
 assert.match(worker,/epubjs@0\.3\.93/);
 assert.match(worker,/pdfjs-dist@3\.11\.174\/build\/pdf\.worker\.min\.js/);
 assert.match(worker,/if\(isOAuth\(url\)\)return/);
 assert.match(worker,/if\(!allowed\.has\(key\)\)return/);
 assert.match(worker,/credentials:'omit'/);
 assert.doesNotMatch(worker,/graph\.microsoft\.com|supabase\.co|hh_book_studio_books|token\s*=/);
 assert.match(worker,/event\.respondWith/);
});
test('Code parses in Node without importing browser-only modules',()=>{
 for(const source of [cache,cloud,offline,worker,shelf])
  assert.doesNotThrow(()=>new Function(source));
});
test('Offline manager never reads cached catalogue before profile-specific opt-in',async()=>{
 const data=new Map(),cacheApi={
  catalogueGet:async()=>({books:[{id:'od_1',title:'Tüskevár'}],driveId:'d'}),
  cataloguePut:async()=>true,
  pendingList:async()=>[],count:async()=>({books:0,covers:0,bytes:0}),
 };
 const localStorage={
  getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),
  removeItem:k=>data.delete(k)
 };
 const nodes=new Map();
 const d={
  getElementById(id){
   if(!nodes.has(id))nodes.set(id,{
    hidden:false,disabled:false,style:{},dataset:{},textContent:'',
    addEventListener(){},setAttribute(){},
   });
   return nodes.get(id);
  },addEventListener(){}
 };
 const w={
  localStorage,SH9_BOOK_CACHE_V3:cacheApi,
  navigator:{storage:{estimate:async()=>({usage:0,quota:1e9}),persisted:async()=>false}},
  location:{href:'https://example.org/sh9/entertainment/book-studio/'},
  addEventListener(){},setTimeout(){},confirm:()=>false
 };
 const ctx={window:w,document:d,navigator:w.navigator,URL,Promise,console};
 vm.runInNewContext(offline,ctx,{timeout:5000});
 const api=w.SH9_BOOK_OFFLINE_V21;
 assert.equal(api.isEnabled('one@example.com','zsolt'),false);
 assert.equal(await api.getSnapshot('one@example.com','zsolt'),null);
 data.set('sh9-book-offline-opt-in-v21:one%40example.com|zsolt','on');
 assert.equal(api.isEnabled('one@example.com','zsolt'),true);
 assert.equal(api.isEnabled('one@example.com','monika'),false);
 assert.equal(api.isEnabled('two@example.com','zsolt'),false);
 assert.equal((await api.getSnapshot('one@example.com','zsolt')).books.length,1);
});
