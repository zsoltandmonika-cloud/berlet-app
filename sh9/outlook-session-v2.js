/* SH9 Microsoft Calendar · short-lived persistent refresh token v2.
 * First-party browser-only IndexedDB store. No plaintext RT in localStorage,
 * GitHub, Dropbox, URL, or Android WebView; no client secret. Non-extractable
 * WebCrypto encryption at rest is defense-in-depth, NOT a defense against XSS.
 * The Microsoft SPA refresh-token family lifetime stays limited to 24 hours.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_OUTLOOK_PERSISTENCE_V2=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const DB='sh9-outlook-auth-device-v2',STORE='vault',KEY='encryption-key',SESSION='refresh-record';
 const MAX_AGE=24*60*60*1000,SAFETY=5*60*1000;
 function usable(env){
  return !!(env&&env.isSecureContext&&env.indexedDB&&env.crypto&&env.crypto.subtle&&env.crypto.getRandomValues);
 }
 function db(env){
  return new Promise((resolve,reject)=>{
   const req=env.indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(new Error('Böngészőtárhely nem hozzáférhető'));
   req.onblocked=()=>reject(new Error('Böngészőtárhely zárolva'));
  });
 }
 async function tx(env,mode,op,key,value){
  const d=await db(env);
  try{return await new Promise((resolve,reject)=>{
   const t=d.transaction(STORE,mode),store=t.objectStore(STORE);
   const request=op==='get'?store.get(key):op==='put'?store.put(value,key):store.delete(key);
   let result;
   request.onsuccess=()=>{result=request.result};
   request.onerror=()=>reject(new Error('Biztonságos munkamenettárolás sikertelen'));
   t.oncomplete=()=>resolve(result);
   t.onerror=()=>reject(new Error('Munkamenettárolás nem sikerült'));
   t.onabort=()=>reject(new Error('Munkamenettárolás megszakadt'));
  })}finally{d.close()}
 }
 function safeRecord(v,clientId,account,now){
  if(!v||v.clientId!==clientId||v.account!==account||
     typeof v.refreshToken!=='string'||v.refreshToken.length<10||
     !Number.isFinite(v.issuedAt)||v.issuedAt>now+60000||
     now-v.issuedAt>=MAX_AGE-SAFETY)return null;
  return {refreshToken:v.refreshToken,issuedAt:v.issuedAt};
 }
 async function clear(env){
  if(!usable(env))return false;
  try{await tx(env,'readwrite','delete',SESSION);return true}catch(_){return false}
 }
 async function save(env,clientId,account,refreshToken,issuedAt){
  if(!usable(env)||typeof refreshToken!=='string'||refreshToken.length<10)return false;
  const check=safeRecord({clientId,account,refreshToken,issuedAt},clientId,account,Date.now());
  if(!check)return false;
  try{
   let key=await tx(env,'readonly','get',KEY);
   if(!key){key=await env.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await tx(env,'readwrite','put',KEY,key)}
   const iv=env.crypto.getRandomValues(new Uint8Array(12));
   const raw=new TextEncoder().encode(JSON.stringify({clientId,account,refreshToken,issuedAt}));
   const ciphertext=await env.crypto.subtle.encrypt({name:'AES-GCM',iv},key,raw);
   await tx(env,'readwrite','put',SESSION,{iv:Array.from(iv),cipher:Array.from(new Uint8Array(ciphertext))});
   return true;
  }catch(_){return false}
 }
 async function load(env,clientId,account){
  if(!usable(env))return null;
  try{
   const key=await tx(env,'readonly','get',KEY);
   const enc=await tx(env,'readonly','get',SESSION);
   if(!key||!enc||!Array.isArray(enc.iv)||enc.iv.length!==12||!Array.isArray(enc.cipher))return null;
   const raw=await env.crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(enc.iv)},key,new Uint8Array(enc.cipher));
   const data=JSON.parse(new TextDecoder().decode(raw));
   const found=safeRecord(data,clientId,account,Date.now());
   if(!found)await clear(env);
   return found;
  }catch(_){await clear(env);return null}
 }
 return Object.freeze({usable,save,load,clear,MAX_AGE});
});
