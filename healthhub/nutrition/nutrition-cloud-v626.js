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
root.HH_NUTRITION_CLOUD_V626={connected,download,upload,path:filePath,version:'626'};
})(window);
