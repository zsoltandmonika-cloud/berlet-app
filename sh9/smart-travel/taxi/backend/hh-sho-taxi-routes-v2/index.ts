import {createClient} from "npm:@supabase/supabase-js@2.57.2";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const env=(name:string)=>Deno.env.get(name)||"";
const cors=(req:Request)=>({
 "Access-Control-Allow-Origin":req.headers.get("origin")===ORIGIN?ORIGIN:"null",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin",
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
});
const json=(req:Request,code:number,obj:unknown)=>Response.json(obj,{status:code,headers:cors(req)});
const bounded=(s:unknown,n:number)=>typeof s==="string"&&s.trim().length>0&&s.length<=n;
function place(p:unknown):null|Record<string,unknown>{
 if(!p||typeof p!=="object"||Array.isArray(p))return null;
 const x=p as Record<string,unknown>;
 if(bounded(x.placeId,200))return {placeId:x.placeId};
 if(bounded(x.address,240))return {address:String(x.address).trim()};
 if(x.location&&typeof x.location==="object"){
   const v=x.location as Record<string,unknown>;
   if(typeof v.lat==="number"&&Number.isFinite(v.lat)&&v.lat>=46&&v.lat<=49&&
       typeof v.lng==="number"&&Number.isFinite(v.lng)&&v.lng>=17&&v.lng<=21)
     return {location:{latLng:{latitude:v.lat,longitude:v.lng}}};
 }
 return null;
}
async function authorize(req:Request){
 const auth=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._~+\/=\-]{20,8000}$/.test(auth))return false;
 if(!env("SUPABASE_URL")||!env("SUPABASE_ANON_KEY"))return false;
 const client=createClient(env("SUPABASE_URL"),env("SUPABASE_ANON_KEY"),{
  global:{headers:{Authorization:auth}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data,error}=await client.auth.getUser(auth.slice(7));
 if(error||!data?.user||data.user.is_anonymous)return false;
 const {data:rows,error:e}=await client.from("hh_profile_access").select("profile_key").eq("user_id",data.user.id).limit(1);
 return !e&&Array.isArray(rows)&&rows.length>0;
}
async function google(url:string,payload:unknown,mask?:string){
 const key=env("SHO_TAXI_GOOGLE_MAPS_API_KEY")||env("GOOGLE_MAPS_API_KEY")||env("HH_SMART_TRIP_GOOGLE_ROUTES_KEY");
 if(key.length<24)throw Error("provider_unconfigured");
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
 try{
  const r=await fetch(url,{method:"POST",signal:ctl.signal,
   headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,...(mask?{"X-Goog-FieldMask":mask}:{})},
   body:JSON.stringify(payload)});
  if(!r.ok){console.error("SHO Taxi provider status",r.status);throw Error("provider_unavailable");}
  if(Number(r.headers.get("content-length")||0)>160000)throw Error("response_too_large");
  return await r.json();
 }finally{clearTimeout(timer);}
}

/* SHO Taxi v2: no SHO-imposed daily/monthly usage caps.
 * The calls still require the existing family JWT and profile authorization.
 * Photon/OSRM are openly licensed third-party services with their own usage policies.
 * Google routing, when enabled, remains subject to Google billing. */
type LatLng={lat:number,lng:number};
const validCoords=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&
  lat>=46&&lat<=49&&lng>=17&&lng<=21;
const delayFetch=async(url:string,ms=9000)=>{
 const controller=new AbortController(),t=setTimeout(()=>controller.abort(),ms);
 try{
  const res=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"}});
  if(!res.ok)throw Error("provider_http_"+res.status);
  const body=await res.json();
  return body;
 }finally{clearTimeout(t);}
};
async function photon(query:string):Promise<Array<{label:string,location:LatLng}>>{
 const u=new URL("https://photon.komoot.io/api/");
 u.searchParams.set("q",query);u.searchParams.set("limit","6");
 u.searchParams.set("lat","47.506");u.searchParams.set("lon","19.0467");
 const data=await delayFetch(u.href);
 const results:Array<{label:string,location:LatLng}>=[],seen=new Set<string>();
 for(const f of (Array.isArray(data.features)?data.features:[]).slice(0,15)){
  const xy=f?.geometry?.coordinates,p=f?.properties||{};
  if(!Array.isArray(xy)||xy.length<2)continue;
  const [lng,lat]=xy.map(Number);
  if(!validCoords(lat,lng)||p.countrycode&&String(p.countrycode).toUpperCase()!=="HU")continue;
  const name=String(p.name||"").trim(),street=String(p.street||"").trim();
  const building=String(p.housenumber||"").trim();
  const streetFull=street?(street+(building?" "+building:"")):"";
  const city=String(p.city||p.county||"").trim();
  const address=[streetFull||name,city].filter(Boolean).join(", ").slice(0,240);
  if(!address)continue;
  const key=lat.toFixed(6)+","+lng.toFixed(6);
  if(seen.has(key))continue;
  seen.add(key);
  results.push({label:address,location:{lat,lng}});
  if(results.length===5)break;
 }
 return results;
}
async function coordinatesFrom(p:any):Promise<LatLng>{
 const l=p?.location;
 if(l&&validCoords(Number(l.lat),Number(l.lng)))return {lat:Number(l.lat),lng:Number(l.lng)};
 const hint=String(p?.label||p?.address||"").trim().slice(0,130);
 if(hint.length<3)throw Error("location_unknown");
 const matches=await photon(hint);
 if(!matches.length)throw Error("location_unknown");
 return matches[0].location;
}
async function osmRoadRoute(rawFrom:any,rawTo:any){
 const a=await coordinatesFrom(rawFrom),b=await coordinatesFrom(rawTo);
 if(Math.abs(a.lat-b.lat)<0.00001&&Math.abs(a.lng-b.lng)<0.00001)throw Error("identical_points");
 const u="https://router.project-osrm.org/route/v1/driving/"+
  a.lng+","+a.lat+";"+b.lng+","+b.lat+"?overview=false&steps=false";
 const out=await delayFetch(u,12000);
 const first=Array.isArray(out.routes)?out.routes[0]:null;
 const dist=Number(first?.distance),seconds=Number(first?.duration);
 if(out.code!=="Ok"||!Number.isFinite(dist)||dist<=0||dist>250000||!Number.isFinite(seconds)||seconds<=0)
   throw Error("route_not_found");
 return {dist,seconds};
}
const airportRE=/liszt\s+ferenc|ferihegy|budapest\s+airport|rep[üu]l[őo]t[ée]r|bud\s+(?:airport|terminal)/i;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=="POST")return json(req,405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==ORIGIN)return json(req,403,{error:"origin_denied"});
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json(req,415,{error:"json_required"});
 if(Number(req.headers.get("content-length")||0)>1700)return json(req,413,{error:"payload_too_large"});
 let raw:Record<string,unknown>;
 try{const s=await req.text();if(s.length>1700)throw Error("large");raw=JSON.parse(s);
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("json");}
 catch{return json(req,400,{error:"invalid_json"});}
 const action=raw.action;
 if(action!=="suggest"&&action!=="estimate")return json(req,400,{error:"invalid_action"});
 if(!await authorize(req))return json(req,403,{error:"authentication_required"});
 const key=env("SHO_TAXI_GOOGLE_MAPS_API_KEY")||env("GOOGLE_MAPS_API_KEY")||env("HH_SMART_TRIP_GOOGLE_ROUTES_KEY");
 if(key.length<24)return json(req,503,{error:"provider_unconfigured"});
 if(action==="suggest"){
  if(!bounded(raw.query,130)||String(raw.query).trim().length<3)
   return json(req,400,{error:"query_required"});
  const query=String(raw.query).trim();
  if(!/[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(query))
   return json(req,400,{error:"invalid_query"});
  try{
   const suggestions=await photon(query);
   return json(req,200,{suggestions,source:"OpenStreetMap / Photon"});
  }catch(e){
   console.warn("SHO Taxi Photon suggest unavailable, trying Google Places");
   try{
    const data=await google("https://places.googleapis.com/v1/places:autocomplete",
     {input:query,languageCode:"hu",includedRegionCodes:["hu"]});
    const suggestions=(Array.isArray(data.suggestions)?data.suggestions:[])
     .filter((x:any)=>bounded(x.placePrediction?.placeId,200)&&bounded(x.placePrediction?.text?.text,280))
     .slice(0,5).map((x:any)=>({label:x.placePrediction.text.text,placeId:x.placePrediction.placeId}));
    return json(req,200,{suggestions,source:"Google Maps"});
   }catch(_){return json(req,503,{error:"provider_unavailable"});}
  }
 }
 const from=place(raw.from),to=place(raw.to);
 if(!from||!to)return json(req,400,{error:"invalid_route"});
 const label=(p:any)=>String(p?.label||p?.address||"");
 if(JSON.stringify(from)===JSON.stringify(to))return json(req,400,{error:"identical_points"});

 try{
  let dist=0,seconds=0,normal=0,trafficAware=false,source="OpenStreetMap / OSRM";
  try{
   const data=await google("https://routes.googleapis.com/directions/v2:computeRoutes",
    {origin:from,destination:to,travelMode:"DRIVE",routingPreference:"TRAFFIC_AWARE",languageCode:"hu",units:"METRIC"},
    "routes.distanceMeters,routes.duration,routes.staticDuration");
   const route=data.routes?.[0];
   dist=Number(route?.distanceMeters);
   seconds=Number.parseFloat(String(route?.duration||"").replace(/s$/,""));
   normal=Number.parseFloat(String(route?.staticDuration||route?.duration||"").replace(/s$/,""));
   if(!Number.isFinite(dist)||dist<=0||dist>250000||!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(normal))
    throw Error("google_route_not_found");
   trafficAware=true;source="Google Routes";
  }catch(_){
   // Use road-network distance rather than inventing an aerial distance.
   const road=await osmRoadRoute(raw.from,raw.to);
   dist=road.dist;seconds=road.seconds;normal=road.seconds;
  }
  const distanceKm=Math.round(dist/100)/10,travelMinutes=Math.ceil(seconds/60);
  const delay=Math.max(0,(seconds-normal)/60);
  const airport=airportRE.test(label(raw.from))||airportRE.test(label(raw.to));
  const baseFeeFt=airport?2100:1300;
  const distanceFeeFt=Math.round(dist/1000*520);
  const trafficAllowanceFt=trafficAware?Math.round(delay*130):0;
  const fare=baseFeeFt+distanceFeeFt+trafficAllowanceFt;
  return json(req,200,{distanceKm,travelMinutes,baseFeeFt,distanceFeeFt,trafficAllowanceFt,
   estimatedFareFt:Math.round(fare/10)*10,airportFare:airport,source,trafficAware,
   disclaimer:trafficAware?
    "Tájékoztató becslés, nem taxaméter. A lassú haladás tényleges idődíja eltérhet.":
    "Tájékoztató becslés közúti távolsággal, valós idejű forgalom nélkül. Nem taxaméter."});
 }catch(e){
  const err=(e instanceof Error?e.message:"provider_unavailable");
  console.error("SHO Taxi estimate unavailable",err);
  return json(req,503,{error:"route_unavailable"});
 }
});