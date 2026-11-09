/* Smart Trip V5 · pure, reusable validation and response normalization.
 * Never makes network calls, reads secrets, writes state, calls AI, or saves.
 * Google Maps content may only be displayed in an attributed, map-free UI.
 */
export const QUERY_SCHEMA="sho.smart-trip.universal/1";
export const RESULT_SCHEMA="sho.smart-trip.universal-routes/1";
export const ROUTES_URL="https://routes.googleapis.com/directions/v2:computeRoutes";
export const GOOGLE_FIELD_MASK=[
 "routes.duration","routes.legs.steps.travelMode",
 "routes.legs.steps.staticDuration","routes.legs.steps.distanceMeters",
 "routes.legs.steps.transitDetails"
].join(",");
const MODES=new Set(["depart","arrive","now"]);
const PRIORITIES=new Set(["balanced","walk","wait","transfers","duration"]);
const NUM_KEYS=(obj,keys)=>obj&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join("|")===keys.slice().sort().join("|");
const CTL=/[\u0000-\u001f\u007f<>]/;
const hhFmt=new Intl.DateTimeFormat("en-GB",{
 timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"
});
function huWall(ms){
 const x=Object.fromEntries(hhFmt.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
 return {date:x.year+"-"+x.month+"-"+x.day,time:x.hour+":"+x.minute};
}
function label(s){
 if(typeof s!=="string"||CTL.test(s)||s.length>200)return null;
 const x=s.normalize("NFC").replace(/\s+/g," ").trim();
 return x.length>=2&&x.length<=200&&!/^(https?:\/\/|javascript:)/i.test(x)?x:null;
}
function location(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 if(raw.kind==="address"&&NUM_KEYS(raw,["kind","label"])){
  const text=label(raw.label);
  return text?{kind:"address",label:text}:null;
 }
 if(raw.kind==="coordinates"&&NUM_KEYS(raw,["kind","label","lat","lng"])&&
  Number.isFinite(raw.lat)&&Number.isFinite(raw.lng)&&
  Math.abs(raw.lat)<=90&&Math.abs(raw.lng)<=180&&label(raw.label)){
  return {kind:"coordinates",label:raw.label,lat:raw.lat,lng:raw.lng};
 }
 return null;
}
function sameLocation(a,b){
 return a.kind==="coordinates"&&b.kind==="coordinates"?
  a.lat===b.lat&&a.lng===b.lng:
  a.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===
  b.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function correctWall(q,instant){
 const hu=huWall(instant);
 return hu.date===q.date&&hu.time===q.time;
}
const googlePoint=p=>p.kind==="coordinates"?
 {location:{latLng:{latitude:p.lat,longitude:p.lng}}}:{address:p.label};
export function normalizeRequest(raw,{now=Date.now()}={}){
 if(!Number.isFinite(now)||!NUM_KEYS(raw,["mode","consent","query"])||
  !["diagnose","search"].includes(raw.mode)||raw.consent!==true)
  return {ok:false,error:"invalid_request"};
 const q=raw.query;
 if(!NUM_KEYS(q,["schema","origin","destination","mode","priority","profile",
  "date","time","when","transit","maximumElapsedMs","addressResolution"])||
  q.schema!==QUERY_SCHEMA||q.transit!==true||q.maximumElapsedMs!==30000||
  q.addressResolution!=="unverified_until_provider_response"||
  !MODES.has(q.mode)||!PRIORITIES.has(q.priority)||
  !["m","z"].includes(q.profile))return {ok:false,error:"invalid_query"};
 const origin=location(q.origin),destination=location(q.destination);
 if(!origin||!destination||sameLocation(origin,destination))
  return {ok:false,error:"invalid_locations"};
 if(typeof q.when!=="string"||!/(?:Z|[+-]\d\d:\d\d)$/.test(q.when)||
  typeof q.date!=="string"||!/^\d{4}-\d\d-\d\d$/.test(q.date)||
  typeof q.time!=="string"||!/^\d\d:\d\d$/.test(q.time))
  return {ok:false,error:"invalid_time"};
 const at=Date.parse(q.when);
 if(!Number.isFinite(at)||at<now-120_000||at>now+100*86400_000||
  !correctWall(q,at))return {ok:false,error:"invalid_time"};
 if(q.mode==="now"&&Math.abs(at-now)>120_000)
  return {ok:false,error:"stale_now"};
 const payload={
  origin:googlePoint(origin),destination:googlePoint(destination),
  travelMode:"TRANSIT",computeAlternativeRoutes:true,
  languageCode:"hu",units:"METRIC",
  ...(q.mode==="arrive"?{arrivalTime:new Date(at).toISOString()}:
   {departureTime:new Date(at).toISOString()}),
  transitPreferences:{
   allowedTravelModes:["BUS","SUBWAY","TRAIN","LIGHT_RAIL","RAIL"],
   routingPreference:q.priority==="transfers"?"FEWER_TRANSFERS":"LESS_WALKING"
  }
 };
 return {ok:true,profile:q.profile,mode:raw.mode,googlePayload:payload};
}
const duration=s=>{
 const m=typeof s==="string"&&/^(\d{1,7})(?:\.\d+)?s$/.exec(s);
 if(!m)return null;
 const n=Number(m[1]);
 return Number.isFinite(n)&&n>=0&&n<=86400?n:null;
};
const plain=(s,max=120)=>typeof s==="string"?
 s.replace(/[\u0000-\u001f\u007f<>]/g," ").trim().slice(0,max):"";
const stamp=s=>{
 if(typeof s!=="string")return null;
 const t=Date.parse(s);
 return Number.isFinite(t)?new Date(t).toISOString():null;
};
function step(item){
 if(!item||typeof item!=="object")return null;
 if(item.travelMode==="WALK"){
  const secs=duration(item.staticDuration||item.duration),meters=item.distanceMeters;
  return secs!==null&&Number.isFinite(meters)&&meters>=0&&meters<=30000?
   {kind:"walk",seconds:secs,meters:Math.round(meters)}:null;
 }
 if(item.travelMode!=="TRANSIT")return null;
 const t=item.transitDetails,stop=t?.stopDetails,line=t?.transitLine;
 const departure=stamp(stop?.departureTime),arrival=stamp(stop?.arrivalTime);
 if(!departure||!arrival||Date.parse(arrival)<=Date.parse(departure))return null;
 const from=plain(stop?.departureStop?.name),to=plain(stop?.arrivalStop?.name);
 if(!from||!to)return null;
 return {kind:"transit",from,to,departure,arrival,
  line:plain(line?.nameShort||line?.name||t?.tripShortText||"",55),
  agency:plain(line?.agencies?.[0]?.name,90),
  vehicle:plain(line?.vehicle?.type,36)};
}
export function sanitizeGoogleResponse(payload){
 if(!payload||!Array.isArray(payload.routes)||payload.routes.length>8)return null;
 const routes=[];
 for(const entry of payload.routes.slice(0,4)){
  if(!Array.isArray(entry?.legs)||entry.legs.length!==1||
   !Array.isArray(entry.legs[0]?.steps)||entry.legs[0].steps.length>45)continue;
  const secs=duration(entry.duration);
  if(secs===null||secs<1)continue;
  const steps=entry.legs[0].steps.map(step);
  if(!steps.length||steps.some(x=>!x)||!steps.some(x=>x.kind==="transit"))continue;
  routes.push({durationSeconds:secs,steps});
 }
 return {
  schema:RESULT_SCHEMA,source:"google_routes",attribution:"Google Maps",
  presentation:"map_free_text_only",ai_processing:"disabled",save:false,
  independentlyVerified:false,addressResolution:"unconfirmed_provider_match",
  routes,googleRequests:1,quotaReserved:1
 };
}
