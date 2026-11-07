/* SHO Matrix Search V4 · isolated pilot, no production imports.
 * Three independent, parallel timetable providers. Explicit canonical nodes
 * and verified walk edges are mandatory: NEVER invent a cross-provider link.
 * No GPT calls, network access, cloud writes, private GTFS reads or live ETA.
 * A provider adapter is responsible for source licensing and schedule validity.
 */
const SCHEMA="sho.matrix-search/4";
const SOURCES=Object.freeze(["bkk","mav","volan"]);
const MODES=new Set(["walk","bus","train","tram","metro","hev","other"]);
const TRANSIT=new Set(["bus","train","tram","metro","hev","other"]);
const clean=(v,n=120)=>typeof v==="string"?v.replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,n):"";
const epoch=x=>{
 if(typeof x!=="string"||!/\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(x))return NaN;
 return Date.parse(x);
};
const hh=t=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(t));
const day=t=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(t)).map(x=>[x.type,x.value]));
 return p.year+"-"+p.month+"-"+p.day;
};
const mins=ms=>Math.round(ms/60000);
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const yes=x=>x===true;
function parseRules(raw){
 if(!raw||raw.schema!=="sho.matrix-rules/4"||
  JSON.stringify(raw.parallel?.sources)!==JSON.stringify(SOURCES)||
  raw.output?.tripPackSchema!=="sh9.trip-pack/1"||
  raw.connections?.mustMatchVerifiedCanonicalNodeId!==true||
  raw.connections?.verifiedWalkEdgeRequiredForDistinctNodes!==true||
  raw.output?.allowUnverifiedEndToEnd!==false||
  !Number.isInteger(raw.parallel?.deadlineMs)||raw.parallel.deadlineMs<250||
  raw.parallel.deadlineMs>10000||
  !Number.isInteger(raw.parallel?.maxLegs)||raw.parallel.maxLegs<2||
  raw.parallel.maxLegs>12||
  !Number.isInteger(raw.parallel?.maxPaths)||raw.parallel.maxPaths<1||
  raw.parallel.maxPaths>1000)return null;
 const c=raw.connections,r=raw.ranking;
 if(![c.bkkToBkkMinMinutes,c.intercityTransferMinMinutes,
  c.walkToLocalMinMinutes,c.maxWaitMinutes].every(x=>Number.isInteger(x)&&x>=0&&x<=180)||
  !Array.isArray(r?.distancePreference)||
  JSON.stringify(r.distancePreference)!==JSON.stringify(
   ["direct_volan","sajo_express","other_express","other"])||
  !Number.isInteger(r.maxTransfers)||r.maxTransfers<0||r.maxTransfers>8)return null;
 return Object.freeze({
  deadlineMs:raw.parallel.deadlineMs,maxRoutes:raw.parallel.maxRoutesPerSource||40,
  maxLegs:raw.parallel.maxLegs,maxPaths:raw.parallel.maxPaths,
  localTransferMin:c.bkkToBkkMinMinutes,intercityTransferMin:c.intercityTransferMinMinutes,
  walkToLocalMin:c.walkToLocalMinMinutes,maxWaitMin:c.maxWaitMinutes,
  maxTransfers:r.maxTransfers
 });
}
function validQuery(q){
 return q&&typeof q==="object"&&
  ["depart","arrive","now"].includes(q.mode)&&
  /^\d{4}-\d{2}-\d{2}$/.test(q.date||"")&&
  Number.isFinite(Date.parse(q.date+"T12:00:00Z"))&&
  new Date(q.date+"T12:00:00Z").toISOString().slice(0,10)===q.date&&
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(q.time||"")&&
  clean(q.from).length>1&&clean(q.to).length>1&&clean(q.from)!==clean(q.to)&&
  ["z","m"].includes(q.profile)&&
  ["balanced","walk","wait","transfers"].includes(q.priority||"balanced");
}
function validGraph(graph){
 if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length<2||
  graph.nodes.length>100||typeof graph.originNode!=="string"||
  typeof graph.destinationNode!=="string")return null;
 const nodes=new Map();
 for(const n of graph.nodes){
  if(!n||!/^[a-zA-Z0-9_-]{1,48}$/.test(n.id||"")||
   !clean(n.name)||nodes.has(n.id))return null;
  nodes.set(n.id,clean(n.name));
 }
 if(!nodes.has(graph.originNode)||!nodes.has(graph.destinationNode)||
  graph.originNode===graph.destinationNode)return null;
 return {nodes,origin:graph.originNode,destination:graph.destinationNode};
}
function normalizedLeg(leg,provider,nodes){
 if(!leg||typeof leg!=="object"||leg.provider!==provider||
  !MODES.has(leg.mode)||clean(leg.line,55).length===0||
  !nodes.has(leg.fromNode)||!nodes.has(leg.toNode)||
  leg.fromNode===leg.toNode||leg.verified!==true||
  !clean(leg.source,100)||typeof leg.sourceUrl!=="string")return null;
 let url;
 try{
  url=new URL(leg.sourceUrl);
  if(url.protocol!=="https:"||url.username||url.password)return null;
 }catch(_){return null}
 const start=epoch(leg.departure),end=epoch(leg.arrival);
 if(!finite(start)||!finite(end)||end<=start||end-start>24*3600000)return null;
 // Overnight train/bus services are valid with offset-aware timestamps.
 // Their source timetable and actual arrival must remain independently verified.
 if(leg.mode==="walk"){
  if(leg.geometryVerified!==true||!finite(leg.walkMeters)||leg.walkMeters<0||
   leg.walkMeters>5000)return null;
 }else if(!TRANSIT.has(leg.mode)||leg.timetableVerified!==true)return null;
 return Object.freeze({
  provider,mode:leg.mode,line:clean(leg.line,55),fromNode:leg.fromNode,toNode:leg.toNode,
  departure:start,arrival:end,source:clean(leg.source,100),sourceUrl:url.href,
  walkMeters:leg.mode==="walk"?Math.round(leg.walkMeters):0,
  realTime:false,verified:true,geometryVerified:leg.mode==="walk"
 });
}
function parseProviderResult(name,response,graph,query,config){
 if(!response||response.status!=="ok"||!Array.isArray(response.routes))return [];
 const out=[],max=Math.min(80,Math.max(1,config.maxRoutes));
 for(const item of response.routes.slice(0,max)){
  if(!item||!Array.isArray(item.legs)||!item.legs.length||
   item.legs.length>config.maxLegs)continue;
  const legs=item.legs.map(l=>normalizedLeg(l,name,graph.nodes));
  if(legs.some(x=>!x))continue;
  let ok=true;
  for(let i=1;i<legs.length;i++){
   if(legs[i-1].toNode!==legs[i].fromNode||legs[i].departure<legs[i-1].arrival){
    ok=false;break;
   }
  }
  if(!ok||legs.at(-1).arrival-legs[0].departure>36*3600000)continue;
  out.push(...legs);
 }
 // Each timetable edge remains independently verified. Never interpolate stops.
 const unique=new Map();
 for(const leg of out){
  const k=[name,leg.mode,leg.line,leg.fromNode,leg.toNode,leg.departure,leg.arrival].join("|");
  if(!unique.has(k))unique.set(k,leg);
 }
 return [...unique.values()];
}
function minTransfer(a,b,config){
 if(!a)return 0;
 if(b.mode==="walk")return 0;
 if(a.mode==="walk")return b.provider==="bkk"?config.walkToLocalMin:config.intercityTransferMin;
 if(b.provider==="mav"||b.provider==="volan"||a.provider==="mav"||a.provider==="volan")
  return config.intercityTransferMin;
 return config.localTransferMin;
}
function category(legs){
 const intercity=legs.filter(x=>x.provider==="mav"||x.provider==="volan");
 if(intercity.length===1&&intercity[0].provider==="volan")return "direct_volan";
 if(intercity.length===1&&intercity[0].provider==="mav"&&
  /saj[oó]/i.test(intercity[0].line))return "sajo_express";
 if(intercity.some(x=>x.provider==="mav"&&/(?:^|\s)(?:IC|EC|RJ|EX|expressz)(?:\s|\d|$)/i.test(x.line)))
  return "other_express";
 return "other";
}
function evaluate(legs,request,config){
 if(!legs.length)return null;
 const transit=legs.filter(x=>x.mode!=="walk");
 if(!transit.length)return null;
 const transfers=Math.max(0,transit.length-1);
 if(transfers>config.maxTransfers)return null;
 const walkMeters=legs.reduce((s,x)=>s+x.walkMeters,0);
 let waitingMs=0;
 for(let i=1;i<legs.length;i++)waitingMs+=Math.max(0,legs[i].departure-legs[i-1].arrival);
 const durationMs=legs.at(-1).arrival-legs[0].departure;
 const priority=category(legs);
 const ranking=["direct_volan","sajo_express","other_express","other"].indexOf(priority);
 const quality=mins(durationMs)+transfers*11+walkMeters/80+mins(waitingMs)*0.3;
 const preference=request.priority==="transfers"?transfers*100+quality:
  request.priority==="walk"?walkMeters/7+quality:
  request.priority==="wait"?mins(waitingMs)*5+quality:quality;
 return {category:priority,rank:ranking,score:preference,transfers,walkMeters,
  waitingMinutes:mins(waitingMs),durationMinutes:mins(durationMs)};
}
function validRequestTime(legs,q){
 if(!legs?.length)return false;
 const start=legs[0].departure,end=legs.at(-1).arrival;
 if(q.mode==="arrive"){
  return day(end)===q.date&&hh(end)<=q.time;
 }
 return day(start)===q.date&&hh(start)>=q.time;
}
function join(legs,request,graph,config){
 const byNode=new Map();
 for(const e of legs){
  if(!byNode.has(e.fromNode))byNode.set(e.fromNode,[]);
  byNode.get(e.fromNode).push(e);
 }
 for(const list of byNode.values())list.sort((a,b)=>a.departure-b.departure);
 const complete=[],seen=new Set(),path=[],visited=new Set([graph.origin]);
 let explored=0,invalidConnections=0;
 function dfs(node){
  if(explored>=config.maxPaths||complete.length>=80)return;
  if(node===graph.destination){
   if(!validRequestTime(path,request))return;
   const metric=evaluate(path,request,config);
   if(!metric)return;
   const hash=path.map(x=>[x.provider,x.line,x.departure,x.toNode].join(":")).join("|");
   if(!seen.has(hash)){seen.add(hash);complete.push({legs:[...path],metric})}
   return;
  }
  if(path.length>=config.maxLegs)return;
  const options=byNode.get(node)||[];
  for(const edge of options){
   if(explored>=config.maxPaths)break;
   explored++;
   if(visited.has(edge.toNode))continue;
   const prev=path.at(-1);
   if(prev){
    const gap=edge.departure-prev.arrival;
    const buffer=minTransfer(prev,edge,config)*60000;
    if(gap<buffer||gap>config.maxWaitMin*60000){invalidConnections++;continue}
   }else if(request.mode!=="arrive"&&
     (day(edge.departure)!==request.date||hh(edge.departure)<request.time))continue;
   path.push(edge);visited.add(edge.toNode);
   dfs(edge.toNode);
   visited.delete(edge.toNode);path.pop();
  }
 }
 dfs(graph.origin);
 complete.sort((a,b)=>a.metric.rank-b.metric.rank||
  a.metric.score-b.metric.score||
  a.legs.at(-1).arrival-b.legs.at(-1).arrival);
 return {best:complete[0]||null,total:complete.length,explored,invalidConnections};
}
function toTripPack(best,request,graph){
 if(!best||!best.legs.length||best.legs[0].fromNode!==graph.origin||
  best.legs.at(-1).toNode!==graph.destination)throw Error("no_verified_complete_itinerary");
 const from=clean(request.from),to=clean(request.to);
 const segments=best.legs.map(x=>({
  mode:x.mode,line:x.line,from:graph.nodes.get(x.fromNode),to:graph.nodes.get(x.toNode),
  departure:hh(x.departure),arrival:hh(x.arrival),
  status:x.mode==="walk"?"estimated":"timetable",
  note:x.mode==="walk"?"Igazolt gyalogos kapcsolat; idő becsült.":
   x.source+"; valós idejű késés nincs ellenőrizve."
 }));
 const sources=new Map(best.legs.map(x=>[x.source,x.sourceUrl]));
 const metrics=best.metric;
 return {schema:"sh9.trip-pack/1",title:from+" → "+to,travelDate:request.date,
  from,to,departure:hh(best.legs[0].departure),arrival:hh(best.legs.at(-1).arrival),
  arrivalStatus:best.legs.at(-1).mode==="walk"?"estimated":"timetable",
  summary:"Menetrendi útvonal · "+metrics.transfers+" átszállás, "+
   metrics.waitingMinutes+" perc várakozás, "+metrics.walkMeters+
   " m ellenőrzött gyaloglás. Nem élő járatállapot.",
  segments,
  alerts:[{title:"Menetrend, nem valós idejű adat",
   text:"Indulás előtt ellenőrizd az aktuális járatváltozásokat és késéseket."}],
  alternatives:[],sources:[...sources].map(([name,url])=>({name,url}))};
}
function providerTask(name,fn,{request,graph,signal,deadlineMs,clock,
 setTimer,clearTimer}){
 const start=clock();
 if(typeof fn!=="function")return Promise.resolve({name,status:"not_connected",routes:[],elapsedMs:0});
 return new Promise(resolve=>{
  let done=false;
  const controller=new AbortController();
  function finish(status,routes=[]){
   if(done)return;
   done=true;clearTimer(timer);
   signal?.removeEventListener("abort",abort);
   resolve({name,status,routes,elapsedMs:Math.max(0,Math.round(clock()-start))});
  }
  function abort(){controller.abort();finish("cancelled")}
  const timer=setTimer(()=>{controller.abort();finish("timeout")},deadlineMs);
  if(signal)signal.addEventListener("abort",abort,{once:true});
  if(signal?.aborted){abort();return}
  Promise.resolve().then(()=>fn({request,graph,signal:controller.signal})).then(
   r=>controller.signal.aborted?finish("cancelled"):finish(r?.status==="ok"?"ok":
    typeof r?.status==="string"?r.status:"unavailable",r?.routes||[]),
   ()=>finish(controller.signal.aborted?"cancelled":"error")
  );
 });
}
function createMatrixSearch({services={},rules,clock=()=>performance.now(),
 setTimer=(f,ms)=>setTimeout(f,ms),clearTimer=t=>clearTimeout(t)}={}){
 const config=parseRules(rules);
 if(!config)throw Error("invalid_matrix_rules");
 async function run({request,graph,signal}={}){
  if(!validQuery(request))return {schema:SCHEMA,status:"invalid_request",tripPack:null};
  const nodes=validGraph(graph);
  if(!nodes)return {schema:SCHEMA,status:"invalid_graph",tripPack:null};
  const start=clock();
  const results=await Promise.all(SOURCES.map(name=>providerTask(name,services[name],{
   request,graph,signal,deadlineMs:config.deadlineMs,clock,setTimer,clearTimer})));
  const telemetry={providerMs:Object.fromEntries(results.map(x=>[x.name,x.elapsedMs])),
   providerStatus:Object.fromEntries(results.map(x=>[x.name,x.status])),
   joinMs:0,totalMs:0,pathsEvaluated:0,completeRoutes:0,invalidConnections:0};
  if(signal?.aborted)return {schema:SCHEMA,status:"cancelled",tripPack:null,telemetry};
  const joinStarted=clock();
  const edges=results.flatMap(r=>parseProviderResult(r.name,
   {status:r.status,routes:r.routes},nodes,request,config));
  const linked=join(edges,request,nodes,config);
  telemetry.joinMs=Math.max(0,Math.round(clock()-joinStarted));
  telemetry.totalMs=Math.max(0,Math.round(clock()-start));
  telemetry.pathsEvaluated=linked.explored;
  telemetry.completeRoutes=linked.total;
  telemetry.invalidConnections=linked.invalidConnections;
  if(!linked.best)return {schema:SCHEMA,status:"no_verified_complete_route",
   tripPack:null,telemetry,sourceCount:Object.fromEntries(results.map(x=>[x.name,x.routes.length]))};
  const tripPack=toTripPack(linked.best,request,nodes);
  return {schema:SCHEMA,status:"ready",tripPack,telemetry,
   selection:linked.best.metric,sourceCount:Object.fromEntries(results.map(x=>[x.name,x.routes.length])),
   warning:"Menetrendi adat, nem élő útvonal vagy ETA."};
 }
 return Object.freeze({run});
}
// This is a local, deterministic fallback description, NOT a GPT-generated story.
// Hosts may asynchronously replace it with an AI response after itinerary display.
function quickLenaTouch(pack,{name=""}={}){
 if(!pack||pack.schema!=="sh9.trip-pack/1"||!Array.isArray(pack.segments)||
  pack.segments.length===0)return "";
 const rides=pack.segments.filter(s=>s.mode!=="walk");
 const direct=rides.length===1;
 const hasLong=pack.segments.some(s=>s.mode==="train"||s.mode==="bus");
 const intro=clean(name,36)?clean(name,36)+", ":"";
 const first=direct?(hasLong?"ezzel a közvetlen járattal":"ezzel a közvetlen kapcsolattal"):
  "ezzel az összeállított, "+Math.max(0,rides.length-1)+" átszállásos útvonallal";
 return intro+"a menetrend alapján "+first+" indulnék. "+
  "A járatokat és az esetleges késéseket indulás előtt érdemes újra ellenőrizni.";
}
export {SCHEMA,SOURCES,parseRules,validQuery,validGraph,
 createMatrixSearch,quickLenaTouch};
