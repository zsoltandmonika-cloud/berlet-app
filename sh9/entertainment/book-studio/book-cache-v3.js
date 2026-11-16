/* SHO Book Studio v3 · local on-device content + authentic cover cache.
 * Cache: personal browser IndexedDB. No server upload and no Microsoft token.
 * Never use cache without validating the current signed-in Microsoft account.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_BOOK_CACHE_V3=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const DB='sh9-book-studio-covers-books-v3',STORE='items',LIMIT=230*1024*1024;
 const CATALOG='offline_catalog_v21',PENDING='offline_pending_v21';
 function key(account,b,kind='file'){
  return [String(account||'').toLowerCase(),b.drive_id,b.drive_item_id,b.etag||b.last_modified||b.size_bytes,kind].map(encodeURIComponent).join('|');
 }
 function database(){
  return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,2);
   req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});
    if(!db.objectStoreNames.contains(CATALOG))db.createObjectStore(CATALOG,{keyPath:'key'});
    if(!db.objectStoreNames.contains(PENDING))db.createObjectStore(PENDING,{keyPath:'key'});
   };
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Az eszköz könyvtárgyorsítótára nem elérhető'));
   req.onblocked=()=>reject(Error('A könyvtárgyorsítótár zárolva'));
  });
 }
 async function transaction(mode,work,storeName=STORE){
  if(typeof indexedDB==='undefined')return null;
  const db=await database();
  try{return await new Promise((resolve,reject)=>{
   const tr=db.transaction(storeName,mode),os=tr.objectStore(storeName),request=work(os);
   let value;
   request.onsuccess=()=>{value=request.result};
   request.onerror=()=>reject(request.error||Error('Gyorsítótár írás/olvasás sikertelen'));
   tr.oncomplete=()=>resolve(value);
   tr.onerror=()=>reject(tr.error||Error('Gyorsítótár tranzakciós hiba'));
   tr.onabort=()=>reject(tr.error||Error('Gyorsítótár megszakadt'));
  })}finally{db.close()}
 }
 async function get(account,b,kind){
  try{
   const x=await transaction('readonly',s=>s.get(key(account,b,kind)));
   return x&&x.blob instanceof Blob?x.blob:null;
  }catch(_){return null}
 }
 async function trim(){
  if(typeof indexedDB==='undefined')return;
  const all=await transaction('readonly',s=>s.getAll())||[];
  let sum=all.reduce((n,x)=>n+(x.bytes||0),0);
  if(sum<=LIMIT)return;
  // Explicitly downloaded offline books must never be evicted by our own
  // 230 MiB cache LRU. The browser's real storage quota still applies.
  const order=all.filter(x=>!x.pinned).sort((a,b)=>(a.at||0)-(b.at||0));
  for(const item of order){
   if(sum<=LIMIT*0.85)break;
   await transaction('readwrite',s=>s.delete(item.key));
   sum-=item.bytes||0;
  }
 }
 async function put(account,b,kind,blob,options={}){
  if(!(blob instanceof Blob)||!blob.size||blob.size>80*1024*1024)return false;
  try{
   const k=key(account,b,kind);
   const was=await transaction('readonly',s=>s.get(k));
   await transaction('readwrite',s=>s.put({
    key:k,kind,account:String(account).toLowerCase(),
    bytes:blob.size,at:Date.now(),blob,pinned:!!(options.pinned||was?.pinned)
   }));
   await trim();return true;
  }catch(_){return false}
 }
 async function count(account){
  try{
   const all=await transaction('readonly',s=>s.getAll())||[];
   const mine=all.filter(x=>x.account===String(account).toLowerCase());
   return {books:mine.filter(x=>x.kind==='file').length,covers:mine.filter(x=>x.kind==='cover').length,
    bytes:mine.reduce((n,x)=>n+(x.bytes||0),0),
    offlineBooks:mine.filter(x=>x.kind==='file'&&x.pinned).length};
  }catch(_){return {books:0,covers:0,bytes:0,offlineBooks:0}}
 }
 async function clear(account){
  if(typeof indexedDB==='undefined')return false;
  try{
   const all=await transaction('readonly',s=>s.getAllKeys())||[];
   const prefix=encodeURIComponent(String(account).toLowerCase())+'|';
   for(const k of all)if(String(k).startsWith(prefix))await transaction('readwrite',s=>s.delete(k));
   return true;
  }catch(_){return false}
 }

 // The offline index contains plain metadata, never OAuth tokens or signed
 // Microsoft download URLs. Scope both the account and the SHO profile.
 const scope=(account,profile)=>encodeURIComponent(String(account||'').toLowerCase())+'|'+
  encodeURIComponent(String(profile||''));
 const safeBook=b=>({
  id:String(b.id||''),source:'onedrive',drive_id:String(b.drive_id||''),
  drive_item_id:String(b.drive_item_id||''),profile_key:String(b.profile_key||''),
  title:String(b.title||'').slice(0,200),author:String(b.author||'').slice(0,200),
  file_name:String(b.file_name||'').slice(0,250),
  format:b.format==='pdf'?'pdf':'epub',size_bytes:Number(b.size_bytes)||0,
  etag:String(b.etag||''),last_modified:String(b.last_modified||''),
  web_url:String(b.web_url||'').slice(0,600),
  progress_locator:String(b.progress_locator||'').slice(0,1200),
  progress_percent:Number(b.progress_percent)||0,
  bookmarks:Array.isArray(b.bookmarks)?b.bookmarks.filter(x=>x&&typeof x.locator==='string')
   .slice(-80).map(x=>({locator:String(x.locator).slice(0,1200),label:String(x.label||'').slice(0,200)})):[],
  is_favorite:!!b.is_favorite,theme:b.theme||'sepia',
  font_size:Number(b.font_size)||100,updated_at:String(b.updated_at||'')
 });
 async function cataloguePut(account,profile,books,folderId,driveId){
  if(!account||!profile||!Array.isArray(books))return false;
  const record={key:scope(account,profile),account:String(account).toLowerCase(),
   profile:String(profile),folderId:String(folderId||''),driveId:String(driveId||''),
   synced:Date.now(),books:books.map(safeBook).filter(b=>b.id&&b.drive_item_id)};
  try{await transaction('readwrite',s=>s.put(record),CATALOG);return true}
  catch(_){return false}
 }
 async function catalogueGet(account,profile){
  if(!account||!profile)return null;
  try{const x=await transaction('readonly',s=>s.get(scope(account,profile)),CATALOG);
   return x&&Array.isArray(x.books)?x:null
  }catch(_){return null}
 }
 async function catalogueClear(account,profile){
  if(!account||!profile)return false;
  try{
   await transaction('readwrite',s=>s.delete(scope(account,profile)),CATALOG);
   const all=await transaction('readonly',s=>s.getAllKeys(),PENDING)||[];
   const prefix=scope(account,profile)+'|';
   for(const x of all)if(String(x).startsWith(prefix))
    await transaction('readwrite',s=>s.delete(x),PENDING);
   return true
  }catch(_){return false}
 }
 async function pendingPut(account,profile,b,patch){
  if(!account||!profile||!b?.drive_item_id)return false;
  // A local reading state is written immediately, including while offline.
  const allowed={};
  for(const k of ['progress_locator','progress_percent','bookmarks','is_favorite','theme','font_size'])
   if(patch[k]!==undefined)allowed[k]=patch[k];
  try{
   const k=scope(account,profile)+'|'+encodeURIComponent(b.drive_item_id);
   const prior=await transaction('readonly',s=>s.get(k),PENDING);
   const row={key:k,account:String(account).toLowerCase(),profile,
    drive_item_id:b.drive_item_id,drive_id:b.drive_id,
    patch:{...(prior?.patch||{}),...allowed},at:Date.now()};
   await transaction('readwrite',s=>s.put(row),PENDING);return true
  }catch(_){return false}
 }
 async function pendingList(account,profile){
  if(!account||!profile)return [];
  try{
   const all=await transaction('readonly',s=>s.getAll(),PENDING)||[];
   return all.filter(x=>x.account===String(account).toLowerCase()&&x.profile===profile)
  }catch(_){return []}
 }
 async function pendingDelete(account,profile,id,expectedAt){
  const k=scope(account,profile)+'|'+encodeURIComponent(id);
  try{
   const row=await transaction('readonly',s=>s.get(k),PENDING);
   // Don't erase a newer change while a slower cloud upload completes.
   if(row&&row.at===expectedAt)await transaction('readwrite',s=>s.delete(k),PENDING);
   return true
  }catch(_){return false}
 }
 async function pin(account,b,kind='file'){
  try{
   const k=key(account,b,kind);
   const row=await transaction('readonly',s=>s.get(k));
   if(!row?.blob?.size)return false;
   row.pinned=true;
   await transaction('readwrite',s=>s.put(row));return true
  }catch(_){return false}
 }
 return Object.freeze({key,get,put,count,clear,pin,
  cataloguePut,catalogueGet,catalogueClear,pendingPut,pendingList,pendingDelete});

});
