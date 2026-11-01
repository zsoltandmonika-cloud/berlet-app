// @ts-nocheck
/* SH9 × Léna Native Search v1104 (isolated preview).
 * This is NOT a ChatGPT Plus API, ChatGPT MCP token bridge or live timetable.
 * Full paid routing requires owner approval and enforced provider budget
 * reserves. Both OFF; no paid requests, no writes by default.
 */
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
import {normalize} from "./trip-pack-core.mjs";
import {validateQuery,providerRequest,extractRoutes,rankRoutes,toTripPack} from "./lena-native-core.mjs";
const TOOL="hh-lena-native-search-preview";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const GOOGLE="https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_SIZE=6000;
const env=k=>Deno.env.get(k)||"";
const canPaid=()=>env("HH_LENA_NATIVE_ROUTING_APPROVED")==="true"&&
 env("HH_LENA_NATIVE_BUDGET_ENFORCED")==="true"&&
 env("HH_LENA_NATIVE_ROUTING_API_KEY").length>25;
const aiApproved=()=>canPaid()&&env("HH_LENA_NATIVE_AI_APPROVED")==="true"&&
 env("OPENAI_API_KEY").startsWith("sk-");
const headers=req=>req.headers.get("origin")===ORIGIN?{
 "Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type",
 "Access-Control-Allow-Methods":"POST,GET,OPTIONS","Vary":"Origin"
}:{};
const response=(req,status,data)=>Response.json(data,{status,headers:{
 ...headers(req),"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
}});
async function authenticate(req){
 const bearer=req.headers.get("Authorization")||"";
 if(!/^Bearer [A-Za-z0-9._~+/=-]{20,8000}$/.test(bearer))return null;
 if(!env("SUPABASE_URL")||!env("SUPABASE_ANON_KEY"))return null;
 const token=bearer.slice(7);
 const client=createClient(env("SUPABASE_URL"),env("SUPABASE_ANON_KEY"),{
  global:{headers:{Authorization:bearer}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data,error}=await client.auth.getUser(token);
 if(error||!data?.user||data.user.is_anonymous)return null;
 return {client,user:data.user};
}
async function allowed(auth,profile){
 const key=profile==="m"?"monika":"zsolt";
 const r=await auth.client.from("hh_profile_access").select("profile_key")
  .eq("user_id",auth.user.id).eq("profile_key",key).maybeSingle();
 if(r.error)throw Error("access_unavailable");
 return !!r.data;
}
function cleanReason(r){
 return typeof r==="string"?r.replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,250):"";
}
async function optionalAiRanking(query,offers){
 // AI must never invent route data: only the index and optional explanation.
 // Any failed/invalid answer uses the deterministic ranked first option.
 if(!aiApproved()||offers.length<2)return {choice:0,why:""};
 const schema={
  type:"object",additionalProperties:false,
  properties:{
   index:{type:"integer"},
   why:{type:"string"}
  },required:["index","why"]
 };
 const choices=offers.map((x,i)=>({
  index:i,
  departure:x.departure,arrival:x.arrival,
  legs:x.segments.map(s=>({mode:s.mode,line:s.line,from:s.from,to:s.to,departure:s.departure,arrival:s.arrival}))
 }));
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
 try{
  const r=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",headers:{"Authorization":"Bearer "+env("OPENAI_API_KEY"),"Content-Type":"application/json"},
   body:JSON.stringify({
    model:"gpt-4.1-mini",temperature:0,max_completion_tokens:200,
    response_format:{type:"json_schema",json_schema:{name:"sh9_verified_route_ranking",
     strict:true,schema}},
    messages:[
     {role:"system",content:"Válassz egy meglévő, szolgáltatói útvonal indexet. Ne hozz létre járatot, megállót vagy időpontot. A 'why' csak rövid magyar indoklás, legfeljebb 2 mondat."},
     {role:"user",content:JSON.stringify({preference:query.priority,offers:choices})}
    ]
   }),signal:ctrl.signal
  });
  if(!r.ok)return {choice:0,why:""};
  const json=await r.json();
  const content=json.choices?.[0]?.message?.content;
  if(typeof content!=="string")return {choice:0,why:""};
  const output=JSON.parse(content);
  if(Number.isInteger(output.index)&&output.index>=0&&output.index<offers.length)
   return {choice:output.index,why:cleanReason(output.why)};
 }catch(_){}
 finally{clearTimeout(timer)}
 return {choice:0,why:""};
}
async function googleRoutes(query){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),13000);
 try{
  const res=await fetch(GOOGLE,{
   method:"POST",headers:{
    "Content-Type":"application/json",
    "X-Goog-Api-Key":env("HH_LENA_NATIVE_ROUTING_API_KEY"),
    "X-Goog-FieldMask":"routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.duration,routes.legs.steps.distanceMeters,routes.legs.steps.transitDetails"
   },body:JSON.stringify(providerRequest(query)),signal:ctrl.signal
  });
  if(!res.ok)return {status:"provider_unavailable"};
  const len=Number(res.headers.get("content-length")||0);
  if(len>160000)return {status:"provider_oversize"};
  const text=await res.text();
  if(text.length>160000)return {status:"provider_oversize"};
  return {status:"ok",data:JSON.parse(text)};
 }catch(_){return {status:"provider_unavailable"}}
 finally{clearTimeout(timer)}
}
function same(a,b){
 const fingerprint=x=>[x.travelDate,x.from,x.to,x.departure,
  x.segments?.map(s=>s.mode+":"+s.line+":"+s.from+":"+s.to+":"+s.departure).join("|")].join("|");
 return fingerprint(a)===fingerprint(b);
}
async function saveAuthorized(auth,profile,pack){
 const key=profile==="m"?"monika":"zsolt";
 const list=await auth.client.from("hh_my_trip_packs")
  .select("trip_id,trip_data").eq("profile_key",key).limit(30);
 if(list.error)throw Error("cloud_read_unavailable");
 const prior=(list.data||[]).find(x=>x.trip_data&&same(x.trip_data,pack));
 if(prior)return {tripId:prior.trip_id,tripPack:prior.trip_data,alreadySaved:true};
 const uuid=crypto.randomUUID().replace(/-/g,"");
 const record={...pack,id:"tp-lena-"+uuid,savedAt:Date.now()};
 const insert=await auth.client.from("hh_my_trip_packs").insert({
  profile_key:key,trip_id:record.id,trip_data:record
 });
 if(insert.error)throw Error("cloud_write_unavailable");
 const verified=await auth.client.from("hh_my_trip_packs")
  .select("trip_id,trip_data").eq("profile_key",key)
  .eq("trip_id",record.id).maybeSingle();
 if(verified.error||!verified.data||!same(verified.data.trip_data,record))
  throw Error("cloud_confirmation_unavailable");
 return {tripId:record.id,tripPack:record,alreadySaved:false};
}
async function handle(req){
 if(req.method==="OPTIONS"){
  return new Response(null,{status:req.headers.get("origin")===ORIGIN?204:403,headers:headers(req)});
 }
 if(req.method!=="POST"&&req.method!=="GET")
  return response(req,405,{status:"method_not_allowed"});
 const auth=await authenticate(req);
 if(!auth)return response(req,401,{status:"unauthorized"});
 if(req.method==="GET"){
  return response(req,200,{status:"ready",mode:canPaid()?"pilot_enabled":"disabled",
   ai:aiApproved(),automaticSaving:canPaid(),source:"google_routes_transit",
   notice:"A szolgáltató és az AI fizetős lehet. A fizetős hívás alapértelmezetten tiltott."});
 }
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type")||""))
  return response(req,415,{status:"content_type"});
 if(Number(req.headers.get("content-length")||0)>MAX_SIZE)return response(req,413,{status:"too_large"});
 const text=await req.text();
 if(text.length>MAX_SIZE)return response(req,413,{status:"too_large"});
 let raw,query;
 try{raw=JSON.parse(text);query=validateQuery(raw)}
 catch(_){return response(req,422,{status:"invalid_query"})}
 let access=false;
 try{access=await allowed(auth,query.profile)}
 catch(_){return response(req,503,{status:"access_check_unavailable"})}
 if(!access)return response(req,403,{status:"access_denied"});
 // Owner must explicitly approve costs and deploy a global budget guard.
 if(!canPaid())return response(req,200,{status:"source_not_ready",saved:false,
  message:"A hitelesített forrás és a költségkeret még nem aktív. Nem indítottam fizetős keresést."});
 const provider=await googleRoutes(query);
 if(provider.status!=="ok")return response(req,503,{status:provider.status});
 const verified=rankRoutes(extractRoutes(provider.data,query),query.priority).slice(0,4);
 if(!verified.length)return response(req,200,{status:"no_verified_route",saved:false});
 const ai=await optionalAiRanking(query,verified);
 let pack;
 try{pack=normalize(toTripPack(query,verified[ai.choice],ai.why))}
 catch(_){return response(req,502,{status:"provider_data_invalid"})}
 try{
  const saved=await saveAuthorized(auth,query.profile,pack);
  return response(req,200,{status:saved.alreadySaved?"already_saved":"saved",
   tripId:saved.tripId,tripPack:saved.tripPack,saved:true,
   aiUsed:aiApproved()&&verified.length>1,provider:"Google Maps · transit"});
 }catch(_){return response(req,503,{status:"save_failed",saved:false})}
}
Deno.serve(async req=>{
 try{return await handle(req)}
 catch(_){return response(req,503,{status:"service_unavailable",saved:false})}
});
