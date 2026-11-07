/* Matrix V4: strict, read-only access to GTFS already imported on THIS origin.
 * Browser IndexedDB only. Never creates a DB, writes, exports raw GTFS,
 * syncs to cloud, or reads access tokens. Unsupported browsers fail closed.
 */
const DATASETS=Object.freeze({
 mav:Object.freeze({db:"sh9-mav-private-gtfs-v2",store:"datasets",key:"household"}),
 volan:Object.freeze({db:"sh9-volan-private-gtfs-v994",store:"data",key:"pilot"})
});
function createReadOnlyLocalFeedReader(indexedDBApi=globalThis.indexedDB){
 if(!indexedDBApi||typeof indexedDBApi.databases!=="function")throw Error("indexeddb_enumeration_required");
 return async function readExistingLocalDataset({provider,signal}={}){
  const entry=DATASETS[provider];
  if(!entry||signal?.aborted)return null;
  let existing;
  try{existing=await indexedDBApi.databases()}catch(_){return null}
  if(!Array.isArray(existing)||!existing.some(d=>d.name===entry.db)||signal?.aborted)
   return null;
  return await new Promise(resolve=>{
   let db=null,done=false,req=null;
   function finish(val=null){
    if(done)return;
    done=true;
    signal?.removeEventListener("abort",onAbort);
    try{db?.close()}catch(_){}
    resolve(val);
   }
   function onAbort(){finish()}
   signal?.addEventListener("abort",onAbort,{once:true});
   if(signal?.aborted){finish();return}
   try{
    req=indexedDBApi.open(entry.db); // Existing DB only; NEVER upgrade.
    req.onupgradeneeded=e=>{
     try{e.target.transaction?.abort()}catch(_){}
     finish();
    };
    req.onerror=()=>finish();
    req.onblocked=()=>finish();
    req.onsuccess=()=>{
     db=req.result;
     if(done){try{db.close()}catch(_){};return}
     if(!db.objectStoreNames.contains(entry.store)){finish();return}
     try{
      const tx=db.transaction(entry.store,"readonly");
      const get=tx.objectStore(entry.store).get(entry.key);
      get.onsuccess=()=>finish(get.result||null);
      get.onerror=()=>finish();
      tx.onerror=()=>finish();
     }catch(_){finish()}
    };
   }catch(_){finish()}
  });
 };
}
export {DATASETS,createReadOnlyLocalFeedReader};
