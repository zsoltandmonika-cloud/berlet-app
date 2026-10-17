/* HealthHub Nutrition central image vault v641.
 * Private content-addressed Dropbox JPEGs, separate from the diary JSON.
 * Device cache is IndexedDB (not the source of truth); no public image URLs.
 */
(function(root){
'use strict';
const cloud=()=>root.HH_NUTRITION_CLOUD_V626;
const hex64=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const valid=p=>p==='zsolt'||p==='monika';
const id=(p,h)=>p+'/'+h;
let databasePromise=null;
const live=new Map(),pending=new Map();
function database(){
 if(!root.indexedDB)return Promise.resolve(null);
 if(databasePromise)return databasePromise;
 databasePromise=new Promise((resolve)=>{
  try{
   const req=indexedDB.open('hh-nutrition-image-vault-v1',1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos')};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>resolve(null);
   req.onblocked=()=>resolve(null);
  }catch(_){resolve(null)}
 });
 return databasePromise;
}
async function cacheGet(key){
 const db=await database();if(!db)return null;
 return new Promise(resolve=>{
  try{const tx=db.transaction('photos','readonly'),q=tx.objectStore('photos').get(key);
   q.onsuccess=()=>resolve(q.result instanceof Blob?q.result:null);
   q.onerror=()=>resolve(null);
  }catch(_){resolve(null)}
 });
}
async function cachePut(key,blob){
 const db=await database();if(!db)return false;
 return new Promise(resolve=>{
  try{const tx=db.transaction('photos','readwrite');
   tx.objectStore('photos').put(blob,key);
   tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
  }catch(_){resolve(false)}
 });
}
async function sha(bytes){
 if(!root.crypto?.subtle?.digest)throw new Error('A böngésző nem támogatja a biztonságos képtárolást (HTTPS szükséges)');
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function fromDataURL(data){
 if(typeof data!=='string'||!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(data))throw new Error('A kép előbb JPEG formátumra optimalizálandó');
 const bin=atob(data.slice('data:image/jpeg;base64,'.length));
 if(bin.length<64||bin.length>700000)throw new Error('A kép túl nagy');
 const bytes=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new Error('Érvénytelen JPEG-adatok');
 return bytes;
}
function refValid(profile,ref){
 try{cloud()?.checkImageRef(profile,ref);return true}catch(_){return false}
}
async function save(profile,dataURL){
 if(!valid(profile)||!cloud()?.connected())throw new Error('A központi képtárhoz Dropbox-kapcsolat szükséges');
 const bytes=fromDataURL(dataURL),hash=await sha(bytes);
 const ref=await cloud().putImage(profile,bytes,hash);
 const blob=new Blob([bytes],{type:'image/jpeg'});
 await cachePut(id(profile,hash),blob);
 if(!live.has(id(profile,hash)))live.set(id(profile,hash),URL.createObjectURL(blob));
 return ref;
}
async function load(profile,ref){
 if(!refValid(profile,ref))throw new Error('Érvénytelen profilhoz tartozó képhivatkozás');
 const key=id(profile,ref.sha256);
 if(live.has(key))return live.get(key);
 if(pending.has(key))return pending.get(key);
 const job=(async()=>{
  let blob=await cacheGet(key);
  if(!blob){
   if(!cloud()?.connected())throw new Error('A képfájl offline nem található és a Dropbox nincs csatlakoztatva');
   blob=await cloud().getImage(profile,ref);
   const bytes=await blob.arrayBuffer();
   if(await sha(bytes)!==ref.sha256)throw new Error('A képfájl ellenőrzőösszege nem egyezik; nem jeleníthető meg');
   blob=new Blob([bytes],{type:'image/jpeg'});
   await cachePut(key,blob);
  }
  const url=URL.createObjectURL(blob);
  live.set(key,url);
  return url;
 })();
 pending.set(key,job);
 try{return await job}finally{pending.delete(key)}
}
root.HH_NUTRITION_IMAGE_V641={save,load,refValid,connected:()=>!!cloud()?.connected(),version:'641'};
})(window);
