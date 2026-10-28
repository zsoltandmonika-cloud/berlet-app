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
async function fetchLive():Promise<Record<string,unknown>>{
 if(feedCache&&Date.now()-feedCache.at<12500)return feedCache.payload;
 const key=Deno.env.get("BKK_API_KEY");
 if(!key)throw new Error("bkk-key-unconfigured");
 const mapping=await routeMap();
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
  vehicles.push(entry);
 }
 const payload={schemaVersion:1,source:SOURCE,feedType:"GTFS-RT VehiclePositions",
  generatedAt:new Date(timestamp*1000).toISOString(),vehicles};
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
   const p=v as {id:string,routeId:string,routeKey:string,mode:string,lat:number,lng:number,timestamp:string};
   return {id:p.id,routeId:p.routeId,routeKey:p.routeKey,mode:p.mode,lat:p.lat,lng:p.lng,timestamp:p.timestamp};
  }):chosen;
  return reply(req,200,{...payload,vehicles,truncated:matched.length>vehicles.length});
 }
 catch(e){const reason=e instanceof Error&&/^(route-map-|bkk-)/.test(e.message)?e.message:"live-unavailable";
  return reply(req,503,{ok:false,reason,vehicles:[]})}
});
