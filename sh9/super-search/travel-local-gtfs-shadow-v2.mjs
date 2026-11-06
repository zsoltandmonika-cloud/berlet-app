/* SHO AI Super Search v2 · explicit-click, read-only MÁV local GTFS source.
 * Requires same-origin, authorized private GTFS already imported on this device.
 * NEVER copies GTFS to a network, cloud, another device or an AI prompt.
 * No connection to production Smart Trip's event handlers; shadow only.
 */
const DB_NAME="sh9-mav-private-gtfs-v2",STORE="datasets",KEY="household";
const RESULT_TTL_MS=10*60*1000;
const safeMs=n=>Number.isFinite(n)?Math.max(0,Math.round(n*1000)/1000):null;
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T12:00:00Z"))&&
 new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
const validTime=s=>typeof s==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
function readExistingPrivateDataset(indexedDBApi,{signal}={}){
 if(signal?.aborted)return Promise.resolve(null);
 if(!indexedDBApi||typeof indexedDBApi.databases!=="function")
  return Promise.resolve(null); // NEVER create an unconfirmed private database.
 return Promise.resolve().then(()=>indexedDBApi.databases()).then(list=>{
  if(signal?.aborted||!Array.isArray(list)||!list.some(x=>x?.name===DB_NAME))return null;
  return new Promise(resolve=>{
   let done=false,request=null,db=null;
   function finish(data=null){
    if(done)return;
    done=true;
    if(signal)signal.removeEventListener("abort",abort);
    try{db?.close()}catch(_){}
    resolve(data);
   }
   function abort(){finish(null)}
   if(signal)signal.addEventListener("abort",abort,{once:true});
   if(signal?.aborted){finish(null);return}
   try{
    request=indexedDBApi.open(DB_NAME); // no upgrade version requested
    request.onupgradeneeded=()=>{try{request.transaction?.abort()}catch(_){};finish(null)};
    request.onerror=()=>finish(null);
    request.onblocked=()=>finish(null);
    request.onsuccess=()=>{
     db=request.result;
     if(done){db.close();return}
     if(!db.objectStoreNames?.contains(STORE)){finish(null);return}
     try{
      const tx=db.transaction(STORE,"readonly"); // NEVER write or upgrade
      const get=tx.objectStore(STORE).get(KEY);
      get.onsuccess=()=>finish(get.result||null);
      get.onerror=()=>finish(null);
      tx.onabort=()=>finish(null);
     }catch(_){finish(null)}
    };
   }catch(_){finish(null)}
  });
 }).catch(()=>null);
}
/* Host controls when search is called. No startup scanning, GPS or profile read.
 * Preparation caches a private opaque token only in this page's memory.
 * No raw dataset is retained after prepare() returns.
 */
function createLocalRailShadow({
 indexedDBApi=globalThis.indexedDB,
 core=globalThis.SH9_MAV_GTFS_FAST_V1120,
 clock=()=>globalThis.performance?.now?.()??Date.now(),
 now=()=>Date.now()
}={}){
 let token=null,loadedAt=0,inFlight=null,disposed=false;
 let last=null;
 function reset(){token=null;loadedAt=0;inFlight=null;last=null}
 async function prepare(signal){
  if(disposed||signal?.aborted||!core?.prepare||!core?.route||!core?.wallEpoch)return null;
  if(token&&now()-loadedAt<RESULT_TTL_MS)return token;
  if(inFlight)return inFlight;
  const pending=(async()=>{
   const begin=clock();
   let raw=await readExistingPrivateDataset(indexedDBApi,{signal});
   const readMs=safeMs(clock()-begin);
   if(disposed||signal?.aborted||!raw||raw.rightsConfirmed!==false||
    raw.localOnly!==true||!/m[aá]v|rail|vasút|gtfs/i.test(raw.source||"")){
    last={status:"local_feed_unavailable",readMs,prepareMs:null,routeMs:null,
     routeCount:0,generatedAt:null};
    return null;
   }
   const start=clock();
   let compiled;
   try{compiled=core.prepare(raw,{allowPrivate:true})}catch(_){compiled=null}
   const prepareMs=safeMs(clock()-start),generatedAt=String(raw.generatedAt||"").slice(0,35);
   raw=null; // local in-memory source no longer held after preparation
   if(disposed||signal?.aborted||!compiled){
    last={status:"invalid_feed",readMs,prepareMs,routeMs:null,
     routeCount:0,generatedAt:null};
    return null;
   }
   token=compiled;loadedAt=now();
   last={status:"prepared",readMs,prepareMs,routeMs:null,routeCount:0,generatedAt};
   return token;
  })();
  inFlight=pending;
  try{return await pending}finally{if(inFlight===pending)inFlight=null}
 }
 async function getExistingResults({from,to,travelDate,time,mode="depart",signal}={}){
  if(disposed||signal?.aborted||typeof from!=="string"||typeof to!=="string"||
   !from.trim()||!to.trim()||!validDate(travelDate)||!validTime(time)||
   !["now","depart","arrive"].includes(mode))return null;
  const compiled=await prepare(signal);
  if(!compiled||disposed||signal?.aborted)return null;
  const minute=Number(time.slice(0,2))*60+Number(time.slice(3,5));
  const epoch=core.wallEpoch(travelDate,minute);
  if(!Number.isFinite(epoch))return null;
  const started=clock();
  let result;
  try{result=core.route(compiled,{from,to,when:new Date(epoch).toISOString(),mode},
   {limit:30,maxTransfers:1,localOnly:true,ranking:"recommended"})}
  catch(_){result=null}
  if(disposed||signal?.aborted)return null;
  const routeMs=safeMs(clock()-started);
  last={...last,status:result?.status||"route_error",routeMs,
   routeCount:Array.isArray(result?.journeys)?result.journeys.length:0};
  if(result?.status!=="ok"||!last.routeCount)return null;
  // Only existing verified journey results, no artificial walking/transfers.
  return {mav:result};
 }
 function metrics(){
  return last?Object.freeze({...last,privateDatasetLocal:true,
   modelCalled:false,cloudSaved:false}):Object.freeze({status:"not_run",
    readMs:null,prepareMs:null,routeMs:null,routeCount:0});
 }
 function dispose(){disposed=true;reset()}
 return Object.freeze({getExistingResults,metrics,reset,dispose});
}
export {DB_NAME,STORE,KEY,RESULT_TTL_MS,readExistingPrivateDataset,createLocalRailShadow};
