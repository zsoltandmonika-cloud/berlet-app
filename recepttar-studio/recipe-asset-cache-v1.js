/* Léna Recept Studio · Local-First Asset Cache V1.
 * The Puter account is ALWAYS verified by the app before use. Accounts are isolated.
 * No token, API key, download URL, or metered network call lives in this module.
 * Local custom recipes in the existing DB are never changed or evicted.
 * This cache is best-effort, not a backup. Browser site-data deletion removes it.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LENA_RECIPE_ASSET_CACHE_V1=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const DB='lena-recept-studio-asset-cache-v1';
 const ASSETS='assets',CATALOG='catalogue',LIMIT=250*1024*1024,MAX_FILE=24*1024*1024;
 const TTL=15*60*1000,UNKNOWN_VERSION_TTL=60*60*1000;
 const norm=a=>String(a||'').trim().toLowerCase().slice(0,250);
 const scope=(account,id)=>encodeURIComponent(norm(account))+'|'+encodeURIComponent(String(id||''));
 const version=r=>String(r?.updatedAt||r?.updated_at||r?.version||r?.cardPath||'').slice(0,300);
 const hasVersion=r=>!!(r?.updatedAt||r?.updated_at||r?.version);
 function open(){
  return new Promise((resolve,reject)=>{
   if(typeof indexedDB==='undefined')return reject(Error('IndexedDB unavailable'));
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{
    if(!req.result.objectStoreNames.contains(ASSETS))req.result.createObjectStore(ASSETS,{keyPath:'key'});
    if(!req.result.objectStoreNames.contains(CATALOG))req.result.createObjectStore(CATALOG,{keyPath:'key'});
   };
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('IndexedDB open failed'));
   req.onblocked=()=>reject(Error('IndexedDB blocked'));
  });
 }
 async function tx(store,mode,work){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
   const tr=db.transaction(store,mode),req=work(tr.objectStore(store));
   let value;
   req.onsuccess=()=>{value=req.result};
   req.onerror=()=>reject(req.error||Error('IndexedDB request failed'));
   tr.oncomplete=()=>resolve(value);
   tr.onerror=()=>reject(tr.error||Error('IndexedDB transaction failed'));
   tr.onabort=()=>reject(tr.error||Error('IndexedDB aborted'));
  })}finally{db.close()}
 }
 const safeRow=r=>({
  id:String(r.id||'').slice(0,250),title:String(r.title||'').slice(0,200),
  category:String(r.category||'Egyéb').slice(0,100),cardPath:String(r.cardPath||'').slice(0,600),
  heroPath:r.heroPath?String(r.heroPath).slice(0,600):null,
  processPath:r.processPath?String(r.processPath).slice(0,600):null,
  mime:String(r.mime||'').slice(0,120),originalName:String(r.originalName||'').slice(0,250),
  createdAt:r.createdAt||null,updatedAt:String(r.updatedAt||'').slice(0,80),
  readable:r.readable||null,studioData:r.studioData||null,youtubeId:String(r.youtubeId||'').slice(0,40)
 });
 async function get(account,r){
  if(!account||!r?.id)return null;
  try{
   const row=await tx(ASSETS,'readonly',s=>s.get(scope(account,r.id)));
   if(!row||row.version!==version(r)||row.account!==norm(account)||!(row.blob instanceof Blob))return null;
   if(!hasVersion(r)&&Date.now()-row.savedAt>UNKNOWN_VERSION_TTL)return null;
   return row.blob;
  }catch(_){return null}
 }
 async function put(account,r,blob){
  if(!account||!r?.id||!(blob instanceof Blob)||!blob.size||blob.size>MAX_FILE)return false;
  try{
   await tx(ASSETS,'readwrite',s=>s.put({key:scope(account,r.id),account:norm(account),
    version:version(r),bytes:blob.size,savedAt:Date.now(),blob}));
   void trim();return true;
  }catch(_){return false}
 }
 async function trim(){
  try{
   const rows=await tx(ASSETS,'readonly',s=>s.getAll());
   let total=rows.reduce((sum,r)=>sum+(Number(r.bytes)||0),0);
   if(total<=LIMIT)return;
   // Only our own disposable, cloud-reconstructible card cache is trimmed.
   for(const r of rows.sort((a,b)=>(a.savedAt||0)-(b.savedAt||0))){
    if(total<=LIMIT*0.85)break;
    await tx(ASSETS,'readwrite',s=>s.delete(r.key));
    total-=(Number(r.bytes)||0);
   }
  }catch(_){/* quota/storage failures never break recipe browsing */}
 }
 async function catalogue(account){
  if(!account)return null;
  try{
   const saved=await tx(CATALOG,'readonly',s=>s.get(norm(account)));
   return saved?.key===norm(account)&&Array.isArray(saved.rows)?saved:null;
  }catch(_){return null}
 }
 async function saveCatalogue(account,rows){
  if(!account||!Array.isArray(rows))return false;
  // A catalogue contains only data already fetched from this verified Puter account.
  const record={key:norm(account),checkedAt:Date.now(),rows:rows.filter(r=>r?.id&&r?.cardPath)
   .slice(0,1500).map(safeRow)};
  try{await tx(CATALOG,'readwrite',s=>s.put(record));return true}catch(_){return false}
 }
 const fresh=record=>!!(record?.checkedAt&&Date.now()-record.checkedAt<TTL&&Date.now()>=record.checkedAt);
 return Object.freeze({get,put,catalogue,saveCatalogue,fresh,TTL,DB,ASSETS,CATALOG});
});
