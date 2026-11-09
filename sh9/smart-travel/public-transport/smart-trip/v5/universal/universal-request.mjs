/* SHO Smart Trip V5 · universal, provider-neutral address input contract.
 * PURE: no geocoding, no network, no billing, no Maps readback, no AI, no saving.
 * Text input is unverified until a licensed routing/geocoding provider resolves it.
 */
export const SCHEMA="sho.smart-trip.universal/1";
const DATE=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const NUM=/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
const CTL=/[\u0000-\u001f\u007f<>]/;
const MODES=new Set(["depart","arrive","now"]);
const PRIORITIES=new Set(["balanced","walk","wait","transfers","duration"]);
export const MAX_SEARCH_MS=30_000;
const fmt=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",
 year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});

function wallParts(date){
 const p=Object.fromEntries(fmt.formatToParts(date).map(x=>[x.type,x.value]));
 return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};
}
function validDay(day){
 if(typeof day!=="string"||!DATE.test(day))return false;
 const t=Date.parse(day+"T12:00:00Z");
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===day;
}
export function budapestInstant(day,time){
 if(!validDay(day)||!TIME.test(time))return {status:"invalid_local_time"};
 const wallMs=Date.parse(day+"T"+time+":00Z");
 const matches=[];
 for(const offsetHours of [1,2]){
  const t=wallMs-offsetHours*3600_000;
  const wall=wallParts(new Date(t));
  if(wall.date===day&&wall.time===time)matches.push(t);
 }
 if(!matches.length)return {status:"nonexistent_dst_time"};
 if(matches.length>1)return {status:"ambiguous_dst_time"};
 return {status:"ok",iso:new Date(matches[0]).toISOString()};
}
function normalLabel(text){
 if(typeof text!=="string"||CTL.test(text))return null;
 const clean=text.normalize("NFC").replace(/\s+/g," ").trim();
 if(clean.length<2||clean.length>200||CTL.test(clean)||
  /^https?:\/\//i.test(clean)||/^javascript:/i.test(clean))return null;
 return clean;
}
function coordinatesFromText(text){
 const p=text.split(/\s*[,;]\s*/);
 if(p.length!==2||!p.every(x=>NUM.test(x)))return null;
 const lat=Number(p[0]),lng=Number(p[1]);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||
  Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return {lat,lng};
}
export function normalizeLocation(raw){
 if(typeof raw==="string"){
  const label=normalLabel(raw);
  if(!label)return null;
  const coords=coordinatesFromText(label);
  // Numeric coordinate-like input with an impossible latitude/longitude is
  // not a street address and must not be silently forwarded to a provider.
  const pair=label.split(/\s*[,;]\s*/);
  if(!coords&&pair.length===2&&pair.every(x=>NUM.test(x)))return null;
  return Object.freeze(coords?{kind:"coordinates",label,lat:coords.lat,lng:coords.lng}:
   {kind:"address",label});
 }
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 if(raw.kind==="coordinates"&&Number.isFinite(raw.lat)&&Number.isFinite(raw.lng)&&
  Math.abs(raw.lat)<=90&&Math.abs(raw.lng)<=180){
  const label=normalLabel(raw.label)||
   raw.lat.toFixed(6)+", "+raw.lng.toFixed(6);
  return Object.freeze({kind:"coordinates",label,lat:raw.lat,lng:raw.lng});
 }
 // A typed address cannot become trusted GPS simply by carrying extra fields.
 if(raw.kind==="address")return normalizeLocation(raw.label);
 return null;
}
const samePlace=(a,b)=>a.kind==="coordinates"&&b.kind==="coordinates"?
 a.lat===b.lat&&a.lng===b.lng:
 a.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===
 b.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export function normalizeUniversalQuery(input,{now=new Date()}={}){
 if(!input||typeof input!=="object"||Array.isArray(input))return {status:"invalid_query"};
 const origin=normalizeLocation(input.from),destination=normalizeLocation(input.to);
 if(!origin||!destination)return {status:"invalid_address"};
 if(samePlace(origin,destination))return {status:"same_origin_destination"};
 const mode=input.mode||"depart",priority=input.priority||"balanced";
 if(!MODES.has(mode)||!PRIORITIES.has(priority)||!["m","z"].includes(input.profile))
  return {status:"invalid_options"};
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))return {status:"invalid_clock"};
 let when,day,time;
 if(mode==="now"){
  when=now.toISOString();
  ({date:day,time}=wallParts(now));
 }else{
  day=input.date;time=input.time;
  const zoned=budapestInstant(day,time);
  if(zoned.status!=="ok")return zoned;
  when=zoned.iso;
  // The intake rejects dates in the past, but leaves provider-specific API
  // horizon limits (e.g. Google transit) to the provider adapter.
  if(Date.parse(when)<now.getTime()-60_000)return {status:"time_in_past"};
 }
 return {status:"ok",query:Object.freeze({
  schema:SCHEMA,origin,destination,mode,priority,
  profile:input.profile,date:day,time,when,
  transit:true,maximumElapsedMs:MAX_SEARCH_MS,
  addressResolution:"unverified_until_provider_response"
 })};
}
function waypoint(location){
 return location.kind==="coordinates"?
  {location:{latLng:{latitude:location.lat,longitude:location.lng}}}:
  {address:location.label};
}
// Builds the data contract ONLY. No provider invocation or cost authorization.
export function toGoogleTransitRequest(query,{now=new Date()}={}){
 if(!query||query.schema!==SCHEMA||query.transit!==true||
  query.addressResolution!=="unverified_until_provider_response"||
  !["m","z"].includes(query.profile)||!MODES.has(query.mode)||
  !PRIORITIES.has(query.priority))return null;
 const a=normalizeLocation(query.origin),b=normalizeLocation(query.destination);
 const at=Date.parse(query.when);
 if(!a||!b||samePlace(a,b)||!Number.isFinite(at)||
  !(now instanceof Date)||!Number.isFinite(now.getTime())||
  at<now.getTime()-60_000||at>now.getTime()+100*86400_000)return null;
 return {
  origin:waypoint(a),destination:waypoint(b),travelMode:"TRANSIT",
  computeAlternativeRoutes:true,languageCode:"hu",units:"METRIC",
  ...(query.mode==="arrive"?{arrivalTime:query.when}:{departureTime:query.when}),
  transitPreferences:{
   allowedTravelModes:["BUS","SUBWAY","TRAIN","LIGHT_RAIL","RAIL"],
   routingPreference:query.priority==="transfers"?"FEWER_TRANSFERS":"LESS_WALKING"
  }
 };
}
// The documented Maps URL opens Google Maps itself. It DOES NOT return data
// to SHO and it does NOT support transporting our selected departure timestamp.
export function googleMapsHandoff(query){
 if(!query||query.schema!==SCHEMA)return null;
 const a=normalizeLocation(query.origin),b=normalizeLocation(query.destination);
 if(!a||!b||samePlace(a,b))return null;
 const s=loc=>loc.kind==="coordinates"?loc.lat+","+loc.lng:loc.label;
 const u=new URL("https://www.google.com/maps/dir/");
 u.searchParams.set("api","1");
 u.searchParams.set("origin",s(a));
 u.searchParams.set("destination",s(b));
 u.searchParams.set("travelmode","transit");
 return u.toString();
}
