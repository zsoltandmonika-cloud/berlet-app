/* Smart Arrival v793 preview: BKK GTFS-RT VehiclePositions -> scoped JSON.
 * Secret BKK_API_KEY stays in Supabase Edge Function environment.
 * Public status checks never fetch the upstream feed. Live requests verify Supabase Auth JWT.
 * No fallback/fake vehicle positions and no untrusted route short-name inference.
 */
import Gtfs from "npm:gtfs-realtime-bindings@2.2.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGIN="https://zsoltandmonika-cloud.github.io";
const SOURCE="BKK Zrt., CC BY 4.0";
const GTFS_URL="https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-catalog-v801.json";
const BKK_VEHICLES="https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full/VehiclePositions.pb";
const MAX_AGE_S=90;
const LEGACY=new Set(["bus:260","tram:17","tram:19","tram:1","tram:41"]);
const ROUTE_KEY=/^(?:bus|tram|trolley|metro|hev|other):[A-Za-z0-9_-]{1,16}$/;
type RouteInfo={routeId:string,routeKey:string,mode:string};
type RouteMap=Map<string,RouteInfo>;
let routeCache:{at:number,map:RouteMap}|null=null;
let feedCache:{at:number,payload:Record<string,unknown>}|null=null;

function headers(request:Request){
 const origin=request.headers.get("origin");
 return {
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
  "Vary":"Origin",
  "Access-Control-Allow-Origin":origin===ALLOWED_ORIGIN?ALLOWED_ORIGIN:"null",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
  "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type"
 };
}
function reply(req:Request,status:number,data:Record<string,unknown>){
 return new Response(JSON.stringify(data),{status,headers:headers(req)});
}
async function routeMap():Promise<RouteMap>{
 if(routeCache&&Date.now()-routeCache.at<300000)return routeCache.map;
 const res=await fetch(GTFS_URL,{signal:AbortSignal.timeout(9000),headers:{"Accept":"application/json"}});
 if(!res.ok)throw new Error("route-map-unavailable");
 const doc=await res.json();
 if(doc?.schemaVersion!==1||doc?.source!==SOURCE||!Array.isArray(doc.routes)||doc.routes.length<5||doc.routes.length>3000||typeof doc.generatedAt!=="string")throw new Error("route-map-invalid");
 const date=Date.parse(doc.generatedAt);
 if(!Number.isFinite(date)||Math.abs(Date.now()-date)>45*86400000)throw new Error("route-map-stale");
 const ids=new Map<string,RouteInfo>(),keys=new Set<string>();
 for(const r of doc.routes){
  if(typeof r?.mode!=="string"||typeof r?.id!=="string")throw new Error("route-map-invalid");
  const routeKey=r.mode+":"+r.id;
  if(!ROUTE_KEY.test(routeKey)||keys.has(routeKey)||!Array.isArray(r.gtfsRouteIds)||!r.gtfsRouteIds.length||r.gtfsRouteIds.length>10)throw new Error("route-map-invalid");
  keys.add(routeKey);
  for(const gtfsId of r.gtfsRouteIds){
   if(typeof gtfsId!=="string"||!gtfsId||gtfsId.length>40||ids.has(gtfsId))throw new Error("route-map-invalid");
   ids.set(gtfsId,{routeId:r.id,routeKey,mode:r.mode});
  }
 }
 if(ids.get("2600")?.routeKey!=="bus:260")throw new Error("route-map-pending");
 routeCache={at:Date.now(),map:ids};
 return ids;
}
// Strict geography validation: anonymous/bad requests must not trigger a costly upstream query.
function sh9Bounds(raw:string|null){
 if(!raw||raw.length>105)return null;
 const parts=raw.split(",");if(parts.length!==4)return null;
 const v=parts.map(x=>Number(x));
 if(v.some(x=>!Number.isFinite(x)))return null;
 const [west,south,east,north]=v;
 // Budapest and nearby outer BKK service area. Prevent accidental world-wide map payloads.
 if(west<16||east>23||south<45||north>49||west>=east||south>=north)return null;
 return {west,south,east,north};
}
function unixSeconds(value:unknown):number{
 if(value==null)return NaN;
 const n=Number(typeof value==="object"&&"toString" in value?value.toString():value);
 return Number.isSafeInteger(n)?n:NaN;
}

/* BKK GTFS-RT TripUpdates, fetched alongside vehicle positions.  Missing,
 * stale or ambiguous updates never create a "punctual" badge. */
const BKK_UPDATES="https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full/TripUpdates.pb";
const safeStop=(x:unknown)=>typeof x==="string"&&/^(?:BKK_)?[A-Za-z0-9_-]{2,30}$/.test(x)?x.replace(/^BKK_/,""):null;
const signedDelay=(x:unknown)=>Number.isInteger(x)&&Number(x)>=-1800&&Number(x)<=7200?Number(x):null;
// protobuf.js may expose optional int32 delay=0 through the message prototype,
// even when the realtime feed DID NOT include it.  Own-property presence is
// mandatory: only an explicitly transmitted 0 seconds warrants green 0p.
function explicitDelay(event:any):number|null{
 if(!event||typeof event!=="object"||!Object.prototype.hasOwnProperty.call(event,"delay"))return null;
 return signedDelay(event.delay);
}

/* v934: planned BKK GTFS comparison for GTFS-RT updates that carry
 * a prediction TIME but no explicit delay. The pre-existing official v859
 * schedule is a per-minute index, so inferred offsets are APPROXIMATE.
 * An inferred zero must NEVER be represented as confirmed green punctuality.
 * No extra BKK API queries, and no invented journey/time values. */
const PLAN_URL="https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-timetable-v859.json";
type PlannedStop={arrival:number,departure:number};
type PlannedTrip={routeKey:string,stops:Map<string,PlannedStop|null>};
type PlannedIndex=Map<string,PlannedTrip[]>;
let planCache:{at:number,data:PlannedIndex|null}|null=null;
async function loadPlan():Promise<PlannedIndex|null>{
 const now=Date.now();
 if(planCache&&now-planCache.at<(planCache.data?1800000:90000))return planCache.data;
 try{
  const res=await fetch(PLAN_URL,{signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
  if(!res.ok)throw Error("plan-http");
  const bytes=await res.arrayBuffer();
  if(bytes.byteLength<1000||bytes.byteLength>20500000)throw Error("plan-size");
  const doc=JSON.parse(new TextDecoder().decode(bytes));
  const stamp=Date.parse(doc?.generatedAt);
  if(doc?.schemaVersion!==1||doc?.source!==SOURCE||
    doc?.feedType!=="BKK GTFS schedule - planned departures, NOT realtime"||
    !Array.isArray(doc.trips)||doc.trips.length<50||doc.trips.length>250000||
    !Number.isFinite(stamp)||stamp>now+60000||now-stamp>36*3600000)throw Error("plan-invalid");
  const index:PlannedIndex=new Map();
  const trams=new Set(["1","17","19","41"]);
  const buses=new Set(["260","218","923","934"]);
  for(const item of doc.trips){
   if(!Array.isArray(item)||item.length!==3||typeof item[0]!=="string"||
      typeof item[1]!=="string"||!item[1]||item[1].length>120||
      !Array.isArray(item[2])||item[2].length<2||item[2].length>300)continue;
   const mode=trams.has(item[0])?"tram":buses.has(item[0])?"bus":null;
   if(!mode)continue;
   const stops=new Map<string,PlannedStop|null>();
   for(const entry of item[2]){
    if(!Array.isArray(entry)||entry.length!==3)continue;
    const stop=safeStop(entry[0]);
    const arr=entry[1],dep=entry[2];
    if(!stop||!Number.isSafeInteger(arr)||!Number.isSafeInteger(dep)||
      arr>dep||arr<10000000||dep>100000000)continue;
    if(stops.has(stop)){stops.set(stop,null);continue}
    stops.set(stop,{arrival:arr*60,departure:dep*60});
   }
   if(stops.size<2)continue;
   const prior=index.get(item[1])||[];
   if(prior.length>=5)continue;
   prior.push({routeKey:mode+":"+item[0],stops});
   index.set(item[1],prior);
  }
  if(index.size<30)throw Error("plan-empty");
  planCache={at:Date.now(),data:index};return index;
 }catch(_){planCache={at:Date.now(),data:null};return null}
}
type EstimatedDelay={seconds:number,routeKey:string,kind:"arrival"|"departure"};
function plannedDelay(index:PlannedIndex|null,tripId:string,routeKey:string|null,
 stopId:string|null,at:number,kind:"arrival"|"departure"):EstimatedDelay|null{
 if(!index||!stopId||!Number.isSafeInteger(at))return null;
 let result:EstimatedDelay|null=null;
 for(const trip of index.get(tripId)||[]){
  if(routeKey&&trip.routeKey!==routeKey)continue;
  const stop=trip.stops.get(stopId);
  if(!stop)continue; // Includes repeated/ambiguous stop IDs.
  const seconds=at-stop[kind];
  if(signedDelay(seconds)===null)continue;
  const rounded=Math.round(seconds/60)*60;
  if(signedDelay(rounded)===null)continue;
  if(result)return null; // Multiple plausible service days: fail closed.
  result={seconds:rounded,routeKey:trip.routeKey,kind};
 }
 return result;
}

type DelayRow={routeKey:string,stopId:string,stopSequence:number,scheduledMs:number|null,predictedMs:number|null,delaySeconds:number,asOf:string,delayPrecision?:"minute"};
type DelayTrip={routeKey:string|null,startDate:string,rows:DelayRow[],tripDelaySeconds:number|null};
type DelayPayload={trips:Map<string,DelayTrip>,departures:DelayRow[],asOf:string,
 stats:{stopLevel:number,tripLevel:number,missingDelay:number,estimated:number}};
async function getUpdates(key:string,mapping:RouteMap):Promise<DelayPayload|null>{
 try{
  const planPromise=loadPlan();
  const u=new URL(BKK_UPDATES);u.searchParams.set("key",key);
  const res=await fetch(u.href,{signal:AbortSignal.timeout(6500),headers:{Accept:"application/x-protobuf"}});
  if(!res.ok)return null;
  const bytes=new Uint8Array(await res.arrayBuffer());
  if(!bytes.length||bytes.length>12000000)return null;
  const feed:any=(Gtfs as any).transit_realtime.FeedMessage.decode(bytes);
  const stamp=unixSeconds(feed?.header?.timestamp),now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(stamp)||stamp>now+10||now-stamp>MAX_AGE_S)return null;
  const plan=await planPromise;
  const asOf=new Date(stamp*1000).toISOString(),trips=new Map<string,DelayTrip>(),departures:DelayRow[]=[];
  const stats={stopLevel:0,tripLevel:0,missingDelay:0,estimated:0};
  for(const e of (Array.isArray(feed?.entity)?feed.entity:[])){
   const tu=e?.tripUpdate,descriptor=tu?.trip;
   const id=typeof descriptor?.tripId==="string"?descriptor.tripId:"";
   // A GTFS-RT TripDescriptor may omit route_id when trip_id identifies it.
   // The exact paired VehiclePosition supplies independently validated route.
   const hasRoute=!!descriptor&&Object.prototype.hasOwnProperty.call(descriptor,"routeId")
    &&typeof descriptor.routeId==="string"&&descriptor.routeId.length>0;
   const mapped=hasRoute?mapping.get(descriptor.routeId):null;
   if(!id||id.length>160||(hasRoute&&!mapped))continue;
   // Trip delay is a separate, official GTFS-RT field.  The earlier
   // StopTimeEvent-only filter dropped this valid source completely.
   // A trip with no static schedule (cancelled, new, unscheduled, etc.) is
   // never treated as punctual relative to a scheduled departure.
   const relation=descriptor?.scheduleRelationship;
   if(relation!==undefined&&relation!==0)continue;
   const tripDelaySeconds=explicitDelay(tu);
   // Optional timestamp inherits protobuf default 0 when absent.
   const time=tu&&Object.prototype.hasOwnProperty.call(tu,"timestamp")?unixSeconds(tu.timestamp):NaN;
   if(Number.isFinite(time)&&(time>now+10||now-time>MAX_AGE_S))continue;
   if(tripDelaySeconds!==null)stats.tripLevel++;
   const rows:DelayRow[]=[];
   for(const st of (Array.isArray(tu?.stopTimeUpdate)?tu.stopTimeUpdate:[])){
    // SKIPPED and NO_DATA do not supply a valid prediction for this stop.
    if(st?.scheduleRelationship===1||st?.scheduleRelationship===2)continue;
    const stopId=safeStop(st?.stopId),dep=explicitDelay(st?.departure),arr=explicitDelay(st?.arrival);
    if(!stopId)continue;
    // Protobuf inherited time=0 is not a transmitted prediction.
    const depAt=st?.departure&&Object.prototype.hasOwnProperty.call(st.departure,"time")?
     unixSeconds(st.departure.time):NaN;
    const arrAt=st?.arrival&&Object.prototype.hasOwnProperty.call(st.arrival,"time")?
     unixSeconds(st.arrival.time):NaN;
    const inferred=dep===null&&arr===null?
      plannedDelay(plan,id,mapped?.routeKey||null,stopId,depAt,"departure")||
      plannedDelay(plan,id,mapped?.routeKey||null,stopId,arrAt,"arrival"):null;
    const delaySeconds=dep??arr??inferred?.seconds??null;
    const routeKey=mapped?.routeKey||inferred?.routeKey||null;
    if(delaySeconds===null||!routeKey)continue;
    const predicted=inferred?.kind==="arrival"?arrAt:Number.isFinite(depAt)?depAt:arrAt;
    if(Number.isFinite(predicted)&&(predicted<now-180||predicted>now+14400))continue;
    stats.stopLevel++;
    if(inferred)stats.estimated++;
    const row:DelayRow={routeKey,stopId,
     stopSequence:Number.isInteger(st?.stopSequence)?Number(st.stopSequence):-1,
     scheduledMs:Number.isFinite(predicted)?(predicted-delaySeconds)*1000:null,
     predictedMs:Number.isFinite(predicted)?predicted*1000:null,delaySeconds,asOf,
     ...(inferred?{delayPrecision:"minute" as const}:{})};
    rows.push(row);
    // Boarding verification requires an explicit departure update, not an
    // arrival-only delay copied into a scheduled stop departure.
    if(dep!==null&&Number.isFinite(depAt)&&depAt>=now-180&&depAt<=now+14400&&departures.length<8000)
     departures.push({...row,scheduledMs:(depAt-dep)*1000,predictedMs:depAt*1000,delaySeconds:dep});
   }
   if(rows.length||tripDelaySeconds!==null)trips.set(id,{routeKey:mapped?.routeKey||null,
    startDate:typeof descriptor?.startDate==="string"?descriptor.startDate:"",rows,tripDelaySeconds});
   else stats.missingDelay++;
  }
  return {trips,departures,asOf,stats};
 }catch(_){return null}
}

async function fetchLive():Promise<Record<string,unknown>>{
 if(feedCache&&Date.now()-feedCache.at<12500)return feedCache.payload;
 const key=Deno.env.get("BKK_API_KEY");
 if(!key)throw new Error("bkk-key-unconfigured");
 const mapping=await routeMap();
 const updatesPromise=getUpdates(key,mapping);
 const url=new URL(BKK_VEHICLES);
 url.searchParams.set("key",key);
 let res:Response;
 try{res=await fetch(url.href,{signal:AbortSignal.timeout(10000),headers:{"Accept":"application/x-protobuf"}})}
 catch(_){throw new Error("bkk-network-unavailable")}
 if(!res.ok)throw new Error("bkk-http-"+String(res.status));
 const bytes=new Uint8Array(await res.arrayBuffer());
 if(!bytes.length||bytes.length>12000000)throw new Error("bkk-payload-invalid");
 let feed:any;
 try{feed=(Gtfs as any).transit_realtime.FeedMessage.decode(bytes)}
 catch(_){throw new Error("bkk-protobuf-invalid")}
 const timestamp=unixSeconds(feed?.header?.timestamp);
 const now=Math.floor(Date.now()/1000);
 if(!Number.isFinite(timestamp)||timestamp<now-MAX_AGE_S||timestamp>now+10)throw new Error("bkk-feed-stale");
 const updates=await updatesPromise;
 const seen=new Set<string>();
 const vehicles=[];
 for(const entity of (Array.isArray(feed?.entity)?feed.entity:[])){
  const v=entity?.vehicle;
  const id=String(v?.vehicle?.id||entity?.id||"");
  const routeId=v?.trip?.routeId;
  const route=typeof routeId==="string"?mapping.get(routeId):null;
  const lat=Number(v?.position?.latitude),lng=Number(v?.position?.longitude);
  const observed=unixSeconds(v?.timestamp);
  if(!route||!id||seen.has(id)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180
   ||!Number.isFinite(observed)||observed<now-MAX_AGE_S||observed>now+10)continue;
  seen.add(id);
  // Only the BKK vehicle descriptor identifies the physical vehicle. Entity IDs
  // are used for map-marker identity, NEVER shown as a fleet/vehicle number.
  const descriptor=v?.vehicle;
  const label=typeof descriptor?.label==="string"?descriptor.label.trim().slice(0,64):"";
  const number=typeof descriptor?.id==="string"?descriptor.id.trim().slice(0,64):"";
  const plate=typeof descriptor?.licensePlate==="string"?descriptor.licensePlate.trim().slice(0,32):"";
  const entry:Record<string,unknown>={id,routeId:route.routeId,routeKey:route.routeKey,mode:route.mode,
   lat,lng,timestamp:new Date(observed*1000).toISOString()};
  if(label)entry.vehicleLabel=label;
  if(number)entry.vehicleNumber=number;
  if(plate)entry.licensePlate=plate;
  const tripId=typeof v?.trip?.tripId==="string"?v.trip.tripId:"";
  const update=updates?.trips.get(tripId);
  if(update&&(update.routeKey===null||update.routeKey===route.routeKey)&&
   (!update.startDate||!v?.trip?.startDate||update.startDate===v.trip.startDate)){
   const seq=Number.isInteger(v?.currentStopSequence)?Number(v.currentStopSequence):null;
   const next=update.rows.find(p=>p.routeKey===route.routeKey&&(seq===null||p.stopSequence<0||p.stopSequence>=seq)&&
     (p.predictedMs===null||p.predictedMs>=Date.now()-120000));
   if(next){
    // Stop-specific deviation has precedence over trip-level deviation.
    entry.delaySeconds=next.delaySeconds;entry.delayStopId=next.stopId;entry.delayObservedAt=next.asOf;
    if(next.delayPrecision==="minute")entry.delayPrecision="minute";
   }else if(update.tripDelaySeconds!==null){
    // Only a real, explicitly present TripUpdate.delay is accepted.
    // Never substitute protobuf's inherited zero, nor infer from GPS.
    entry.delaySeconds=update.tripDelaySeconds;entry.delayObservedAt=updates!.asOf;
   }
  }
  vehicles.push(entry);
 }
 const payload={schemaVersion:1,source:SOURCE,feedType:"GTFS-RT VehiclePositions",
  generatedAt:new Date(timestamp*1000).toISOString(),vehicles,
  delayGeneratedAt:updates?.asOf||null,stopPredictions:updates?.departures||[],
  delayCoverage:{feedAvailable:!!updates,stopLevel:updates?.stats.stopLevel||0,
   tripLevel:updates?.stats.tripLevel||0,estimated:updates?.stats.estimated||0,
   withDelay:vehicles.filter(v=>typeof v.delaySeconds==="number").length}};
 feedCache={at:Date.now(),payload};
 return payload;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:headers(req)});
 if(req.method!=="GET")return reply(req,405,{ok:false,reason:"method-not-allowed"});
 if(new URL(req.url).searchParams.get("status")==="1"){
  return reply(req,200,{ok:true,version:"793-preview",configured:!!Deno.env.get("BKK_API_KEY"),liveEndpoint:"auth-required"});
 }
 const token=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return reply(req,401,{ok:false,reason:"login-required"});
 const projectUrl=Deno.env.get("SUPABASE_URL");
 const anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!projectUrl||!anon)return reply(req,503,{ok:false,reason:"auth-not-configured"});
 try{
  const client=createClient(projectUrl,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await client.auth.getUser(token);
  if(result.error||!result.data.user)return reply(req,401,{ok:false,reason:"login-required"});
 }catch(_){return reply(req,401,{ok:false,reason:"login-required"})}
 // Preserve the existing five-line and favorites contracts unchanged.
 // Only the SH9 Smart Travel map opts into this separately authenticated,
 // bounded, single-request all-vehicle mode. No second BKK upstream poller.
 const query=new URL(req.url).searchParams;
 const selected=query.get("routes");
 const predictionMode=query.get("predictions")==="1";
 const stopParam=query.get("stops")||"";
 const stops=predictionMode&&stopParam.length<=1000?
  new Set(stopParam.split(",").map(safeStop).filter((x):x is string=>!!x).slice(0,32)):new Set<string>();
 const allMode=query.get("all")==="1"&&selected===null;
 const bbox=allMode?sh9Bounds(query.get("bbox")):null;
 if(allMode&&!bbox)return reply(req,400,{ok:false,reason:"invalid-sh9-viewport"});
 let allowed=LEGACY;
 if(selected!==null){
  if(selected.length>4000)return reply(req,400,{ok:false,reason:"invalid-route-selection"});
  const keys=selected?selected.split(","):[];
  if(keys.length>150||keys.some(key=>!ROUTE_KEY.test(key)))return reply(req,400,{ok:false,reason:"invalid-route-selection"});
  allowed=new Set(keys);
 }
 try{
  const payload=await fetchLive();
  const all=(payload.vehicles as Array<{routeKey:string}>);
  const matched=allMode?all.filter(v=>{
   const p=v as {lng:number,lat:number};
   return !!bbox&&p.lng>=bbox.west&&p.lng<=bbox.east&&p.lat>=bbox.south&&p.lat<=bbox.north;
  }):all.filter(v=>allowed.has(v.routeKey));
  // Default favorite response is byte-for-byte compatible with old clients.
  // SH9 transfers only minimal, verified location data inside the visible map.
  const cap=allMode?3500:1200;
  const chosen=matched.slice(0,cap);
  const vehicles=allMode?chosen.map(v=>{
   const p=v as {id:string,routeId:string,routeKey:string,mode:string,lat:number,lng:number,timestamp:string,
    delaySeconds?:number,delayObservedAt?:string,delayStopId?:string,delayPrecision?:string};
   const entry:{id:string,routeId:string,routeKey:string,mode:string,lat:number,lng:number,timestamp:string,
    delaySeconds?:number,delayObservedAt?:string,delayStopId?:string,delayPrecision?:"minute"}={
    id:p.id,routeId:p.routeId,routeKey:p.routeKey,mode:p.mode,lat:p.lat,lng:p.lng,timestamp:p.timestamp};
   // Previously the all-BKK response discarded every TripUpdates value.
   // Keep ONLY authenticated, source-verified, fresh signed trip-specific delay.
   // Never derive "0p" from the absence of a delay or from the vehicle GPS.
   const at=typeof p.delayObservedAt==="string"?Date.parse(p.delayObservedAt):NaN;
   if(Number.isInteger(p.delaySeconds)&&Number(p.delaySeconds)>=-1800&&Number(p.delaySeconds)<=7200
    &&Number.isFinite(at)&&at<=Date.now()+10000&&Date.now()-at<=90000){
    entry.delaySeconds=p.delaySeconds;
    entry.delayObservedAt=p.delayObservedAt;
    if(p.delayPrecision==="minute")entry.delayPrecision="minute";
    if(typeof p.delayStopId==="string"&&safeStop(p.delayStopId))entry.delayStopId=p.delayStopId;
   }
   return entry;
  }):chosen;
  const predictions=predictionMode&&!allMode&&stops.size?
   ((payload.stopPredictions||[]) as DelayRow[]).filter(p=>allowed.has(p.routeKey)&&stops.has(p.stopId)).slice(0,700):[];
  // Authenticated aggregate diagnostics: count which source type the BKK
  // supplied and how many matched THIS requested map/favorite scope.
  // No trip IDs, vehicle coordinates, OAuth tokens or API keys are logged.
  const rawCoverage=payload.delayCoverage as {
   feedAvailable?:boolean,stopLevel?:number,tripLevel?:number,estimated?:number
  }|undefined;
  const coverage={feedAvailable:rawCoverage?.feedAvailable===true,
   stopLevel:Number(rawCoverage?.stopLevel)||0,tripLevel:Number(rawCoverage?.tripLevel)||0,
   estimated:Number(rawCoverage?.estimated)||0,
   shown:vehicles.length,
   withDelay:vehicles.filter(v=>typeof (v as {delaySeconds?:number}).delaySeconds==="number").length};
  return reply(req,200,{...payload,delayCoverage:coverage,
   stopPredictions:predictions,vehicles,truncated:matched.length>vehicles.length});
 }
 catch(e){const reason=e instanceof Error&&/^(route-map-|bkk-)/.test(e.message)?e.message:"live-unavailable";
  return reply(req,503,{ok:false,reason,vehicles:[]})}
});
