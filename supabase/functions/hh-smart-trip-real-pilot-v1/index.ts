// Smart Trip AI V5 real, strictly controlled one-shot trimodal Google Routes test.
// Never invoked by existing BKK, MAV, Volan, Smart Trip search or My Trips.
// EEA: Google content only on standalone map-free, Google-attributed page.
// NO AI/LLM forwarding, NO persistence, NO Google route map or map links.
import {createClient} from "npm:@supabase/supabase-js@2.57.2";

const HOST="https://zsoltandmonika-cloud.github.io";
const SUPABASE_HOST="https://vhsrupphzcjkdrusonzh.supabase.co";
const GOOGLE="https://routes.googleapis.com/directions/v2:computeRoutes";
const KEY_NAME="HH_SMART_TRIP_GOOGLE_ROUTES_KEY";
const FIELDS=[
 "routes.duration","routes.legs.steps.travelMode",
 "routes.legs.steps.staticDuration","routes.legs.steps.distanceMeters",
 "routes.legs.steps.transitDetails"
].join(",");
const VARIANTS=[
 {id:"all",modes:["BUS","SUBWAY","TRAIN","LIGHT_RAIL","RAIL"],preference:"FEWER_TRANSFERS"},
 {id:"bus",modes:["BUS"],preference:"FEWER_TRANSFERS"},
 {id:"rail",modes:["TRAIN","RAIL","SUBWAY","LIGHT_RAIL"],preference:"LESS_WALKING"}
] as const;
const getenv=(key:string)=>Deno.env.get(key)||"";
const headers=(req:Request)=>({
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff",
 ...(req.headers.get("origin")===HOST?{
  "Access-Control-Allow-Origin":HOST,
  "Access-Control-Allow-Headers":"authorization,apikey,content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}:{})
});
const json=(req:Request,status:number,body:unknown)=>Response.json(body,{status,headers:headers(req)});
function requestValid(raw:unknown){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
 const q=raw as Record<string,unknown>;
 if(Object.keys(q).sort().join(",")!=="departureTime,destination,mode,origin,profile")return false;
 if(q.mode!=="real_test"||q.profile!=="m"||
   q.departureTime!=="2026-11-27T15:00:00+01:00")return false;
 const a=q.origin as Record<string,unknown>|null,b=q.destination as Record<string,unknown>|null;
 if(!a||!b||Object.keys(a).sort().join(",")!=="lat,lng"||
   Object.keys(b).sort().join(",")!=="lat,lng")return false;
 return a.lat===47.52693&&a.lng===19.03802&&
        b.lat===48.25657&&b.lng===20.62831;
}
async function authorized(req:Request){
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer ")||
  !/^[A-Za-z0-9._=-]{20,8000}$/.test(bearer.slice(7)))return false;
 const url=getenv("SUPABASE_URL"),anon=getenv("SUPABASE_ANON_KEY");
 if(!url||!anon||url!==SUPABASE_HOST)return false;
 const db=createClient(url,anon,{global:{headers:{Authorization:bearer}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await db.auth.getUser(bearer.slice(7));
 if(error||!data?.user||data.user.is_anonymous)return false;
 const access=await db.from("hh_profile_access").select("profile_key")
   .eq("user_id",data.user.id).eq("profile_key","monika").maybeSingle();
 return !access.error&&access.data?.profile_key==="monika";
}
async function reserveQuota(admin:any){
 const {data,error}=await admin.rpc("hh_smart_trip_google_reserve");
 const rows=data as unknown;
 if(error||!Array.isArray(rows)||rows.length!==1)return null;
 const x=rows[0] as {allowed:boolean,daily_used:number,monthly_used:number};
 if(typeof x.allowed!=="boolean"||!Number.isInteger(x.daily_used)||
   !Number.isInteger(x.monthly_used)||x.daily_used<0||x.monthly_used<0||
   x.daily_used>20||x.monthly_used>200)return null;
 return x;
}
async function fetchVariant(key:string,v:typeof VARIANTS[number]){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),11000);
 try{
  const resp=await fetch(GOOGLE,{method:"POST",signal:ctrl.signal,headers:{
   "Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":FIELDS
  },body:JSON.stringify({
    origin:{location:{latLng:{latitude:47.52693,longitude:19.03802}}},
    destination:{location:{latLng:{latitude:48.25657,longitude:20.62831}}},
    travelMode:"TRANSIT",departureTime:"2026-11-27T14:00:00.000Z",
    computeAlternativeRoutes:true,
    transitPreferences:{allowedTravelModes:v.modes,routingPreference:v.preference},
    languageCode:"hu",units:"METRIC"
  })});
  if(!resp.ok)return {variant:v.id,status:"provider_http_error",httpStatus:resp.status,routes:[]};
  const length=Number(resp.headers.get("content-length")||0);
  if(length>145000)return {variant:v.id,status:"response_too_large",routes:[]};
  const text=await resp.text();
  if(text.length>145000)return {variant:v.id,status:"response_too_large",routes:[]};
  const payload=JSON.parse(text);
  if(!Array.isArray(payload.routes)||payload.routes.length>8)
    return {variant:v.id,status:"provider_invalid_response",routes:[]};
  return {variant:v.id,status:"ok",routes:payload.routes.slice(0,4)};
 }catch{return {variant:v.id,status:"provider_network_error",routes:[]}}
 finally{clearTimeout(timer)}
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=="POST")return json(req,405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==HOST)return json(req,403,{error:"origin_denied"});
 if(!req.headers.get("content-type")?.startsWith("application/json"))
  return json(req,415,{error:"json_required"});
 if(Number(req.headers.get("content-length")||0)>950)
  return json(req,413,{error:"request_too_large"});
 let raw:unknown;
 try{const body=await req.text();if(body.length>950)throw Error("large");raw=JSON.parse(body)}
 catch{return json(req,400,{error:"invalid_json"})}
 if(!requestValid(raw))return json(req,400,{error:"pilot_fixed_fixture_only"});
 if(!await authorized(req))return json(req,403,{error:"unauthorized_profile"});
 const adminKey=getenv("SUPABASE_SERVICE_ROLE_KEY"),key=getenv(KEY_NAME);
 if(!adminKey||key.length<25)return json(req,503,{
  error:"pilot_google_key_or_service_not_configured",googleRequests:0});
 const admin=createClient(getenv("SUPABASE_URL"),adminKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const results=[] as unknown[];
 let reserved=0,attempted=0;
 for(const variant of VARIANTS){
  const quota=await reserveQuota(admin).catch(()=>null);
  if(!quota)return json(req,503,{error:"quota_guard_unavailable",googleRequests:attempted,
   quotaReserved:reserved,variants:results});
  reserved++;
  // Exactly one complete run/day: first reserve must be daily #1;
  // later variants must be #2 and #3. No general-purpose paid API.
  if(!quota.allowed||quota.daily_used!==reserved||quota.monthly_used>200){
   return json(req,429,{error:"pilot_daily_one_run_or_quota_exceeded",
    googleRequests:attempted,quotaReserved:reserved,variants:results});
  }
  const res=await fetchVariant(key,variant);
  attempted++;
  results.push(res);
 }
 return json(req,200,{
  schema:"sho.smart-trip.real-test/1",source:"google_routes",attribution:"Google Maps",
  description:"Google Maps Platform · 3 valós tranzitkeresési preferencia",
  presentation:"map_free_text_only",ai_processing:"disabled",save:false,
  coverage:"google_results_only_no_independent_operator_verification",
  origin:"Mónika munkahelye, Budapest",
  destination:"Mónika anyukája, Kazincbarcika",
  departureTime:"2026-11-27T15:00:00+01:00",
  googleRequests:attempted,quotaReserved:reserved,variants:results
 });
});
