// Source-only pilot: do not deploy until free-plan and authorization checks pass.
// No change to existing Cookbook routes or databases.
import {cloudflareCookbook} from "./cloudflare.mjs";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const env=(key)=>Deno.env.get(key)||"";
async function authenticatedFamily(req){
 const auth=req.headers.get("Authorization")||"";
 if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth))return false;
 const url=env("SUPABASE_URL"),key=env("SUPABASE_ANON_KEY");
 if(!url||!key)return false;
 const headers={Authorization:auth,apikey:key};
 const me=await fetch(url+"/auth/v1/user",{headers,signal:AbortSignal.timeout(6000)});
 if(!me.ok)return false;
 const user=await me.json();
 if(typeof user?.id!=="string"||!user.id)return false;
 const u=new URL(url+"/rest/v1/hh_profile_access");
 u.searchParams.set("select","profile_key");
 u.searchParams.set("user_id","eq."+user.id);
 u.searchParams.set("profile_key","in.(zsolt,monika)");
 u.searchParams.set("limit","1");
 const acl=await fetch(u,{headers,signal:AbortSignal.timeout(6000)});
 if(!acl.ok)return false;
 const rows=await acl.json();
 return Array.isArray(rows)&&rows.some(r=>["zsolt","monika"].includes(r.profile_key));
}
Deno.serve(async req=>{
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==ORIGIN)return reply({ok:false,error:"forbidden_origin"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 if(env("COOKBOOK_AI_PILOT_ENABLED")!=="true"||env("COOKBOOK_CF_FREE_PLAN_CONFIRMED")!=="true")return reply({ok:false,error:"pilot_disabled"},503);
 try{if(!await authenticatedFamily(req))return reply({ok:false,error:"unauthorized"},401)}catch{return reply({ok:false,error:"auth_unavailable"},503)}
 if(Number(req.headers.get("content-length")||0)>1700000)return reply({ok:false,error:"request_too_large"},413);
 let body;
 try{
  const reader=req.body?.getReader();
  if(!reader)return reply({ok:false,error:"missing_body"},400);
  const chunks=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>1700000){await reader.cancel();return reply({ok:false,error:"request_too_large"},413)}chunks.push(value)}
  const data=new Uint8Array(total);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.byteLength}
  body=JSON.parse(new TextDecoder().decode(data));
 }catch{return reply({ok:false,error:"invalid_json"},400)}
 if(body?.schema!=="cookbook.ai/1"||body?.consent!==true||(body?.operation==="vision"&&body?.photoConsent!==true))return reply({ok:false,error:"invalid_request_or_consent"},400);
 try{
  const result=await cloudflareCookbook({accountId:env("COOKBOOK_CF_ACCOUNT_ID"),apiToken:env("COOKBOOK_CF_API_TOKEN"),operation:body.operation,prompt:body.prompt,photo:body.photo});
  return reply({ok:true,...result});
 }catch(e){
  const code=String(e?.message||"");
  const safe=/^(provider_not_configured|invalid_request|invalid_photo|empty_provider_response|invalid_provider_image|unknown_provider_image_format|provider_rejected|provider_http_[0-9]{3})$/.test(code)?code:"provider_unavailable";
  return reply({ok:false,error:safe},safe.startsWith("invalid_")?400:e?.status===429?429:502);
 }
});
