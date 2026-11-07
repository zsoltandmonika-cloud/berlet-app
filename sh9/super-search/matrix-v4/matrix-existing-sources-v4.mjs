/* SHO Matrix V4 · adapters for existing SAME-DEVICE licensed GTFS engines.
 * No new route algorithm, network, paid API, cloud write or private data export.
 * Pairs are EXPLICIT stop-to-stop routes prepared by a separate verified graph.
 * Never imply address-to-stop walking or invent intermediate interchange nodes.
 */
const NAME=new Set(["mav","volan","bkk"]);
const MAX_PAIRS=4;
const clean=s=>typeof s==="string"?s.trim().slice(0,160):"";
function pairsFor(graph,name){
 const nodes=new Map((graph?.nodes||[]).filter(x=>x&&typeof x.id==="string").map(x=>[x.id,x]));
 const raw=graph?.searchPairs?.[name];
 if(!Array.isArray(raw))return [];
 return raw.slice(0,name==="bkk"?3:MAX_PAIRS).filter(p=>
  p&&nodes.has(p.fromNode)&&nodes.has(p.toNode)&&p.fromNode!==p.toNode&&
  clean(p.fromStop).length>=2&&clean(p.toStop).length>=2&&
  clean(p.fromStop)!==clean(p.toStop));
}
function resolveNode(graph,provider,stop){
 const exact=clean(stop);
 const matching=(graph.nodes||[]).filter(n=>{
  const name=n?.feedStops?.[provider];
  return Array.isArray(name)?name.some(v=>clean(v)===exact):clean(name)===exact;
 });
 return matching.length===1?matching[0].id:null;
}
function nodesForLegs(legs,pair,graph,provider){
 if(!Array.isArray(legs)||!legs.length||legs.length>4)return null;
 const ids=[];
 for(let i=0;i<legs.length;i++){
  const x=legs[i];
  if(!x||!clean(x.from)||!clean(x.to))return null;
  const from=i===0?pair.fromNode:resolveNode(graph,provider,x.from);
  const to=i===legs.length-1?pair.toNode:resolveNode(graph,provider,x.to);
  if(!from||!to||from===to)return null;
  if(i&&ids[i-1].toNode!==from)return null;
  ids.push({fromNode:from,toNode:to});
 }
 return ids;
}
function whenIso(core,request){
 if(typeof core?.wallEpoch!=="function")return null;
 const parts=request.time?.split(":").map(Number);
 if(parts?.length!==2||parts.some(x=>!Number.isInteger(x)))return null;
 const ms=core.wallEpoch(request.date,parts[0]*60+parts[1]);
 return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function createLocalGTFSAdapter(provider,{core,readExistingLocalDataset}={}){
 if(!["mav","volan"].includes(provider)||typeof core?.route!=="function"||
  typeof core?.validate!=="function"||typeof readExistingLocalDataset!=="function")
  throw Error("invalid_local_gtfs_adapter");
 const sourceUrl=provider==="mav"?"https://mavplusz.hu/":"https://www.mavcsoport.hu/";
 return async function search({request,graph,signal}={}){
  if(signal?.aborted)return {status:"cancelled",routes:[]};
  const pairs=pairsFor(graph,provider);
  if(!pairs.length)return {status:"no_verified_hubs",routes:[]};
  const when=whenIso(core,request);
  if(!when)return {status:"invalid_request",routes:[]};
  let dataset;
  try{dataset=await readExistingLocalDataset({signal,provider})}
  catch(_){return {status:"local_feed_unavailable",routes:[]}}
  if(signal?.aborted)return {status:"cancelled",routes:[]};
  if(!dataset||!core.validate(dataset,{allowPrivate:true})||
   !(provider==="mav"?/m[aá]v|rail|vasút/i:/volán/i).test(dataset.source||""))
   return {status:"local_feed_unavailable",routes:[]};
  const routes=[];
  for(const pair of pairs){
   if(signal?.aborted)return {status:"cancelled",routes:[]};
   const from=clean(pair.fromStop),to=clean(pair.toStop);
   let result;
   try{
    result=core.route(dataset,{from,to,mode:request.mode,when},
     {limit:12,maxTransfers:1,localOnly:true,ranking:"recommended"});
   }catch(_){continue}
   if(result?.status!=="ok")continue;
   for(const j of (result.journeys||[]).slice(0,12)){
    const legs=j.legs||[];
    const ids=nodesForLegs(legs,pair,graph,provider);
    if(!ids)continue;
    const mapped=legs.map((l,i)=>({
     provider,mode:provider==="mav"?"train":"bus",
     line:clean(l.service||l.tripId),fromNode:ids[i].fromNode,
     toNode:ids[i].toNode,departure:l.departure,arrival:l.arrival,
     verified:true,timetableVerified:true,source:clean(dataset.source),
     sourceUrl
    }));
    if(mapped.every(x=>x.line))routes.push({legs:mapped});
   }
  }
  return {status:routes.length?"ok":"not_covered",routes};
 };
}
function createBkkAdapter({search,whenResolver}={}){
 if(typeof search!=="function"||typeof whenResolver!=="function")
  throw Error("invalid_bkk_adapter");
 return async function bkk({request,graph,signal}={}){
  if(signal?.aborted)return {status:"cancelled",routes:[]};
  const pairs=pairsFor(graph,"bkk");
  if(!pairs.length)return {status:"no_verified_hubs",routes:[]};
  const when=whenResolver(request);
  if(typeof when!=="string"||!Number.isFinite(Date.parse(when)))
   return {status:"invalid_request",routes:[]};
  const routes=[];
  for(const pair of pairs){
   if(signal?.aborted)return {status:"cancelled",routes:[]};
   let result;
   try{
    result=await search({from:pair.fromStop,to:pair.toStop,date:request.date,
     time:request.time,mode:request.mode},when);
   }catch(_){continue}
   if(signal?.aborted)return {status:"cancelled",routes:[]};
   if(result?.status!=="ok"||result?.source!=="BKK Zrt., CC BY 4.0"||
    result?.coverage!=="stop-to-stop"||result?.live!==false)continue;
   for(const journey of (result.results||[]).slice(0,5)){
    const legs=journey.legs||[];
    const ids=nodesForLegs(legs,pair,graph,"bkk");
    if(!ids)continue;
    const mapped=legs.map((l,i)=>({
     provider:"bkk",mode:l.mode,line:clean(l.line),
     fromNode:ids[i].fromNode,toNode:ids[i].toNode,
     departure:l.departure,arrival:l.arrival,verified:true,
     timetableVerified:true,source:"BKK Zrt., CC BY 4.0",
     sourceUrl:"https://opendata.bkk.hu/data-sources"
    }));
    if(mapped.every(x=>x.line))routes.push({legs:mapped});
   }
  }
  return {status:routes.length?"ok":"not_covered",routes};
 };
}
export {createLocalGTFSAdapter,createBkkAdapter,pairsFor,resolveNode,whenIso};
