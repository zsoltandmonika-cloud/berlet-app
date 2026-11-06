/* SHO v17 · explicitly invoked, read-only migration from legacy Bérlet IndexedDB.
 * Only same-origin storage is accessible. NEVER remove or overwrite legacy photos.
 */
(function(w){
'use strict';
async function read(){
 if(!w.indexedDB)throw Error('NO_LEGACY');
 const db=await new Promise((resolve,reject)=>{
  const req=w.indexedDB.open('berlet-db',1);
  req.onupgradeneeded=()=>{req.transaction.abort()};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(Error('NO_LEGACY'));
  req.onblocked=()=>reject(Error('NO_LEGACY'));
 });
 try{
  if(!db.objectStoreNames.contains('images'))throw Error('NO_LEGACY');
  const data=await new Promise((resolve,reject)=>{
   const tx=db.transaction('images','readonly'),store=tx.objectStore('images');
   const front=store.get('front'),back=store.get('back');
   let f=null,b=null;
   front.onsuccess=()=>{f=front.result};back.onsuccess=()=>{b=back.result};
   tx.oncomplete=()=>resolve({front:f,back:b});
   tx.onerror=tx.onabort=()=>reject(Error('NO_LEGACY'));
  });
  if(!(data.front instanceof Blob)||!(data.back instanceof Blob))throw Error('NO_LEGACY');
  for(const photo of [data.front,data.back]){
   if(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size<100||photo.size>12000000)
    throw Error('NO_LEGACY');
  }
  return data;
 }finally{db.close()}
}
w.SHO_BKK_LEGACY_V17=Object.freeze({read});
})(window);