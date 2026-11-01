// @ts-nocheck
/* SH9 × Léna v1102 · isolated JWT-gated TripPack handover preview.
 * NOT a public ChatGPT MCP endpoint: a separate OAuth2.1 MCP bridge is still
 * required. No service-role keys, no anonymous writes, no unauthenticated data.
 * Writes are DISABLED unless an operator sets a server-side opt-in flag.
 */
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
import {normalize} from "./trip-pack-core.mjs";
import {parseEnvelope,makeRecord,isSameRequest} from "./handover-core.mjs";

const NAME="hh-lena-handover-preview";
const ENABLE="HH_LENA_HANDOVER_PREVIEW_WRITE_ENABLED";
const TABLE="hh_my_trip_packs";
const MAX_BYTES=64000;
const validBearer=s=>/^Bearer [A-Za-z0-9._~+/=-]{20,8000}$/.test(s||"");
const j=(status,payload)=>Response.json(payload,{
 status,
 headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
function cors(request){
 const origin=request.headers.get("origin")||"";
 return origin==="https://zsoltandmonika-cloud.github.io"?{
  "Access-Control-Allow-Origin":origin,
  "Access-Control-Allow-Headers":"authorization,apikey,content-type",
  "Access-Control-Allow-Methods":"POST,GET,OPTIONS",
  "Vary":"Origin"
 }:{};
}
function respond(request,status,data){
 const base=j(status,data);
 const headers=new Headers(base.headers);
 for(const [k,v] of Object.entries(cors(request)))headers.set(k,v);
 return new Response(base.body,{status:base.status,headers});
}
const allowWrite=()=>Deno.env.get(ENABLE)==="true";
async function authorize(req){
 const authorization=req.headers.get("Authorization")||"";
 if(!validBearer(authorization))return null;
 const url=Deno.env.get("SUPABASE_URL");
 const anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return null;
 const token=authorization.slice(7).trim();
 const client=createClient(url,anon,{
  global:{headers:{Authorization:authorization}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data,error}=await client.auth.getUser(token);
 if(error||!data?.user||data.user.is_anonymous)return null;
 return {client,user:data.user};
}
function statusCode(error){
 if(error?.code==="23505")return 409;
 if(error?.code==="42501")return 403;
 return 503;
}
async function lookup(client,row){
 const result=await client.from(TABLE).select("profile_key,trip_id,trip_data")
  .eq("profile_key",row.profile_key).eq("trip_id",row.trip_id).maybeSingle();
 if(result.error)throw result.error;
 return result.data;
}
async function handle(req){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  ...cors(req),"Cache-Control":"no-store"
 }});
 if(req.method!=="GET"&&req.method!=="POST")
  return respond(req,405,{status:"method_not_allowed"});
 const identity=await authorize(req);
 if(!identity)return respond(req,401,{status:"unauthorized"});
 const {client,user}=identity;
 if(req.method==="GET")return respond(req,200,{
  status:"preview_ready",name:NAME,mode:allowWrite()?"write_enabled":"dry_run",
  auth:"supabase_user_jwt",mcpOAuth:false
 });
 const contentType=req.headers.get("content-type")||"";
 if(!/^application\/json(?:\s*;|$)/i.test(contentType))
  return respond(req,415,{status:"unsupported_media_type"});
 const size=Number(req.headers.get("content-length")||"0");
 if(size>MAX_BYTES)return respond(req,413,{status:"too_large"});
 const text=await req.text();
 if(text.length>MAX_BYTES)return respond(req,413,{status:"too_large"});
 let parsed;
 try{parsed=parseEnvelope(text,{normalize})}
 catch(e){return respond(req,422,{status:"invalid_trip_pack",detail:e?.message||"Invalid data"})}
 const profileKey=parsed.profile==="m"?"monika":"zsolt";
 // This table is RLS scoped to the authenticated Supabase JWT. A model-supplied
 // profile is never treated as consent to write that household member's data.
 const access=await client.from("hh_profile_access").select("profile_key")
  .eq("user_id",user.id).eq("profile_key",profileKey).maybeSingle();
 if(access.error)return respond(req,503,{status:"access_check_unavailable"});
 if(!access.data)return respond(req,403,{status:"access_denied"});
 let row;
 try{row=makeRecord(parsed,[parsed.profile],Date.now())}
 catch(_){return respond(req,422,{status:"invalid_handover"})}
 if(!allowWrite())return respond(req,200,{
  status:"validated_dry_run",requestId:parsed.requestId,profile:parsed.profile,
  saved:false
 });
 let old;
 try{old=await lookup(client,row)}
 catch(_){return respond(req,503,{status:"cloud_read_failed"})}
 if(old){
  if(isSameRequest(old,row))return respond(req,200,{
   status:"already_saved",requestId:parsed.requestId,tripId:row.trip_id,saved:true
  });
  return respond(req,409,{status:"request_id_conflict"});
 }
 const result=await client.from(TABLE).insert(row);
 if(result.error){
  if(result.error.code==="23505"){
   try{
    const existing=await lookup(client,row);
    if(isSameRequest(existing,row))return respond(req,200,{
     status:"already_saved",requestId:parsed.requestId,tripId:row.trip_id,saved:true
    });
   }catch(_){}
   return respond(req,409,{status:"request_id_conflict"});
  }
  return respond(req,statusCode(result.error),{status:"cloud_write_failed"});
 }
 try{
  const verified=await lookup(client,row);
  if(!isSameRequest(verified,row))return respond(req,503,{status:"write_confirmation_failed"});
 }catch(_){return respond(req,503,{status:"write_confirmation_failed"})}
 return respond(req,201,{
  status:"saved",requestId:parsed.requestId,tripId:row.trip_id,saved:true
 });
}
Deno.serve(async request=>{
 try{return await handle(request)}
 catch(_){return respond(request,503,{status:"temporarily_unavailable"})}
});
