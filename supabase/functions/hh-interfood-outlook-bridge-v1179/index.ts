// HealthHub v1179 · confidential Outlook Interfood Bridge.
// Requires one explicit Microsoft OAuth consent; no ChatGPT connector delegation.
// All token and order reads are gated by Supabase Auth profile membership.
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
import {parseConfirmedMail,matchOfficial} from "./parser.ts";
const URL0=()=>env("SUPABASE_URL").replace(/\/$/,"");
const env=(key)=>Deno.env.get(key)?.trim()||"";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const RETURN=ORIGIN+"/berlet-app/healthhub/nutrition/";
const NAME="hh-interfood-outlook-bridge-v1179";
const GRAPH="https://graph.microsoft.com/v1.0/";
const AUTH="https://login.microsoftonline.com/consumers/oauth2/v2.0/";
const SCOPE="openid profile offline_access User.Read Mail.Read";
const FOLDER="Interfood Rendelések";
const cors={
 "Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-hh-cron-key",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Cache-Control":"no-store","Vary":"Origin",
 "X-Content-Type-Options":"nosniff"
};
function json(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json;charset=utf-8"}});
}
function done(status){
 return new Response(null,{status:303,headers:{"Location":RETURN+"?outlook_bridge="+
  encodeURIComponent(status),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
function admin(){
 return createClient(URL0(),env("SUPABASE_SERVICE_ROLE_KEY"),{
  auth:{persistSession:false,autoRefreshToken:false}});
}
function configured(){
 try{return !!(env("SUPABASE_URL")&&env("SUPABASE_SERVICE_ROLE_KEY")&&
  env("SUPABASE_ANON_KEY")&&
  /^[0-9a-f-]{36}$/i.test(env("HH_IF_MS_CLIENT_ID"))&&
  env("HH_IF_MS_CLIENT_SECRET").length>12&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env("HH_IF_MS_EXPECTED_ACCOUNT"))&&
  Uint8Array.from(atob(env("HH_IF_AES_KEY_B64")),x=>x.charCodeAt(0)).length===32);
 }catch(_){return false}
}
const callbackUri=()=>URL0()+"/functions/v1/"+NAME;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
async function hash(text){
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text)))));
}
const rand=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const b64=b=>btoa(String.fromCharCode(...b));
const unb64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
async function key(){
 return crypto.subtle.importKey("raw",unb64(env("HH_IF_AES_KEY_B64")),
  {name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function seal(secret,owner){
 const nonce=crypto.getRandomValues(new Uint8Array(12));
 const bytes=await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,
  additionalData:new TextEncoder().encode(owner)},await key(),new TextEncoder().encode(secret));
 return {refresh_nonce:b64(nonce),refresh_ciphertext:b64(new Uint8Array(bytes))};
}
async function openToken(row,owner){
 const b=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(row.refresh_nonce),
  additionalData:new TextEncoder().encode(owner)},await key(),unb64(row.refresh_ciphertext));
 return new TextDecoder().decode(b);
}
async function member(req){
 const header=req.headers.get("authorization")||"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(token.length<40)return null;
 const client=createClient(URL0(),env("SUPABASE_ANON_KEY"),
  {auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data?.user?.id)return null;
 const owner=data.user.id;
 const permitted=await admin().from("hh_profile_access").select("profile_key")
  .eq("user_id",owner).eq("profile_key","monika").limit(1);
 return !permitted.error&&permitted.data?.length?owner:null;
}
async function microsoftToken(params){
 const r=await fetch(AUTH+"token",{method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams(params),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("microsoft_token_failed");
 const data=await r.json();
 if(!data.access_token)throw Error("microsoft_access_missing");
 return data;
}
async function graph(access,path,prefer=""){
 const url=new URL(path,GRAPH);
 if(url.protocol!=="https:"||url.hostname!=="graph.microsoft.com"||
  !url.pathname.startsWith("/v1.0/"))throw Error("graph_url_invalid");
 const headers={Authorization:"Bearer "+access};
 if(prefer)headers.Prefer=prefer;
 const response=await fetch(url.href,{headers,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error("microsoft_graph_failed");
 return response.json();
}
async function inboxFolder(access){
 const resp=await graph(access,
  "me/mailFolders/inbox/childFolders?$select=id,displayName&$top=100");
 const rows=(resp.value||[]).filter(x=>x.displayName===FOLDER&&typeof x.id==="string");
 if(rows.length!==1||resp["@odata.nextLink"])throw Error("interfood_folder_not_unique");
 return rows[0].id;
}
async function exactAccount(access){
 const me=await graph(access,"me?$select=mail,userPrincipalName");
 const email=env("HH_IF_MS_EXPECTED_ACCOUNT").toLowerCase();
 const found=[me.mail,me.userPrincipalName].filter(Boolean)
  .map(x=>String(x).toLowerCase());
 if(!found.includes(email))throw Error("microsoft_wrong_account");
 return email;
}
async function begin(owner){
 if(!configured())return json({error:"setup_required"},503);
 const state=rand(32),state_hash=await hash(state);
 const inserted=await admin().from("hh_interfood_graph_oauth_pending_v1").insert({
  state_hash,owner_user_id:owner,
  expires_at:new Date(Date.now()+8*60000).toISOString()});
 if(inserted.error)throw Error("oauth_state_failed");
 const u=new URL(AUTH+"authorize");
 for(const [k,v] of Object.entries({
  client_id:env("HH_IF_MS_CLIENT_ID"),response_type:"code",
  redirect_uri:callbackUri(),response_mode:"query",scope:SCOPE,
  state,prompt:"select_account"}))u.searchParams.set(k,v);
 return json({authorizeUrl:u.href});
}
async function callback(req){
 if(!configured())return done("setup_required");
 const u=new URL(req.url),state=u.searchParams.get("state")||"",
  code=u.searchParams.get("code")||"";
 if(u.searchParams.has("error")||state.length!==64||code.length<10)return done("cancelled");
 try{
  const removed=await admin().from("hh_interfood_graph_oauth_pending_v1")
   .delete().eq("state_hash",await hash(state))
   .gt("expires_at",new Date().toISOString()).select("owner_user_id").maybeSingle();
  if(removed.error||!removed.data?.owner_user_id)return done("expired");
  const owner=removed.data.owner_user_id;
  const grant=await microsoftToken({grant_type:"authorization_code",code,
   client_id:env("HH_IF_MS_CLIENT_ID"),
   client_secret:env("HH_IF_MS_CLIENT_SECRET"),redirect_uri:callbackUri()});
  if(!grant.refresh_token)return done("offline_permission_missing");
  const account=await exactAccount(grant.access_token);
  const folder_id=await inboxFolder(grant.access_token);
  const encryption=await seal(grant.refresh_token,owner);
  const saved=await admin().from("hh_interfood_graph_connections_v1").upsert({
   owner_user_id:owner,account_email:account,folder_id,
   ...encryption,updated_at:new Date().toISOString(),last_error_code:null},
   {onConflict:"owner_user_id"});
  if(saved.error)return done("save_failed");
  return done("connected");
 }catch(_){return done("connection_failed")}
}
async function refreshConnection(row){
 const owner=row.owner_user_id,refresh=await openToken(row,owner);
 const grant=await microsoftToken({grant_type:"refresh_token",
  refresh_token:refresh,client_id:env("HH_IF_MS_CLIENT_ID"),
  client_secret:env("HH_IF_MS_CLIENT_SECRET"),redirect_uri:callbackUri(),
  scope:SCOPE});
 if(grant.refresh_token&&grant.refresh_token!==refresh){
  const updated=await admin().from("hh_interfood_graph_connections_v1")
   .update({...await seal(grant.refresh_token,owner),updated_at:new Date().toISOString()})
   .eq("owner_user_id",owner);
  if(updated.error)throw Error("refresh_storage_failed");
 }
 return grant.access_token;
}
async function feedMenu(){
 try{
  const r=await fetch(ORIGIN+"/berlet-app/healthhub/nutrition/interfood-live-feed-v1176.json",
   {signal:AbortSignal.timeout(12000),cache:"no-cache"});
  if(!r.ok)return null;
  const data=await r.json();
  if(data.schemaVersion!=="healthhub.interfood.live/1"||!Array.isArray(data.items)||
   data.items.length>5000||Date.now()-Date.parse(data.updatedAt)>72*3600000)return null;
  return data;
 }catch(_){return null}
}
async function messages(access,folder){
 const base="me/mailFolders/"+encodeURIComponent(folder)+
  "/messages?$select=id,subject,body,receivedDateTime&$orderby=receivedDateTime%20desc&$top=50";
 let next=new URL(base,GRAPH).href,all=[];
 for(let page=0;page<3&&next;page++){
  const data=await graph(access,next,'outlook.body-content-type="text"');
  if(!Array.isArray(data.value))throw Error("graph_messages_invalid");
  all.push(...data.value);
  next=data["@odata.nextLink"]||"";
 }
 return all.slice(0,150);
}
async function processMessages(row,access,official){
 let newCount=0,enriched=0,recognized=0;
 const messagesInFolder=await messages(access,row.folder_id);
 for(const mail of messagesInFolder){
  if(!/ételrendelés/i.test(String(mail.subject||"")))continue;
  if(!mail.id||!mail.body)continue;
  const meals=parseConfirmedMail(mail.body);
  recognized+=meals.length;
  const source_hash=await hash(mail.id);
  for(const meal of meals){
   // Store only a small safe food snapshot. Delivery and account info remain in Outlook.
   const id=await hash(row.owner_user_id+"|"+meal.menuDate+"|"+meal.code+"|"+meal.name);
   const entry=await admin().from("hh_interfood_confirmed_orders_v1")
    .select("id,image_url").eq("id",id).maybeSingle();
   if(entry.error)throw Error("order_read_failed");
   const photo=matchOfficial(meal,official);
   if(!entry.data){
    const insert=await admin().from("hh_interfood_confirmed_orders_v1").insert({
     id,owner_user_id:row.owner_user_id,menu_date:meal.menuDate,
     profile_key:"monika",code:meal.code,name:meal.name,quantity:meal.quantity,
     nutrients:meal.nutrients,weight_grams:photo.weightGrams,
     image_url:photo.imageUrl,source_hash
    });
    if(insert.error)throw Error("order_insert_failed");
    newCount++;
   }else if(!entry.data.image_url&&photo.imageUrl){
    const patch=await admin().from("hh_interfood_confirmed_orders_v1")
     .update({image_url:photo.imageUrl,weight_grams:photo.weightGrams,
       updated_at:new Date().toISOString()})
     .eq("id",id).is("image_url",null);
    if(patch.error)throw Error("order_enrichment_failed");
    enriched++;
   }
  }
 }
 return {newCount,enriched,recognized};
}
async function syncAll(){
 if(!configured())return json({ok:false,reason:"setup_required"},503);
 const rows=await admin().from("hh_interfood_graph_connections_v1")
  .select("*").limit(3);
 if(rows.error)throw Error("connections_unavailable");
 if(!rows.data?.length)return json({ok:true,connected:0,imported:0});
 const official=await feedMenu();let imported=0,upgraded=0,failed=0;
 for(const row of rows.data){
  try{
   const access=await refreshConnection(row);
   const result=await processMessages(row,access,official);
   imported+=result.newCount;upgraded+=result.enriched;
   await admin().from("hh_interfood_graph_connections_v1").update({
    last_sync_at:new Date().toISOString(),last_error_code:null}).eq("owner_user_id",row.owner_user_id);
  }catch(_){
   failed++;
   await admin().from("hh_interfood_graph_connections_v1")
    .update({last_error_code:"sync_failed"}).eq("owner_user_id",row.owner_user_id);
  }
 }
 return json({ok:failed===0,connected:rows.data.length,imported,upgraded,failed},failed?503:200);
}
async function cronAuthorized(req){
 const secret=req.headers.get("x-hh-cron-key")||"";
 if(!/^[0-9a-f]{64}$/i.test(secret))return false;
 const cfg=await admin().from("hh_interfood_bridge_config_v1").select("secret_sha256")
  .eq("name","cron_v1").maybeSingle();
 if(cfg.error||!cfg.data)return false;
 const a=await hash(secret),b=cfg.data.secret_sha256;
 let diff=a.length^b.length;
 for(let i=0;i<Math.min(a.length,b.length);i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function route(req){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 const u=new URL(req.url);
 if(req.method==="GET"&&u.pathname.endsWith("/"+NAME)&&
  (u.searchParams.has("state")||u.searchParams.has("error")))return callback(req);
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(Number(req.headers.get("content-length")||0)>10000)return json({error:"request_too_large"},413);
 const input=await req.json().catch(()=>null);
 if(!input||typeof input!=="object")return json({error:"invalid_request"},400);
 if(input.action==="cron"){
  if(!await cronAuthorized(req))return json({error:"unauthorized"},401);
  return syncAll();
 }
 const owner=await member(req);
 if(!owner)return json({error:"unauthorized"},401);
 if(input.action==="status"){
  const q=await admin().from("hh_interfood_graph_connections_v1")
   .select("granted_at,last_sync_at,last_error_code").eq("owner_user_id",owner).maybeSingle();
  if(q.error)return json({error:"status_unavailable"},503);
  return json({configured:configured(),connected:!!q.data,lastSyncAt:q.data?.last_sync_at||null,
   lastError:q.data?.last_error_code||null});
 }
 if(input.action==="connect")return begin(owner);
 if(input.action==="orders"){
  const since=new Date(Date.now()-180*86400000).toISOString().slice(0,10);
  const q=await admin().from("hh_interfood_confirmed_orders_v1")
   .select("id,profile_key,menu_date,code,name,quantity,nutrients,weight_grams,image_url")
   .eq("profile_key","monika").gte("menu_date",since)
   .order("menu_date",{ascending:true}).limit(400);
  if(q.error)throw Error("order_fetch_failed");
  return json({orders:(q.data||[]).map(x=>({
   id:x.id,menuDate:x.menu_date,code:x.code,name:x.name,quantity:x.quantity,
   nutrients:x.nutrients,weightGrams:x.weight_grams,imageUrl:x.image_url}))});
 }
 if(input.action==="sync-now"){
  // User-triggered, fully authorized; no credentials or raw emails returned.
  return syncAll();
 }
 return json({error:"unknown_action"},400);
}
Deno.serve(async req=>{
 try{return await route(req)}
 catch(_){return json({error:"bridge_unavailable"},503)}
});
