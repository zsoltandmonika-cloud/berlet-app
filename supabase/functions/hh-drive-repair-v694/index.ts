// HealthHub v694: opt-in, narrowly scoped original PDF archiving.
 // Separate endpoint; never modifies the established read-only v682 gateway.
import {createClient} from "npm:@supabase/supabase-js@2";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const ENV=(k:string)=>Deno.env.get(k)?.trim()||"";
const MAX=8*1024*1024;
const cors={"Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin",
 "Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const db=()=>createClient(ENV("SUPABASE_URL"),ENV("SUPABASE_SERVICE_ROLE_KEY"),{
 auth:{autoRefreshToken:false,persistSession:false}});
const from64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hex=async(data:Uint8Array)=>{
 const digest=await crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
};
const fileId=(s:unknown)=>typeof s==="string"&&/^[A-Za-z0-9_-]{8,200}$/.test(s);
const docId=(s:unknown)=>typeof s==="string"&&/^[A-Za-z0-9-]{6,140}$/.test(s);
const expectedSha=(s:unknown)=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
function ready(){
 try{return !!(ENV("SUPABASE_URL")&&ENV("SUPABASE_ANON_KEY")&&
 ENV("SUPABASE_SERVICE_ROLE_KEY")&&ENV("HH_GOOGLE_DRIVE_CLIENT_ID")&&
 ENV("HH_GOOGLE_DRIVE_CLIENT_SECRET")&&ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL")&&
 from64(ENV("HH_GOOGLE_DRIVE_ENCRYPTION_KEY")).length===32)}
 catch(_){return false}
}
async function ownerWithProfile(req:Request,profile:string){
 if(!["zsolt","monika"].includes(profile))return null;
 const h=req.headers.get("authorization")||"";
 if(!/^Bearer .{20,}$/.test(h))return null;
 const client=createClient(ENV("SUPABASE_URL"),ENV("SUPABASE_ANON_KEY"),{
  auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await client.auth.getUser(h.slice(7));
 if(error||!data?.user)return null;
 const access=await db().from("hh_profile_access").select("profile_key")
 .eq("user_id",data.user.id).eq("profile_key",profile).limit(1);
 return !access.error&&access.data?.length?data.user.id:null;
}
async function decryptedRefresh(owner:string,row:{refresh_nonce:string,refresh_ciphertext:string}){
 const key=await crypto.subtle.importKey("raw",from64(ENV("HH_GOOGLE_DRIVE_ENCRYPTION_KEY")),
 "AES-GCM",false,["decrypt"]);
 const data=await crypto.subtle.decrypt({name:"AES-GCM",iv:from64(row.refresh_nonce),
 additionalData:new TextEncoder().encode(owner)},key,from64(row.refresh_ciphertext));
 return new TextDecoder().decode(data);
}
async function accessToken(owner:string){
 const result=await db().from("hh_google_drive_oauth_connections")
  .select("refresh_nonce,refresh_ciphertext,google_account_email")
  .eq("owner_user_id",owner).maybeSingle();
 if(result.error||!result.data)return null;
 const row=result.data;
 if(row.google_account_email!==ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase())return null;
 const refresh=await decryptedRefresh(owner,row);
 const response=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({client_id:ENV("HH_GOOGLE_DRIVE_CLIENT_ID"),
   client_secret:ENV("HH_GOOGLE_DRIVE_CLIENT_SECRET"),
   refresh_token:refresh,grant_type:"refresh_token"}),
  signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("drive_refresh_failed");
 const json=await response.json();
 if(!json.access_token)throw Error("drive_refresh_failed");
 const account=await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",{
 headers:{Authorization:"Bearer "+json.access_token},signal:AbortSignal.timeout(15000)});
 if(!account.ok)throw Error("drive_account_unavailable");
 const identity=await account.json();
 if(String(identity?.user?.emailAddress||"").toLowerCase()!==
  ENV("HH_GOOGLE_DRIVE_EXPECTED_EMAIL").toLowerCase())throw Error("drive_account_mismatch");
 return json.access_token as string;
}
async function googleList(token:string,q:string,fields:string,pageToken=""){
 const u=new URL("https://www.googleapis.com/drive/v3/files");
 for(const [k,v] of Object.entries({q,fields,spaces:"drive",pageSize:"1000"}))
  u.searchParams.set(k,v);
 if(pageToken)u.searchParams.set("pageToken",pageToken);
 const res=await fetch(u,{headers:{Authorization:"Bearer "+token},
 signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("drive_list_failed");
 const data=await res.json();
 if(!Array.isArray(data?.files))throw Error("drive_list_invalid");
 return data;
}
async function folderFor(token:string,profile:string){
 const roots=await googleList(token,"name = 'HealthHub Lena Archive' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
 "nextPageToken,files(id,name,mimeType)");
 if(roots.files.length!==1||roots.nextPageToken||!fileId(roots.files[0].id))
  throw Error("drive_root_ambiguous");
 const root=roots.files[0].id;
 const name=profile==="monika"?"Monika":"Zsolt";
 const q="name = '"+name+"' and '"+root+"' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
 const sub=await googleList(token,q,"nextPageToken,files(id,name,mimeType,parents)");
 if(sub.files.length!==1||sub.nextPageToken||!fileId(sub.files[0].id)||
  !sub.files[0].parents?.includes(root))throw Error("drive_profile_folder_ambiguous");
 return sub.files[0].id as string;
}
async function existingHashes(token:string,folder:string,profile:string,sha:string){
 const q="'"+folder+"' in parents and mimeType = 'application/pdf' and trashed = false";
 const rows=[];let cursor="";
 do{
  const page=await googleList(token,q,
   "nextPageToken,files(id,mimeType,appProperties,parents)",cursor);
  rows.push(...page.files);
  if(rows.length>2000)throw Error("drive_inventory_too_large");
  cursor=page.nextPageToken||"";
 }while(cursor);
 for(const file of rows){
  if(!fileId(file.id)||!file.parents?.includes(folder)||file.mimeType!=="application/pdf"||
    (file.appProperties?.profile&&file.appProperties.profile!==profile))
   throw Error("drive_inventory_profile_mismatch");
 }
 return rows.filter(f=>f.appProperties?.profile===profile&&
  String(f.appProperties?.sha256||"").toLowerCase()===sha).map(f=>f.id as string);
}
async function repairUpload(owner:string,body:any){
 const profile=String(body?.profile||""),id=body?.documentId,sha=body?.sha256;
 if(!["monika","zsolt"].includes(profile)||!docId(id)||!expectedSha(sha))
  return reply({error:"invalid_original_metadata"},400);
 const original=String(body?.originalName||"");
 // Folders and archive metadata are private but filenames must not be path traversal.
 if(original.length<5||original.length>180||
    !/\.pdf$/i.test(original)||/[\/\\\x00-\x1f]/.test(original))
  return reply({error:"invalid_original_filename"},400);
 const base64=String(body?.base64||"");
 if(base64.length>Math.ceil(MAX/3)*4+8||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))return reply({error:"pdf_size_not_allowed"},413);
 let bytes:Uint8Array;
 try{bytes=from64(base64)}catch(_){return reply({error:"invalid_pdf_encoding"},400)}
 if(bytes.length<5||bytes.length>MAX||bytes[0]!==37||bytes[1]!==80||
    bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)
  return reply({error:"invalid_original_pdf"},400);
 if(await hex(bytes)!==sha)return reply({error:"original_sha_mismatch"},409);
 const token=await accessToken(owner);
 if(!token)return reply({error:"drive_authorization_missing"},401);
 const folder=await folderFor(token,profile);
 const existing=await existingHashes(token,folder,profile,sha);
 if(existing.length)return reply({ok:true,result:"already_archived",count:existing.length});
 const props={healthhub:"lena-document",profile,documentId:id,sha256:sha,
 sourceType:"original",archivedBy:"explicit-v694-repair"};
 const metadata={name:original,mimeType:"application/pdf",parents:[folder],
  appProperties:props};
 const boundary="hh_v694_"+crypto.randomUUID().replace(/-/g,"");
 const blob=new Blob(["--"+boundary+"\r\n",
  "Content-Type: application/json; charset=UTF-8\r\n\r\n",
  JSON.stringify(metadata),"\r\n--"+boundary+"\r\n",
  "Content-Type: application/pdf\r\n\r\n",
  bytes,"\r\n--"+boundary+"--"],{type:"multipart/related; boundary="+boundary});
 const uploaded=await fetch(
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,parents,appProperties",
  {method:"POST",headers:{Authorization:"Bearer "+token,
    "Content-Type":"multipart/related; boundary="+boundary},
   body:blob,signal:AbortSignal.timeout(45000)});
 if(!uploaded.ok)throw Error("original_archive_upload_failed");
 const file=await uploaded.json();
 if(!fileId(file.id)||file.mimeType!=="application/pdf"||
   !file.parents?.includes(folder)||file.appProperties?.profile!==profile||
   file.appProperties?.documentId!==id||
   String(file.appProperties?.sha256||"").toLowerCase()!==sha)
  throw Error("archive_upload_verify_failed");
 return reply({ok:true,result:"archived",fileId:file.id});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST"||req.headers.get("origin")!==ORIGIN)
  return reply({error:"forbidden_origin_or_method"},403);
 if(!ready())return reply({error:"setup_required"},503);
 if(Number(req.headers.get("content-length")||"0")>MAX*2)
  return reply({error:"pdf_size_not_allowed"},413);
 try{
  const raw=await req.text();
  if(raw.length>MAX*2)return reply({error:"pdf_size_not_allowed"},413);
  const payload=JSON.parse(raw);
  if(payload?.action!=="repair_upload_original_v694")return reply({error:"unknown_action"},400);
  const profile=String(payload?.profile||"");
  const owner=await ownerWithProfile(req,profile);
  if(!owner)return reply({error:"archive_profile_forbidden"},403);
  return await repairUpload(owner,payload);
 }catch(e){
  const name=String((e as Error)?.message||"repair_failed");
  const allowed=new Set(["drive_root_ambiguous","drive_profile_folder_ambiguous",
   "drive_inventory_too_large","drive_inventory_profile_mismatch"]);
  return reply({error:allowed.has(name)?name:"repair_unavailable"},503);
 }
});