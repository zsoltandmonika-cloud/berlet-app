// SHO Usage Control v881 · authorized, read-only Smart Trip Google Routes reservation statistics.
// Source: first-party Supabase UTC quota counters. NEVER claims these are Google Billing.
// No Google API calls, no route coordinates, no user details, no writes, no secrets in results.
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
const BASE="https://vhsrupphzcjkdrusonzh.supabase.co";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const LIMITS=Object.freeze({day:20,month:200,pilotRunsPerDay:1,requestsPerPilot:3});
const env=(key:string)=>Deno.env.get(key)||"";
function secret(kind:"public"|"admin"){
 const raw=env(kind==="public"?"SUPABASE_PUBLISHABLE_KEYS":"SUPABASE_SECRET_KEYS");
 try{const o=JSON.parse(raw);if(typeof o?.default==="string"&&o.default.length>20)return o.default}catch{}
 return env(kind==="public"?"SUPABASE_ANON_KEY":"SUPABASE_SERVICE_ROLE_KEY");
}
function headers(req:Request){
 const accepted=req.headers.get("origin")===ORIGIN;
 return {"Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
  ...(accepted?{"Access-Control-Allow-Origin":ORIGIN,
   "Access-Control-Allow-Headers":"authorization,apikey,content-type",
   "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}:{})};
}
const respond=(req:Request,status:number,body:unknown)=>
 Response.json(body,{status,headers:headers(req)});
function monthKey(v:unknown){
 if(typeof v!=="string"||!/^(20[2-9][0-9])-(0[1-9]|1[0-2])$/.test(v))return null;
 const now=new Date().toISOString().slice(0,7);
 if(v>now)return null;return v;
}
async function authorize(req:Request){
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer eyJ[A-Za-z0-9._-]{30,}$/.test(bearer))return false;
 const key=secret("public");if(key.length<20||env("SUPABASE_URL")!==BASE)return false;
 const db=createClient(BASE,key,{global:{headers:{Authorization:bearer}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await db.auth.getUser(bearer.slice(7));
 if(error||!data?.user?.id||data.user.is_anonymous)return false;
 const access=await db.from("hh_profile_access").select("profile_key")
  .eq("user_id",data.user.id).in("profile_key",["zsolt","monika"]).limit(1);
 return !access.error&&Array.isArray(access.data)&&access.data.length>0;
}
async function readQuota(){
 const key=secret("admin");if(key.length<20)throw Error("admin_not_configured");
 const db=createClient(BASE,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data,error}=await db.from("hh_smart_trip_google_quota")
   .select("period_kind,period_start,used")
   .in("period_kind",["day","month"]).limit(250);
 if(error||!Array.isArray(data))throw Error("quota_not_readable");
 const rows=new Map<string,number>();
 for(const item of data){
  if(!["day","month"].includes(item?.period_kind)||
   !/^20[2-9][0-9]-[0-1][0-9]-[0-3][0-9]$/.test(item?.period_start||"")||
   !Number.isInteger(item.used)||item.used<0)
    throw Error("quota_invalid_data");
  rows.set(item.period_kind+"|"+item.period_start,item.used);
 }
 return rows;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")
  return req.headers.get("origin")===ORIGIN?
   new Response(null,{status:204,headers:headers(req)}):
   respond(req,403,{error:"origin_denied"});
 if(req.method!=="POST")return respond(req,405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==ORIGIN)
  return respond(req,403,{error:"origin_denied"});
 if(Number(req.headers.get("content-length")||0)>140)
  return respond(req,413,{error:"request_too_large"});
 let body:unknown;
 try{const s=await req.text();if(s.length>140)throw Error("large");body=JSON.parse(s)}
 catch{return respond(req,400,{error:"invalid_json"})}
 if(!body||typeof body!=="object"||Array.isArray(body)||
   Object.keys(body).sort().join(",")!=="month")
  return respond(req,400,{error:"month_only"});
 const month=monthKey((body as Record<string,unknown>).month);
 if(!month)return respond(req,400,{error:"invalid_month"});
 if(!await authorize(req))return respond(req,403,{error:"vault_membership_required"});
 try{
  const rows=await readQuota();
  const now=new Date(),today=now.toISOString().slice(0,10);
  const currentMonth=today.slice(0,7);
  const dayValue=rows.get("day|"+today)??0;
  const monthValue=rows.get("month|"+month+"-01")??0;
  const current=month===currentMonth;
  return respond(req,200,{
   schema:"sh9.smart-trip.usage/1",source:"supabase_first_party_quota",
   measuredAt:now.toISOString(),period:month,
   timezone:"UTC",day:current?{date:today,reservations:dayValue,limit:LIMITS.day}:null,
   month:{reservations:monthValue,limit:LIMITS.month},
   pilot:{maxRunsPerUTCDay:LIMITS.pilotRunsPerDay,requestsPerRun:LIMITS.requestsPerPilot},
   actualGoogleRequests:null,actualGoogleBillingUSD:null,billingSku:null,
   note:"Quota reservations, NOT provider-billed requests. Some blocked prior attempts reserved quota; Google Billing SKU and actual charges are unverified.",
   pricingSource:"https://developers.google.com/maps/billing-and-pricing/pricing"
  });
 }catch{return respond(req,503,{error:"usage_read_unavailable"})}
});
