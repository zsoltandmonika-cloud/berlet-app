/* SHO Smart Trip V5 · real, READ-ONLY local-source bridge.
 * Reuses Matrix V4 operator-verified stop-to-stop adapters unchanged.
 * Never infers a cross-operator connection or compares different stop-pairs.
 * No Google Maps, GPT, My Trips, Supabase or private timetable export.
 */
import {createMatrixSearch,parseRules} from
 "../../../../../super-search/matrix-v4/matrix-search-engine-v4.mjs";
import {createWorkerProvider} from
 "../../../../../super-search/matrix-v4/matrix-worker-provider-v4.mjs";
import {createBkkAdapter} from
 "../../../../../super-search/matrix-v4/matrix-existing-sources-v4.mjs";

const PROVIDERS=Object.freeze(["bkk","mav","volan"]);
const clean=s=>typeof s==="string"?s.trim().slice(0,160):"";
const validStop=s=>clean(s).length>=2;
export function makeScopedQuery(query,id){
 const pair=query?.pairs?.[id];
 if(!PROVIDERS.includes(id)||!pair||!validStop(pair.from)||!validStop(pair.to)||
  clean(pair.from)===clean(pair.to)||!/^(?:19|20)\d\d-\d\d-\d\d$/.test(query.date||"")||
  !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(query.time||"")||
  !["m","z"].includes(query.profile)||!["balanced","walk","wait","transfers"].includes(query.priority))
  return null;
 const from=clean(pair.from),to=clean(pair.to);
 const f=id+"_from",t=id+"_to";
 return {
  request:{from,to,date:query.date,time:query.time,mode:"depart",
   profile:query.profile,priority:query.priority},
  graph:{originNode:f,destinationNode:t,nodes:[
   {id:f,name:from,feedStops:{[id]:from}},
   {id:t,name:to,feedStops:{[id]:to}}
  ],searchPairs:{[id]:[{fromNode:f,toNode:t,fromStop:from,toStop:to}]}}
 };
}
function isoFor(request,core){
 const [h,m]=request.time.split(":").map(Number);
 const ms=core?.wallEpoch?.(request.date,h*60+m);
 return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
export function createReadOnlyAdapters({
 rules,bkkSearch,wallCore,workerFactory=createWorkerProvider,
 primary="mav",audit={}
}={}){
 if(!parseRules(rules)||typeof bkkSearch!=="function"||
  typeof wallCore?.wallEpoch!=="function"||
  typeof workerFactory!=="function"||!PROVIDERS.includes(primary)||
  !audit||typeof audit!=="object")throw Error("invalid_local_bridge_config");
 // Existing V4 worker factory keeps each private GTFS dataset inside its own
 // worker. Only verified segments and a TripPack summary leave the worker.
 const searchers={
  bkk:createBkkAdapter({search:bkkSearch,whenResolver:q=>isoFor(q,wallCore)}),
  mav:workerFactory("mav"),volan:workerFactory("volan")
 };
 return PROVIDERS.map(id=>({id,async search(query,{signal}={}){
  const scoped=makeScopedQuery(query,id);
  if(signal?.aborted)return {candidates:[]};
  if(!scoped){audit[id]={status:"invalid_stop_pair",tripPack:null};return {candidates:[]}}
  let result;
  try{
   const runner=createMatrixSearch({rules,services:{[id]:searchers[id]}});
   result=await runner.run({...scoped,signal});
  }catch(_){
   audit[id]={status:"source_error",tripPack:null};return {candidates:[]};
  }
  if(signal?.aborted)return {candidates:[]};
  const metric=result?.selection,p=result?.tripPack;
  // This operator's stop pair must be COMPLETE. Do not substitute routes
  // from another provider with a different origin or destination.
  const valid=result?.status==="ready"&&p?.schema==="sh9.trip-pack/1"&&
   p.from===scoped.request.from&&p.to===scoped.request.to&&
   Array.isArray(p.segments)&&p.segments.length>=1&&
   Number.isFinite(metric?.durationMinutes)&&metric.durationMinutes>0&&
   Number.isFinite(metric?.walkMeters)&&metric.walkMeters>=0&&
   Number.isInteger(metric?.transfers)&&metric.transfers>=0&&
   Number.isFinite(metric?.score)&&metric.score>=0;
  audit[id]={
   status:valid?"timetable_route_found":result?.status||"source_unavailable",
   providerStatus:result?.telemetry?.providerStatus?.[id]||"unknown",
   tripPack:valid?p:null,
   selection:valid?metric:null,
   elapsedMs:result?.telemetry?.totalMs??null
  };
  if(!valid||id!==primary)return {candidates:[]};
  return {candidates:[{
   id:id+"-"+query.date+"-"+p.departure.replace(/[^0-9]/g,"").slice(0,4),
   source:id,provenance:"operator",travelMinutes:metric.durationMinutes,
   walkMeters:metric.walkMeters,transfers:metric.transfers,
   score:Math.max(0,Math.min(1e7,metric.score))
  }]};
 }}));
}
export {PROVIDERS};
