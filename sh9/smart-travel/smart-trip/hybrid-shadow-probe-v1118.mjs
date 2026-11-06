/* Smart Trip Hybrid Fast v1118 · local-only real-data shadow timing.
 * Requires GTFS datasets previously loaded by the household on THIS origin.
 * No network calls, writes, user preferences, AI, Supabase or data exports.
 */
import {prefilter} from "./hybrid-fast-core-v1117.mjs";
const DB_SOURCES=Object.freeze([
 {provider:"mav",name:"sh9-mav-private-gtfs-v2",store:"datasets",key:"household"},
 {provider:"volan",name:"sh9-volan-private-gtfs-v994",store:"data",key:"pilot"}
]);
const now=()=>typeof performance!=="undefined"?performance.now():Date.now();
function assertQuery(q){
 const date=q?.date,time=q?.time;
 if(typeof q?.from!=="string"||typeof q?.to!=="string"||
 !q.from.trim()||!q.to.trim()||
 !/^\d{4}-\d{2}-\d{2}$/.test(date||"")||
 !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time||""))
 throw Error("invalid_query");
}
function openExisting(name,store,key,{indexedDBApi=globalThis.indexedDB}={}){
 if(!indexedDBApi)return Promise.resolve({status:"missing_idb"});
 // IndexedDB.databases() avoids creating blank databases on Chromium.
 if(typeof indexedDBApi.databases!=="function")
  return Promise.resolve({status:"cannot_verify_existing_database"});
 return indexedDBApi.databases().then(list=>{
  if(!list.some(d=>d.name===name))return {status:"not_loaded"};
  return new Promise(resolve=>{
   let settled=false;
   const finish=entry=>{if(settled)return;settled=true;resolve(entry)};
   const request=indexedDBApi.open(name);
   request.onerror=()=>finish({status:"read_failed"});
   request.onblocked=()=>finish({status:"read_blocked"});
   request.onsuccess=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(store)){db.close();finish({status:"missing_store"});return}
    try{
     const tx=db.transaction(store,"readonly");
     const get=tx.objectStore(store).get(key);
     get.onsuccess=()=>{const value=get.result;db.close();finish(value?
      {status:"loaded",data:value}:{status:"not_loaded"})};
     get.onerror=()=>{db.close();finish({status:"read_failed"})};
    }catch(_){db.close();finish({status:"read_failed"})}
   };
  });
 }).catch(()=>({status:"read_failed"}));
}
function localTimestamp(core,date,time){
 const h=Number(time.slice(0,2)),m=Number(time.slice(3,5));
 const epoch=core.wallEpoch(date,h*60+m);
 return Number.isFinite(epoch)?new Date(epoch).toISOString():null;
}
function safeMs(value){return Number(Math.max(0,value).toFixed(3))}
function providerName(source){return source.provider==="volan"?"Volán":"MÁV"}
/* Read-only, existing engine is used as-is, intentionally no cross-feed joins.
 * A Volán GTFS result here is benchmarked, but NOT mislabeled as MÁV.
 * Through-journey coverage is reported as missing, not fabricated.
 */
async function runShadow({query,core=globalThis.SH9_MAV_GTFS_CORE_V1,
 db=globalThis.indexedDB,clock=now,limit=30}={}){
 assertQuery(query);
 if(!core?.validate||!core?.route||!core?.wallEpoch)
  return {status:"engine_unavailable",providers:[],elapsedMs:null};
 const begun=clock(),when=localTimestamp(core,query.date,query.time);
 if(!when)return {status:"invalid_timezone_date",providers:[],elapsedMs:safeMs(clock()-begun)};
 const providers=[],observed={};
 for(const source of DB_SOURCES){
  const s={provider:source.provider,status:"",readMs:0,validateMs:0,routeMs:0,
   candidates:0,journeys:0,feedGeneratedAt:null};
  const readStart=clock();
  const loaded=await openExisting(source.name,source.store,source.key,{indexedDBApi:db});
  s.readMs=safeMs(clock()-readStart);
  if(loaded.status!=="loaded"){s.status=loaded.status;providers.push(s);continue}
  const raw=loaded.data;
  const checkStart=clock();
  const valid=core.validate(raw,{allowPrivate:true});
  s.validateMs=safeMs(clock()-checkStart);
  if(!valid||raw.localOnly!==true||raw.rightsConfirmed!==false){
   s.status="invalid_or_not_private_feed";providers.push(s);continue
  }
  // Preserve the existing standalone loaders' Volán provenance check.
  if(source.provider==="volan"&&!String(raw.source).includes("Volán")){
   s.status="wrong_provider";providers.push(s);continue
  }
  s.feedGeneratedAt=valid.generatedAt;
  const routeStart=clock();
  const result=core.route(raw,{from:query.from,to:query.to,mode:"depart",when},
   {limit:Math.min(60,Math.max(1,limit)),maxTransfers:1,localOnly:true,ranking:"recommended"});
  s.routeMs=safeMs(clock()-routeStart);
  s.status=result.status;
  s.journeys=result.journeys?.length||0;
  // Only MÁV's already computed result has an existing production adapter.
  // Volán is measured separately until its real Golden Card adapter is wired.
  if(source.provider==="mav"&&result.status==="ok")observed.mav=result;
  if(source.provider==="volan"&&result.status==="ok")observed.volanRoutes=result;
  providers.push(s);
 }
 const preStart=clock();
 const pre=prefilter({query:{from:query.from,to:query.to,travelDate:query.date},
  providerResults:{mav:observed.mav},clock});
 const prefilterMs=safeMs(clock()-preStart);
 // Never expose raw private route data in returned metrics/JSON.
 return {
  status:pre.status==="ready"?"partial_local_results":"fallback_required",
  coverage:"mav_adapter_only; volan_timed_without_adapter; no_BKK; no_cross_provider_joins",
  providerCoverage:{mav:!!observed.mav,volan:!!observed.volanRoutes,bkk:false},
  providers,comparison:{prefilterCandidates:pre.candidates?.length||0,
   adapterMs:prefilterMs,fullLocalProbeMs:safeMs(clock()-begun),
   gpt6Ms:null,cloudSaveMs:null,endToEndMs:null},
  deviceLocalOnly:true,benchmarkKind:"real_device_local_gtfs_read_routing_prefilter",
  caveat:"Nem méri a GPT-6 ChatGPT válaszidejét és a My Trips mentést."
 };
}
export {DB_SOURCES,openExisting,localTimestamp,runShadow,providerName};
