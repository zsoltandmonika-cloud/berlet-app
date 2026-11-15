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
 function key(account,b,kind='file'){
  return [String(account||'').toLowerCase(),b.drive_id,b.drive_item_id,b.etag||b.last_modified||b.size_bytes,kind].map(encodeURIComponent).join('|');
 }
 function database(){
  return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'})};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Az eszköz könyvtárgyorsítótára nem elérhető'));
   req.onblocked=()=>reject(Error('A könyvtárgyorsítótár zárolva'));
  });
 }
 async function transaction(mode,work){
  if(typeof indexedDB==='undefined')return null;
  const db=await database();
  try{return await new Promise((resolve,reject)=>{
   const tr=db.transaction(STORE,mode),os=tr.objectStore(STORE),request=work(os);
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
  const order=all.sort((a,b)=>(a.at||0)-(b.at||0));
  for(const item of order){
   if(sum<=LIMIT*0.85)break;
   await transaction('readwrite',s=>s.delete(item.key));
   sum-=item.bytes||0;
  }
 }
 async function put(account,b,kind,blob){
  if(!(blob instanceof Blob)||!blob.size||blob.size>80*1024*1024)return false;
  try{
   await transaction('readwrite',s=>s.put({
    key:key(account,b,kind),kind,account:String(account).toLowerCase(),
    bytes:blob.size,at:Date.now(),blob
   }));
   await trim();return true;
  }catch(_){return false}
 }
 async function count(account){
  try{
   const all=await transaction('readonly',s=>s.getAll())||[];
   const mine=all.filter(x=>x.account===String(account).toLowerCase());
   return {books:mine.filter(x=>x.kind==='file').length,covers:mine.filter(x=>x.kind==='cover').length,
    bytes:mine.reduce((n,x)=>n+(x.bytes||0),0)};
  }catch(_){return {books:0,covers:0,bytes:0}}
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
 return Object.freeze({key,get,put,count,clear});
});
