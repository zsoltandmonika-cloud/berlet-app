/* HealthHub Nutrition Cloud v626: profile-scoped Dropbox App Folder sync.
 * Existing HealthHub Dropbox OAuth token is reused, never sent to GitHub or logged.
 * Conditional Dropbox revisions prevent blind overwrites when two devices sync.
 */
(function(root){
'use strict';
const TOKEN_KEY='hh-dropbox-token-v2', APP_KEY='t68rmhh5f1l8d85';
const SCHEMA='healthhub.nutrition/1', API='https://api.dropboxapi.com/2/', CONTENT='https://content.dropboxapi.com/2/';
const valid=p=>p==='zsolt'||p==='monika';
const filePath=p=>'/HealthHub/profiles/'+p+'-nutrition.json';
function parseToken(){try{return JSON.parse(localStorage.getItem(TOKEN_KEY)||'null')}catch(_){return null}}
function connected(){const t=parseToken();return !!(t&&t.refresh_token)}
async function token(){
 const t=parseToken();
 if(!t||!t.refresh_token)throw new Error('Dropbox nincs csatlakoztatva ebben a böngészőben');
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
 const r=await fetch('https://api.dropboxapi.com/oauth2/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY})
 });
 if(!r.ok)throw new Error('Dropbox hitelesítés frissítése szükséges');
 const json=await r.json();
 if(!json.access_token)throw new Error('Hiányzó Dropbox hozzáférés');
 t.access_token=json.access_token;t.expires_at=Date.now()+((Number(json.expires_in)||14400)-60)*1000;
 localStorage.setItem(TOKEN_KEY,JSON.stringify(t));
 return t.access_token;
}
async function request(endpoint,arg,expectedContent){
 const access=await token();
 const isDownload=endpoint==='files/download',isUpload=endpoint==='files/upload';
 const headers={Authorization:'Bearer '+access};
 if(isDownload||isUpload){
  headers['Dropbox-API-Arg']=JSON.stringify(arg);
  if(isUpload)headers['Content-Type']='application/octet-stream';
 }else headers['Content-Type']='application/json';
 const url=(isDownload||isUpload?CONTENT:API)+endpoint;
 const options={method:'POST',headers:headers};
 if(!isDownload)options.body=isUpload?expectedContent:JSON.stringify(arg);
 const res=await fetch(url,options);
 if(!res.ok){
  let message='Dropbox '+endpoint+' HTTP '+res.status;
  try{const j=await res.json();message=j.error_summary||message}catch(_){}
  const e=new Error(message);e.status=res.status;throw e;
 }
 return res;
}
function missing(error){return error&&error.status===409&&String(error.message||'').includes('path/not_found')}
async function download(profile){
 if(!valid(profile))throw new Error('Érvénytelen Nutrition-profil');
 const path=filePath(profile);
 let meta;
 try{meta=await(await request('files/get_metadata',{path:path,include_deleted:false})).json()}
 catch(e){if(missing(e))return {data:null,rev:null};throw e}
 const response=await request('files/download',{path:path});
 const data=await response.json();
 if(!data||data.schemaVersion!==SCHEMA||data.profileKey!==profile)
  throw new Error('A Dropbox Nutrition-fájl profilja vagy verziója eltér; felülírás leállítva');
 let rev=meta.rev;
 try{
  const header=response.headers.get('Dropbox-API-Result');
  if(header)rev=JSON.parse(header).rev||rev;
 }catch(_){}
 if(!rev)throw new Error('Dropbox fájlverzió nem ellenőrizhető');
 return {data:data,rev:rev};
}
async function upload(profile,data,rev){
 if(!valid(profile)||!data||data.profileKey!==profile||data.schemaVersion!==SCHEMA)
  throw new Error('Nutrition mentés elutasítva: profil / séma nem egyezik');
 const arg={path:filePath(profile),mode:rev?{'.tag':'update',update:rev}:'add',
  autorename:false,mute:true,strict_conflict:true};
 const response=await request('files/upload',arg,JSON.stringify(data));
 return await response.json();
}

/* Image vault v641: immutable private JPEG assets, referenced by sha256.
 * The API uses the existing Dropbox token; no new OAuth scope or public URLs.
 */
const imageFolder=profile=>'/HealthHub/profiles/'+profile+'-nutrition-images';
const hex64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function checkImageRef(profile,ref){
 if(!valid(profile)||!ref||!hex64(ref.sha256)||ref.path!==imageFolder(profile)+'/'+ref.sha256+'.jpg')throw new Error('Érvénytelen vagy idegen profilhoz tartozó képhivatkozás');
 return ref.path;
}
async function ensureImageFolder(profile){
 const path=imageFolder(profile);
 try{await request('files/create_folder_v2',{path,autorename:false})}
 catch(e){
  if(e.status!==409)throw e;
  const meta=await(await request('files/get_metadata',{path,include_deleted:false})).json();
  if(meta['.tag']!=='folder')throw new Error('A Nutrition képtár útvonala nem mappa');
 }
}
async function putImage(profile,bytes,sha256){
 if(!valid(profile)||!hex64(sha256)||!(bytes instanceof Uint8Array)||bytes.length<64||bytes.length>700000)
  throw new Error('Érvénytelen Nutrition JPEG-kép');
 const path=imageFolder(profile)+'/'+sha256+'.jpg';
 await ensureImageFolder(profile);
 try{
  await request('files/upload',{path,mode:'add',autorename:false,mute:true,strict_conflict:true},bytes);
 }catch(e){
  if(e.status!==409)throw e;
  const meta=await(await request('files/get_metadata',{path,include_deleted:false})).json();
  if(meta['.tag']!=='file'||Number(meta.size)!==bytes.length)throw e;
 }
 return {v:1,path,sha256,mime:'image/jpeg'};
}
async function getImage(profile,ref){
 const path=checkImageRef(profile,ref);
 const response=await request('files/download',{path});
 const blob=await response.blob();
 if(blob.size<=0||blob.size>4000000)throw new Error('A Nutrition-kép túl nagy vagy üres');
 return blob;
}

root.HH_NUTRITION_CLOUD_V626={connected,download,upload,putImage,getImage,checkImageRef,path:filePath,version:'641'};
})(window);
