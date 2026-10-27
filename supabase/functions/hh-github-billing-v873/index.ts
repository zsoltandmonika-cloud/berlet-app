// SH9 v873: read-only private Billing gateway for personal GitHub account.
// The GitHub fine-grained PAT lives ONLY in Supabase Edge Function Secrets.
// Fail closed until HH_GITHUB_BILLING_PAT is configured by the account owner.
import {aggregateBilling,monthQuery} from "./billing-core.mjs";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const ACCOUNT="zsoltandmonika-cloud";
const API="https://api.github.com/users/"+ACCOUNT+"/settings/billing/usage";
const CACHE_TTL=30*60*1000;
const cache=new Map<string,{expires:number,data:unknown}>();
const env=(key:string)=>Deno.env.get(key)?.trim()||"";
const cors={
 "Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Cache-Control":"no-store","Vary":"Origin"
};
function result(body:unknown,status=200){
 return new Response(JSON.stringify(body),{status,headers:{...cors,
  "Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"}});
}
function publishable(){
 try{
  const p=JSON.parse(env("SUPABASE_PUBLISHABLE_KEYS"));
  if(typeof p?.default==="string")return p.default;
 }catch(_){}
 return env("SUPABASE_ANON_KEY");
}
async function authorizedOwner(req:Request){
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer eyJ[A-Za-z0-9._-]{30,}$/.test(bearer))return null;
 const apikey=publishable(),base=env("SUPABASE_URL");
 if(!apikey||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))
  throw Error("vault_config_unavailable");
 const headers={apikey,Authorization:bearer};
 const identify=await fetch(base+"/auth/v1/user",{method:"GET",headers,
  signal:AbortSignal.timeout(10000)});
 if(!identify.ok)return null;
 const who=await identify.json();
 const userId=String(who?.id||"");
 if(!/^[0-9a-f-]{36}$/i.test(userId))return null;
 // HealthHub RLS policy hh_access_read gates row to (select auth.uid()).
 // No service-role client, SECURITY DEFINER, user metadata or admin secret.
 const allowed=new URL(base+"/rest/v1/hh_profile_access");
 allowed.searchParams.set("select","profile_key");
 allowed.searchParams.set("user_id","eq."+userId);
 allowed.searchParams.set("profile_key","in.(zsolt,monika)");
 allowed.searchParams.set("limit","1");
 const checked=await fetch(allowed.toString(),{method:"GET",headers,
  signal:AbortSignal.timeout(10000)});
 if(!checked.ok)return null;
 const profiles=await checked.json();
 return Array.isArray(profiles)&&profiles.length>0?userId:null;
}
async function readLimitedBody(resp:Response){
 const len=Number(resp.headers.get("content-length"));
 if(Number.isFinite(len)&&len>1200000)throw Error("billing_body_too_large");
 const body=resp.body;
 if(!body)throw Error("billing_body_unavailable");
 const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>1200000)throw Error("billing_body_too_large");
   parts.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e}
 const bytes=new Uint8Array(size);let i=0;
 for(const part of parts){bytes.set(part,i);i+=part.byteLength}
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function route(req:Request){
 const origin=req.headers.get("origin");
 if(origin!==ORIGIN)return result({error:"forbidden_origin"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return result({error:"method_not_allowed"},405);
 const raw=await req.text();
 if(raw.length>200) return result({error:"invalid_request"},400);
 let payload:any;
 try{payload=JSON.parse(raw)}catch(_){return result({error:"invalid_json"},400)}
 const month=String(payload?.month||"");
 try{monthQuery(month)}catch(_){return result({error:"invalid_month"},400)}
 const user=await authorizedOwner(req);
 if(!user)return result({error:"vault_login_or_membership_required"},403);
 const secret=env("HH_GITHUB_BILLING_PAT");
 // Never log or return the PAT, its length, or the GitHub response headers.
 if(!secret)return result({configured:false,status:"setup_required",
  reason:"GITHUB_BILLING_PAT_MISSING",year:Number(month.slice(0,4))});
 const key=user+"|"+month,now=Date.now(),hit=cache.get(key);
 if(hit&&hit.expires>now)return result({configured:true,status:"ready",
  source:"cache",data:hit.data});
 if(cache.size>50)cache.clear();
 const u=new URL(API);
 const {year,month:monthNumber}=monthQuery(month);
 u.searchParams.set("year",String(year));u.searchParams.set("month",String(monthNumber));
 const upstream=await fetch(u.toString(),{method:"GET",headers:{
   "Authorization":"Bearer "+secret,
   "Accept":"application/vnd.github+json",
   "X-GitHub-Api-Version":"2026-03-10"
  },signal:AbortSignal.timeout(18000)});
 if(!upstream.ok){
  // Do not assume every HTTP 403 means a missing Plan permission.
  // Rate limits and GitHub account/billing restrictions can also return 403.
  // Never expose GitHub's raw response, token or response headers.
  const remaining=upstream.headers.get("x-ratelimit-remaining");
  const retry=upstream.headers.get("retry-after");
  const denied=upstream.status===403;
  let message="";
  try{
   const body=await upstream.text();
   if(body.length<20000){
    const parsed=JSON.parse(body);
    if(typeof parsed?.message==="string")message=parsed.message.slice(0,300).toLowerCase();
   }
  }catch(_){}
  let code="github_upstream_unavailable";
  if(upstream.status===401||/bad credentials|requires authentication|token has expired/.test(message))
   code="github_token_invalid";
  else if(upstream.status===429||(
    denied&&(remaining==="0"||/rate limit|secondary rate limit|abuse detection/.test(message))))
   code="github_rate_limited";
  else if(denied&&/enhanced billing|billing platform|not enabled for/.test(message))
   code="github_billing_account_unavailable";
  else if(denied&&/resource not accessible by personal access token|insufficient permission|requires.*permission/.test(message))
   code="github_account_permission_denied";
  else if(denied&&/saml|single sign.on|sso/.test(message))
   code="github_sso_required";
  else if(denied)
   code="github_access_forbidden";
  else if(upstream.status===404)
   code="github_account_not_found";
  else if(upstream.status===400)
   code="github_billing_request_invalid";
  const retryAfter=retry&&/^\d{1,5}$/.test(retry)?Number(retry):null;
  return result({configured:true,error:code,httpStatus:upstream.status,
   ...(code==="github_rate_limited"&&retryAfter!==null?{retryAfterSeconds:retryAfter}:{})},502);
 }
 const payloadGithub=await readLimitedBody(upstream);
 const data=aggregateBilling(payloadGithub,month,new Date().toISOString());
 cache.set(key,{data,expires:Date.now()+CACHE_TTL});
 return result({configured:true,status:"ready",source:"github_api",data});
}
Deno.serve(async(req:Request)=>{
 try{return await route(req)}
 catch(_){return result({error:"github_billing_gateway_failed"},503)}
});
