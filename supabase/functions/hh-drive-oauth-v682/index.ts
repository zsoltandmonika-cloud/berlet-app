// HealthHub v682 · server-side Google Drive authorization-code OAuth.
// Secrets and refresh tokens NEVER leave server. Inert until all server env
// values are configured. The old browser Drive flow is left untouched.
import {createClient} from "npm:@supabase/supabase-js@2";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const HOME=ORIGIN+"/berlet-app/healthhub/";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const ENV=k=>Deno.env.get(k)?.trim()||"";
const cors={"Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin",
 "Cache-Control":"no-store"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),
 {status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const finish=label=>new Response(null,{status:303,headers:{
 Location:HOME+"?drive_oauth="+label,"Cache-Control":"no-store",
 "Referrer-Policy":"no-referrer"}});
function bytesBase64(b){return btoa(String.fromCharCode(...b))}
function fromBase64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function randomBytes(n){return crypto.getRandomValues(new Uint8Array(n))}
function canRun(){
 try{return !!(ENV("SUPABASE_URL")&&ENV("SUPABASE_ANON_KEY")&&
  ENV("SUPABASE_SERVICE_ROLE_KEY")&&ENV("HH_GOOGLE_DRIVE_CLIENT_ID")&&
  ENV("HH_GOOGLE_DRIVE_CLIENT_SECRET")&&
  ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL")&&
  fromBase64(ENV("HH_GOOGLE_DRIVE_ENCRYPTION_KEY")).length===32)}
 catch(_){return false}
}
const admin=()=>createClient(ENV("SUPABASE_URL"),ENV("SUPABASE_SERVICE_ROLE_KEY"),{
 auth:{autoRefreshToken:false,persistSession:false}});
const redirectUri=()=>ENV("SUPABASE_URL").replace(/\/$/,"")+
 "/functions/v1/hh-drive-oauth-v682";
async function sha(text){
 const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
 return [...new Uint8Array(d)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function aesKey(){
 return crypto.subtle.importKey("raw",fromBase64(ENV("HH_GOOGLE_DRIVE_ENCRYPTION_KEY")),
 "AES-GCM",false,["encrypt","decrypt"]);
}
async function encrypt(value,userId){
 const nonce=randomBytes(12);
 const body=await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,
  additionalData:new TextEncoder().encode(userId)},
  await aesKey(),new TextEncoder().encode(value));
 return {refresh_nonce:bytesBase64(nonce),
  refresh_ciphertext:bytesBase64(new Uint8Array(body))};
}
async function decrypt(row,userId){
 const body=await crypto.subtle.decrypt({name:"AES-GCM",
  iv:fromBase64(row.refresh_nonce),
  additionalData:new TextEncoder().encode(userId)},
  await aesKey(),fromBase64(row.refresh_ciphertext));
 return new TextDecoder().decode(body);
}
async function auth(req){
 const h=req.headers.get("authorization")||"";
 if(!/^Bearer .{20,}$/.test(h))return null;
 const jwt=h.slice(7);
 const client=createClient(ENV("SUPABASE_URL"),ENV("SUPABASE_ANON_KEY"),{
  auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await client.auth.getUser(jwt);
 const user=data?.user;
 if(error||!user)return null;
 const access=await admin().from("hh_profile_access").select("profile_key")
  .eq("user_id",user.id).in("profile_key",["monika","zsolt"]).limit(2);
 if(access.error||!access.data?.length)return null;
 return user.id;
}
async function exchange(body){
 const res=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams(body),signal:AbortSignal.timeout(16000)});
 if(!res.ok)throw Error("google_exchange_failed");
 const data=await res.json();
 if(!data.access_token)throw Error("google_access_missing");
 return data;
}
async function whoGoogle(access){
 const res=await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",{
  headers:{"Authorization":"Bearer "+access},signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error("google_identity_unavailable");
 const body=await res.json();
 return String(body?.user?.emailAddress||"").trim().toLowerCase();
}
async function refreshedAccess(owner){
 const response=await admin().from("hh_google_drive_oauth_connections")
  .select("refresh_nonce,refresh_ciphertext,google_account_email")
  .eq("owner_user_id",owner).maybeSingle();
 if(response.error||!response.data)return null;
 const row=response.data;
 if(row.google_account_email!==ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase())
  throw Error("account_mismatch");
 const secret=await decrypt(row,owner);
 const res=await exchange({client_id:ENV("HH_GOOGLE_DRIVE_CLIENT_ID"),
  client_secret:ENV("HH_GOOGLE_DRIVE_CLIENT_SECRET"),grant_type:"refresh_token",
  refresh_token:secret});
 if(res.refresh_token&&res.refresh_token!==secret){
  const cryptoRow=await encrypt(res.refresh_token,owner);
  const update=await admin().from("hh_google_drive_oauth_connections")
   .update({...cryptoRow,refreshed_at:new Date().toISOString()})
   .eq("owner_user_id",owner);
  if(update.error)throw Error("rotation_storage_failed");
 }
 return res.access_token;
}

/* v685: READ-ONLY patient-scoped original Drive PDF gateway.
   An authenticated member of one HealthHub profile cannot borrow the
   other profile, even when Google's household Drive account is shared.
   Files are trusted ONLY after verifying live folder ancestry in Drive.
   No opaque Google access token is returned to the browser. */
async function profileAllowed(owner,profile){
 if(profile!=="monika"&&profile!=="zsolt")return false;
 const result=await admin().from("hh_profile_access").select("profile_key")
  .eq("user_id",owner).eq("profile_key",profile).limit(1);
 return !result.error&&!!result.data?.length;
}
const driveId=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{8,200}$/.test(x);
async function googleList(access,q,fields,pageSize=1000,pageToken=""){
 const url=new URL("https://www.googleapis.com/drive/v3/files");
 for(const [k,v] of Object.entries({q,spaces:"drive",fields,pageSize:String(pageSize)}))
  url.searchParams.set(k,v);
 if(pageToken)url.searchParams.set("pageToken",pageToken);
 const r=await fetch(url,{headers:{Authorization:"Bearer "+access},
  signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("drive_list_unavailable");
 const result=await r.json();
 if(!Array.isArray(result?.files))throw Error("drive_list_invalid");
 return result;
}
async function exactArchiveFolder(access,profile){
 const rootQuery="name = 'HealthHub Lena Archive' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
 const roots=await googleList(access,rootQuery,"nextPageToken,files(id,name,mimeType)",2);
 if(roots.files.length!==1||roots.nextPageToken||!driveId(roots.files[0].id))
  throw Error("drive_archive_root_ambiguous");
 const folderName=profile==="monika"?"Monika":"Zsolt",root=roots.files[0].id;
 const folderQuery="name = '"+folderName+"' and '"+root+"' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
 const folders=await googleList(access,folderQuery,"nextPageToken,files(id,name,mimeType,parents)",2);
 if(folders.files.length!==1||folders.nextPageToken||!driveId(folders.files[0].id)||
    !folders.files[0].parents?.includes(root))
  throw Error("drive_profile_folder_ambiguous");
 return folders.files[0].id;
}
async function originalInventory(access,profile,folder){
 const query="'"+folder+"' in parents and mimeType = 'application/pdf' and trashed = false";
 const fields="nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum,appProperties,parents)";
 let pages=0,token="",rows=[];
 do{
  const result=await googleList(access,query,fields,1000,token);
  rows.push(...result.files);token=result.nextPageToken||"";
  if(++pages>4||rows.length>2000)throw Error("drive_inventory_too_large");
 }while(token);
 for(const f of rows)
  if(!driveId(f.id)||f.mimeType!=="application/pdf"||!f.parents?.includes(folder)||
    (f.appProperties?.profile&&f.appProperties.profile!==profile))
    throw Error("drive_inventory_profile_mismatch");
 return rows.map(f=>({id:f.id,name:String(f.name||"").slice(0,340),
  mimeType:f.mimeType,size:f.size||null,modifiedTime:f.modifiedTime||null,
  md5Checksum:f.md5Checksum||null,appProperties:f.appProperties||{},
  parents:[folder]}));
}
async function originalPdf(access,profile,folder,id,documentId=""){
 if(!driveId(id))throw Error("drive_pdf_invalid_id");
 if(documentId&&!/^[A-Za-z0-9-]{6,140}$/.test(documentId))throw Error("drive_document_invalid_id");
 const url=new URL("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id));
 url.searchParams.set("fields","id,name,mimeType,size,modifiedTime,appProperties,parents,trashed");
 const headers={Authorization:"Bearer "+access};
 const metadata=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
 if(!metadata.ok)throw Error("drive_pdf_metadata_unavailable");
 const m=await metadata.json();
 if(m.id!==id||m.trashed||m.mimeType!=="application/pdf"||
  !Array.isArray(m.parents)||!m.parents.includes(folder)||
  (m.appProperties?.profile&&m.appProperties.profile!==profile)||
  (documentId&&(m.appProperties?.profile!==profile||
   m.appProperties?.documentId!==documentId)))
  throw Error("drive_pdf_profile_mismatch");
 const expected=Number(m.size);
 if(!Number.isSafeInteger(expected)||expected<5||expected>(documentId?15000000:25000000))
  throw Error("drive_pdf_size_not_allowed");
 const download=await fetch("https://www.googleapis.com/drive/v3/files/"+
  encodeURIComponent(id)+"?alt=media",{headers,signal:AbortSignal.timeout(45000)});
 if(!download.ok)throw Error("drive_pdf_download_unavailable");
 // Limit network bytes even if the Google response omits Content-Length.
 const body=download.body;
 if(!body)throw Error("drive_pdf_empty");
 const reader=body.getReader();let chunks=[],length=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>(documentId?15000000:25000000)||length>expected)throw Error("drive_pdf_oversize");
   chunks.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e}
 if(length!==expected)throw Error("drive_pdf_size_mismatch");
 const data=new Uint8Array(length);let offset=0;
 for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}
 if(data[0]!==37||data[1]!==80||data[2]!==68||data[3]!==70||data[4]!==45)
  throw Error("drive_pdf_invalid_signature");
 return new Response(data,{status:200,headers:{...cors,
  "Content-Type":"application/pdf","X-Content-Type-Options":"nosniff",
  "Content-Length":String(length)}});
}

async function route(req){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 const u=new URL(req.url),task=u.searchParams.get("action")||"";
 // Google appends state/code to the registered bare redirect URI; it does NOT add action=callback.
 if(req.method==="GET"&&(task==="callback"||u.searchParams.has("state"))){
  const state=u.searchParams.get("state")||"";
  const code=u.searchParams.get("code")||"";
  if(!canRun())return finish("setup_required");
  if(u.searchParams.has("error")||state.length<40||code.length<8)return finish("cancelled");
  try{
   // Consume a one-time, eight-minute state bound to an authorized HH user.
   const pending=await admin().from("hh_google_drive_oauth_pending")
    .delete().eq("state_sha256",await sha(state))
    .gt("expires_at",new Date().toISOString()).select("owner_user_id").maybeSingle();
   if(pending.error||!pending.data)return finish("expired");
   const owner=pending.data.owner_user_id;
   const token=await exchange({grant_type:"authorization_code",code,
    client_id:ENV("HH_GOOGLE_DRIVE_CLIENT_ID"),
    client_secret:ENV("HH_GOOGLE_DRIVE_CLIENT_SECRET"),
    redirect_uri:redirectUri()});
   if(!token.refresh_token)return finish("no_offline_grant");
   if(token.scope&&!String(token.scope).split(/\s+/).includes(SCOPE))
    return finish("scope_denied");
   const email=await whoGoogle(token.access_token);
   if(email!==ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase())
    return finish("wrong_account");
   const safe=await encrypt(token.refresh_token,owner);
   const inserted=await admin().from("hh_google_drive_oauth_connections")
    .upsert({owner_user_id:owner,google_account_email:email,...safe,
     granted_scope:SCOPE,authorized_at:new Date().toISOString(),
     refreshed_at:new Date().toISOString()});
   return inserted.error?finish("save_failed"):finish("connected");
  }catch(_){return finish("exchange_failed")}
 }
 if(req.method!=="POST"||req.headers.get("origin")!==ORIGIN)
  return reply({error:"forbidden_origin_or_method"},403);
 const owner=await auth(req);
 if(!owner)return reply({error:"health_vault_required"},401);
 const payload=await req.json().catch(()=>({}));
 const op=String(payload?.action||"");
 if(op==="status"){
  if(!canRun())return reply({configured:false,connected:false});
  const result=await admin().from("hh_google_drive_oauth_connections")
   .select("authorized_at,google_account_email").eq("owner_user_id",owner).maybeSingle();
  return result.error?reply({error:"status_unavailable"},503):
   reply({configured:true,connected:!!result.data,
    account:result.data?.google_account_email||null,
    authorizedAt:result.data?.authorized_at||null});
 }
 if(!canRun())return reply({configured:false,error:"google_cloud_secrets_required"},503);
 if(op==="start"){
  const state=bytesBase64(randomBytes(36))
   .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const inserted=await admin().from("hh_google_drive_oauth_pending")
   .insert({state_sha256:await sha(state),owner_user_id:owner,
    expires_at:new Date(Date.now()+8*60*1000).toISOString()});
  if(inserted.error)return reply({error:"oauth_setup_unavailable"},503);
  const link=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for(const [k,v]of Object.entries({client_id:ENV("HH_GOOGLE_DRIVE_CLIENT_ID"),
   redirect_uri:redirectUri(),response_type:"code",scope:SCOPE,
   access_type:"offline",prompt:"consent",
   login_hint:ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL"),state}))
   link.searchParams.set(k,v);
  return reply({authorization_url:link.toString()});
 }
 if(op==="check"){
  try{
   const token=await refreshedAccess(owner);
   if(!token)return reply({configured:true,connected:false});
   const email=await whoGoogle(token);
   return reply({configured:true,connected:email===
    ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase()});
  }catch(_){return reply({configured:true,connected:false,reauthorizationNeeded:true})}
 }
 if(op==="archive_inventory"||op==="archive_pdf"||op==="archive_document"){
  const profile=String(payload?.profile||"");
  if(!await profileAllowed(owner,profile))
   return reply({error:"archive_profile_forbidden"},403);
  try{
   const token=await refreshedAccess(owner);
   if(!token)return reply({error:"drive_connection_missing"},409);
   const email=await whoGoogle(token);
   if(email!==ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase())
    return reply({error:"drive_account_mismatch"},403);
   const folder=await exactArchiveFolder(token,profile);
   if(op==="archive_inventory"){
    const files=await originalInventory(token,profile,folder);
    return reply({profile,folder,files});
   }
   if(op==="archive_document"){
    // Resolve only a uniquely tagged Léna archive document within this
    // patient's verified folder. Never trust browser-local opaque Drive IDs.
    const documentId=String(payload?.documentId||"");
    if(!/^[A-Za-z0-9-]{6,140}$/.test(documentId))
     return reply({error:"drive_document_invalid_id"},400);
    const files=await originalInventory(token,profile,folder);
    const matches=files.filter(f=>f.appProperties?.profile===profile&&
     f.appProperties?.documentId===documentId);
    if(matches.length!==1)throw Error("drive_document_locator_ambiguous");
    return await originalPdf(token,profile,folder,matches[0].id,documentId);
   }
   return await originalPdf(token,profile,folder,String(payload?.fileId||""));
  }catch(e){
   // No PDF bytes, Drive IDs, Google tokens or clinical metadata in errors.
   const code=String(e?.message||"drive_gateway_unavailable");
   const safe=new Set(["drive_archive_root_ambiguous","drive_profile_folder_ambiguous",
    "drive_inventory_too_large","drive_inventory_profile_mismatch",
    "drive_pdf_invalid_id","drive_pdf_profile_mismatch","drive_pdf_size_not_allowed",
    "drive_pdf_oversize","drive_pdf_size_mismatch","drive_pdf_invalid_signature",
    "drive_document_invalid_id","drive_document_locator_ambiguous"]);
   return reply({error:safe.has(code)?code:"drive_gateway_unavailable"},503);
  }
 }
 if(op==="disconnect"){
  const result=await admin().from("hh_google_drive_oauth_connections")
   .delete().eq("owner_user_id",owner);
  return result.error?reply({error:"disconnect_failed"},503):reply({connected:false});
 }
 return reply({error:"unknown_action"},400);
}
Deno.serve(async req=>{try{return await route(req)}
 catch(_){return reply({error:"oauth_internal_failure"},500)}});
