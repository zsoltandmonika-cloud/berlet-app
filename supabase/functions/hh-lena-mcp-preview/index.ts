// @ts-nocheck
/* SH9 × Léna MCP Phase 2B v1103.
 * Stateless MCP Streamable HTTP (JSON response). Read-only discovery; STRICTLY
 * gated tools/call. Supabase Auth OAuth2.1 is the designated authorization
 * server; its OAuth Server + consent screen are NOT enabled by this deploy.
 * Defaults: no clients allowed, no writes, and no model/API calls.
 * Note: verify_jwt=false at Edge ingress ONLY so OAuth resource metadata and
 * anonymous tools/list can be fetched; every tool/call validates JWT server-side.
 */
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
import {normalize} from "./trip-pack-core.mjs";
import {parseEnvelope,makeRecord,isSameRequest} from "./handover-core.mjs";

const PROJECT="vhsrupphzcjkdrusonzh";
const BASE="https://"+PROJECT+".supabase.co";
const RESOURCE=BASE+"/functions/v1/hh-lena-mcp-preview";
const METADATA=RESOURCE+"/.well-known/oauth-protected-resource";
const AUTH_ISSUER=BASE+"/auth/v1";
const TOOL="save_trip_pack";
const SCOPE="trip.write";
const MAX_BODY=64000;
const origin="https://zsoltandmonika-cloud.github.io";
const env=k=>Deno.env.get(k)||"";
const writeEnabled=()=>env("HH_LENA_MCP_WRITE_ENABLED")==="true";
const allowedClients=()=>env("HH_LENA_MCP_ALLOWED_CLIENT_IDS").split(",").map(x=>x.trim()).filter(Boolean);
const json=(body,status=200,extras={})=>Response.json(body,{status,headers:{
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extras
}});
const rpc=(id,value)=>({jsonrpc:"2.0",id,result:value});
const error=(id,code,message)=>({jsonrpc:"2.0",id,error:{code,message}});
const textResult=(data)=>({
 content:[{type:"text",text:JSON.stringify(data)}],
 structuredContent:data,isError:false
});
const authError=(id,detail)=>({
 ...rpc(id,{content:[{type:"text",text:"Az SH9 OAuth-kapcsolat nincs engedélyezve: "+detail}],
 isError:true,_meta:{"mcp/www_authenticate":[
  'Bearer resource_metadata="'+METADATA+'", scope="'+SCOPE+
  '", error="insufficient_scope", error_description="SH9 OAuth login required"'
 ]}})
});
function challenge(){
 return 'Bearer resource_metadata="'+METADATA+'", scope="'+SCOPE+'"';
}
function metadata(){
 return {resource:RESOURCE,authorization_servers:[AUTH_ISSUER],
  scopes_supported:[SCOPE],
  resource_documentation:"https://github.com/zsoltandmonika-cloud/berlet-app/blob/main/sh9/smart-travel/lena-native/PHASE2B_V1103.md"};
}
function tool(){
 return {
  name:TOOL,title:"Mentett útiterv hozzáadása · SH9",
  description:"Ellenőrzött SH9 TripPack utazás mentése a jogosult Mónika vagy Zsolt My Trips archívumába. A küldő profil nem jogosultság, RLS ellenőrzi. Nincs adatmentés, ha a pilot kapcsoló tiltott.",
  inputSchema:{
   type:"object",additionalProperties:false,
   properties:{
    schema:{type:"string",const:"sh9.lena-handover/1"},
    requestId:{type:"string",format:"uuid"},
    profile:{type:"string",enum:["m","z"]},
    tripPack:{type:"object",description:"sh9.trip-pack/1 teljes, validált útiterv"}
   },required:["schema","requestId","profile","tripPack"]
  },
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true},
  securitySchemes:[{type:"oauth2",scopes:[SCOPE]}]
 };
}
function decodeClaims(token){
 try{
  const parts=token.split(".");
  if(parts.length!==3)return null;
  const base64=parts[1].replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64.padEnd(Math.ceil(base64.length/4)*4,"="));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
 }catch(_){return null}
}
function tokenClaimsOK(c,user){
 if(!c||typeof c!=="object"||!user?.id||c.sub!==user.id)return false;
 const now=Math.floor(Date.now()/1000);
 if(c.iss!==AUTH_ISSUER||c.role!=="authenticated")return false;
 if(!Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.iat)||c.iat>now+60)return false;
 if(c.nbf!==undefined&&(!Number.isFinite(c.nbf)||c.nbf>now))return false;
 const aud=env("HH_LENA_MCP_AUDIENCE");
 // Custom audience is required for the MCP resource; a normal household
 // Supabase session ('authenticated') must never be usable as MCP auth.
 if(aud!==RESOURCE)return false;
 const audiences=Array.isArray(c.aud)?c.aud:[c.aud];
 if(!audiences.includes(RESOURCE))return false;
 const allowed=allowedClients();
 if(!allowed.length||typeof c.client_id!=="string"||!allowed.includes(c.client_id))return false;
 const scopes=[...(typeof c.scope==="string"?c.scope.split(/\s+/):[]),
  ...(Array.isArray(c.scopes)?c.scopes:[])];
 if(!scopes.includes(SCOPE))return false;
 return true;
}
async function authorize(req){
 const header=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._~+/=-]{40,8000}$/.test(header))return null;
 const token=header.slice(7);
 const client=createClient(BASE,env("SUPABASE_ANON_KEY"),{
  global:{headers:{Authorization:header}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 if(!env("SUPABASE_ANON_KEY"))return null;
 const {data,error}=await client.auth.getUser(token);
 if(error||!data?.user||data.user.is_anonymous)return null;
 // Signature/session validity is provided by auth.getUser.
 // Claims are decoded ONLY AFTER that verification, then independently
 // checked against the configured OAuth client, MCP audience and scope.
 if(!tokenClaimsOK(decodeClaims(token),data.user))return null;
 return {client,user:data.user};
}
async function save(args,identity){
 const profileKey=args.profile==="m"?"monika":"zsolt";
 const parsed=parseEnvelope(args,{normalize});
 const check=await identity.client.from("hh_profile_access").select("profile_key")
  .eq("user_id",identity.user.id).eq("profile_key",profileKey).maybeSingle();
 if(check.error)throw Error("profile_check_unavailable");
 if(!check.data)throw Error("profile_denied");
 const row=makeRecord(parsed,[parsed.profile],Date.now());
 if(!writeEnabled())return {status:"validated_dry_run",saved:false,
  requestId:parsed.requestId,profile:parsed.profile};
 const table=identity.client.from("hh_my_trip_packs");
 async function find(){
  const q=await identity.client.from("hh_my_trip_packs")
   .select("profile_key,trip_id,trip_data")
   .eq("profile_key",row.profile_key).eq("trip_id",row.trip_id).maybeSingle();
  if(q.error)throw Error("read_failed");
  return q.data;
 }
 const existing=await find();
 if(existing){
  if(isSameRequest(existing,row))return {status:"already_saved",saved:true,tripId:row.trip_id};
  throw Error("request_id_conflict");
 }
 const result=await table.insert(row);
 if(result.error){
  if(result.error.code==="23505"){
   const after=await find();
   if(isSameRequest(after,row))return {status:"already_saved",saved:true,tripId:row.trip_id};
   throw Error("request_id_conflict");
  }
  throw Error("write_failed");
 }
 const confirmed=await find();
 if(!isSameRequest(confirmed,row))throw Error("write_confirmation_failed");
 return {status:"saved",saved:true,tripId:row.trip_id};
}
async function handle(req){
 const u=new URL(req.url);
 const pathname=u.pathname;
 if(req.method==="GET"&&
   (pathname.endsWith("/.well-known/oauth-protected-resource")||u.searchParams.has("oauth-metadata")))
  return json(metadata());
 if(req.method==="OPTIONS"){
  if(req.headers.get("origin")!==origin)return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{
   "Access-Control-Allow-Origin":origin,
   "Access-Control-Allow-Headers":"authorization,apikey,content-type,mcp-protocol-version",
   "Access-Control-Allow-Methods":"POST,GET,OPTIONS","Vary":"Origin"
  }});
 }
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const type=req.headers.get("content-type")||"";
 if(!/^application\/json(?:\s*;|$)/i.test(type))return json({error:"invalid_media_type"},415);
 if(Number(req.headers.get("content-length")||0)>MAX_BODY)return json({error:"too_large"},413);
 const raw=await req.text();
 if(raw.length>MAX_BODY)return json({error:"too_large"},413);
 let input;
 try{input=JSON.parse(raw)}catch(_){return json(error(null,-32700,"Parse error"))}
 if(!input||typeof input!=="object"||Array.isArray(input)||input.jsonrpc!=="2.0")
  return json(error(input?.id??null,-32600,"Invalid request"));
 const id=input.id??null;
 if(input.method==="notifications/initialized")return new Response(null,{status:202});
 if(input.method==="initialize")return json(rpc(id,{
  protocolVersion:"2025-06-18",
  capabilities:{tools:{listChanged:false}},
  serverInfo:{name:"sh9-lena-mcp-preview",version:"0.1.0"}
 }));
 if(input.method==="ping")return json(rpc(id,{}));
 if(input.method==="tools/list")return json(rpc(id,{tools:[tool()]}));
 if(input.method!=="tools/call")return json(error(id,-32601,"Method not found"));
 if(input.params?.name!==TOOL)return json(error(id,-32602,"Unknown tool"));
 const identity=await authorize(req);
 if(!identity){
  return json(authError(id,"Token, scope, resource vagy OAuth kliensazonosító hiányzik"),200,{
   "WWW-Authenticate":challenge()
  });
 }
 try{
  const data=await save(input.params?.arguments,identity);
  return json(rpc(id,textResult(data)));
 }catch(e){
  return json(rpc(id,{content:[{
   type:"text",text:"SH9 mentési hiba: "+String(e?.message||"invalid")
  }],isError:true}));
 }
}
Deno.serve(async req=>{
 try{return await handle(req)}catch(_){
  return json({error:"temporarily_unavailable"},503)
 }
});
