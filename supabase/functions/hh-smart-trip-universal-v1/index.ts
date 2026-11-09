/* SHO V5 · user-authorized Google Routes DEV test gateway.
 * DEV ONLY: application quota limits temporarily disabled until go-live.
 * Every charged request requires a separate user click, signed-in profile,
 * CORS origin check and atomic usage accounting. Never auto-search, retry,
 * call an LLM or store Google route content. Release requires an explicit
 * production change restoring budget policy. Do not deploy via GitHub CI.
 */
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
import {
 normalizeRequest,sanitizeGoogleResponse,GOOGLE_FIELD_MASK,ROUTES_URL
} from "./core.mjs";

const TRUSTED_ORIGIN="https://zsoltandmonika-cloud.github.io";
const TRUSTED_SUPABASE="https://vhsrupphzcjkdrusonzh.supabase.co";
const KEY_NAME="HH_SMART_TRIP_GOOGLE_ROUTES_KEY";
const safeHeader=(req:Request)=>({
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store, max-age=0",
 "X-Content-Type-Options":"nosniff",
 ...(req.headers.get("origin")===TRUSTED_ORIGIN?{
  "Access-Control-Allow-Origin":TRUSTED_ORIGIN,
  "Access-Control-Allow-Headers":"authorization,apikey,content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"
 }:{})
});
const json=(req:Request,code:number,body:unknown)=>Response.json(body,{
 status:code,headers:safeHeader(req)
});
const env=(k:string)=>Deno.env.get(k)||"";
function key(kind:"admin"|"public"){
 const preferred=env(kind==="admin"?"SUPABASE_SECRET_KEYS":"SUPABASE_PUBLISHABLE_KEYS");
 if(preferred){
  try{
   const record=JSON.parse(preferred) as Record<string,unknown>;
   if(typeof record.default==="string"&&record.default.length>20)
    return record.default;
  }catch{}
 }
 return env(kind==="admin"?"SUPABASE_SERVICE_ROLE_KEY":"SUPABASE_ANON_KEY");
}
// Explicit owner authorization 2026-11-09: DEV test, no app request caps.
// This is a separate V5 release gate. Go-live must replace this with
// audited production quota + verified Google billing configuration.
const DEV_TEST_ENABLED=true;
const gating=()=>({
 devTest:DEV_TEST_ENABLED,
 production:false,
 approved:DEV_TEST_ENABLED,
 quotaPolicy:"development_unlimited_app_calls",
 billing: "Google Cloud provider quotas and actual billing still apply"
});
async function auth(req:Request,profile:"m"|"z"){
 const header=req.headers.get("Authorization")||"";
 if(!header.startsWith("Bearer ")||
  !/^[A-Za-z0-9._=-]{20,8000}$/.test(header.slice(7)))return false;
 const jwt=header.slice(7),url=env("SUPABASE_URL"),publicKey=key("public");
 if(url!==TRUSTED_SUPABASE||publicKey.length<20)return false;
 try{
  const db=createClient(url,publicKey,{global:{headers:{Authorization:header}},
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await db.auth.getUser(jwt);
  if(error||!data?.user||data.user.is_anonymous)return false;
  const profileKey=profile==="m"?"monika":"zsolt";
  const result=await db.from("hh_profile_access").select("profile_key")
   .eq("user_id",data.user.id).eq("profile_key",profileKey).maybeSingle();
  return !result.error&&result.data?.profile_key===profileKey;
 }catch{return false}
}
function adminClient(){
 const secret=key("admin");
 if(secret.length<20||env("SUPABASE_URL")!==TRUSTED_SUPABASE)return null;
 return createClient(TRUSTED_SUPABASE,secret,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
}
// Separate atomic DEV accounting RPC. Old production and pilot RPCs are
// left untouched; it increments usage for visibility, without daily/monthly
// application caps. EXECUTE is explicitly service_role only in migration.
type UsageRpcClient={rpc:(name:string)=>Promise<{data:unknown,error:unknown}>};
async function reserveOne(admin:UsageRpcClient){
 const {data,error}=await admin.rpc("hh_smart_trip_google_reserve_dev");
 if(error||!Array.isArray(data)||data.length!==1)return {ok:false};
 const row=data[0] as {allowed?:unknown,daily_used?:unknown,monthly_used?:unknown};
 if(row.allowed!==true||!Number.isInteger(row.daily_used)||
  !Number.isInteger(row.monthly_used)||Number(row.daily_used)<1||
  Number(row.monthly_used)<1)return {ok:false};
 return {ok:true,dailyUsed:row.daily_used,monthlyUsed:row.monthly_used};
}
async function providerRequest(
 googleKey:string,payload:unknown,requestSignal:AbortSignal
){
 const controller=new AbortController();
 const abort=()=>controller.abort();
 requestSignal.addEventListener("abort",abort,{once:true});
 const timer=setTimeout(abort,14000);
 try{
  if(requestSignal.aborted)throw Error("client_disconnected");
  const response=await fetch(ROUTES_URL,{
   method:"POST",signal:controller.signal,
   headers:{"Content-Type":"application/json",
    "X-Goog-Api-Key":googleKey,"X-Goog-FieldMask":GOOGLE_FIELD_MASK},
   body:JSON.stringify(payload),
   redirect:"error",cache:"no-store"
  });
  if(!response.ok)return {error:"google_http_error"};
  if(Number(response.headers.get("content-length")||0)>180000)
   return {error:"google_response_too_large"};
  const raw=await response.text();
  if(raw.length>180000)return {error:"google_response_too_large"};
  let parsed:unknown;
  try{parsed=JSON.parse(raw)}catch{return {error:"google_invalid_response"}}
  const normalized=sanitizeGoogleResponse(parsed);
  if(!normalized)return {error:"google_invalid_response"};
  return {data:normalized};
 }catch{return {error:"google_network_or_timeout"}}
 finally{
  clearTimeout(timer);
  requestSignal.removeEventListener("abort",abort);
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:safeHeader(req)});
 if(req.method!=="POST")return json(req,405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==TRUSTED_ORIGIN)
  return json(req,403,{error:"origin_denied"});
 if(!req.headers.get("content-type")?.startsWith("application/json"))
  return json(req,415,{error:"json_required"});
 if(Number(req.headers.get("content-length")||0)>2300)
  return json(req,413,{error:"payload_too_large"});
 let raw:unknown;
 try{
  const body=await req.text();
  if(body.length>2300)throw Error("oversized");
  raw=JSON.parse(body);
 }catch{return json(req,400,{error:"invalid_json"})}
 const validated=normalizeRequest(raw,{now:Date.now()});
 if(!validated.ok)return json(req,400,{error:validated.error});
 if(!await auth(req,validated.profile as "m"|"z"))
  return json(req,403,{error:"unauthorized_profile"});
 const status=gating();
 if(validated.mode==="diagnose"){
  // Never reserve quota or contact Google during diagnostics.
  return json(req,200,{
   schema:"sho.smart-trip.universal-diagnostic/1",
   ready:status.approved&&
    key("admin").length>20&&env(KEY_NAME).length>=25,
   checks:status,googleRequests:0,quotaReserved:0,
   ai_processing:"disabled",paidProviderContacted:false
  });
 }
 if(!status.approved)
  return json(req,503,{error:"universal_gateway_disabled",
   googleRequests:0,quotaReserved:0});
 const googleKey=env(KEY_NAME),admin=adminClient();
 if(googleKey.length<25||!admin)
  return json(req,503,{error:"server_configuration_missing",
   googleRequests:0,quotaReserved:0});
 if(req.signal.aborted)return json(req,499,{error:"client_disconnected",
  googleRequests:0,quotaReserved:0});
 // All authorization + policy checks finish BEFORE atomic quota reservation.
 const quota=await reserveOne(admin as unknown as UsageRpcClient).catch(()=>({ok:false}));
 if(!quota.ok)return json(req,503,{error:"development_usage_accounting_unavailable",
  googleRequests:0,quotaReserved:0});
 if(req.signal.aborted)return json(req,499,{error:"client_disconnected",
  googleRequests:0,quotaReserved:1});
 const remote=await providerRequest(googleKey,validated.googlePayload,req.signal);
 if(remote.error)return json(req,502,{
  error:remote.error,googleRequests:1,quotaReserved:1
 });
 return json(req,200,remote.data);
});
