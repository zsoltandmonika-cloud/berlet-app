/* SHO Smart Shopping local-first read-through cache.
   Browser-only IndexedDB; family Supabase stays authoritative.
   Never cache merchant prices as live, OAuth tokens, or orders. */
(function(w){'use strict';
const NAME='sh9-smart-shopping-local-v1',STORE='snapshots',MAX_ITEMS=10000;
let promise=null;
function open(){
 if(!w.indexedDB)return Promise.resolve(null);
 if(!promise)promise=new Promise(resolve=>{
  try{
   const r=w.indexedDB.open(NAME,1);
   r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'})};
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null);
  }catch(_){resolve(null)}
 });
 return promise;
}
function cacheKey(uid,type){
 if(!/^[0-9a-z-]{3,90}$/i.test(String(uid||''))||!/^[a-z0-9:_-]{1,120}$/i.test(type))return null;
 return uid+':'+type;
}
async function read(uid,type){
 const key=cacheKey(uid,type),db=key?await open():null;
 if(!db)return null;
 return new Promise(resolve=>{
  try{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
   req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)
  }catch(_){resolve(null)}
 });
}
async function write(uid,type,payload){
 const key=cacheKey(uid,type),db=key?await open():null;
 if(!db||!payload||typeof payload!=='object')return false;
 const items=payload.rows;
 if(!Array.isArray(items)||items.length>MAX_ITEMS)return false;
 const record={key,rows:items,syncedAt:new Date().toISOString(),schema:1};
 return new Promise(resolve=>{
  try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);
   tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)
  }catch(_){resolve(false)}
 });
}
w.SHOP_LOCAL_FIRST_V1=Object.freeze({read,write,dbName:NAME});
})(window);