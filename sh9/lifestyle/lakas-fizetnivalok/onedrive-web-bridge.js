/* SHO Lakásfizetnivalók · isolated OneDrive web pilot
 * Existing native app client ID, existing OneDrive Appok/Lakás Fizetnivalók folder, OAuth 2.0 PKCE.
 * A Microsoft Entra SPA redirect registration is required for the hosting URL.
 * Does not write until an existing, valid OneDrive JSON was downloaded.
 * All tokens are memory-only; no credentials saved to localStorage.
 */
((w)=>{
'use strict';
const APP_ID='506955c0-a62c-4391-8807-1e7ab2e237fd';
const AUTH='https://login.microsoftonline.com/common/oauth2/v2.0';
const API='https://graph.microsoft.com/v1.0';
// Standard OneDrive folder outside /special/approot needs delegated Files.ReadWrite.
// Never infer that AppFolder grants access to arbitrary personal OneDrive folders.
// User.Read supports an authoritative /me identity check BEFORE any OneDrive access.
const SCOPE='Files.ReadWrite User.Read openid profile offline_access';
const EXPECTED_ACCOUNT='zsolt.monika@outlook.com';
const ROOT_FOLDER='/me/drive/root:/Appok/Lak%C3%A1s%20Fizetnival%C3%B3k';
const DATA_FILE=ROOT_FOLDER+'/lakas_fizetnivalok.json';
const PHOTO_FOLDER=ROOT_FOLDER+'/meter_photos';
const STATE_KEY='sho_lakas_pkce_single_v1';
const LOCAL_DATA='lakas_fizetnivalok_v1_1';
let credentials=null,baseline=null,writeEnabled=false,accountVerified=false,serial=Promise.resolve(),pending=null,timer=null;
const report=message=>{if(typeof w.onOneDriveStatus==='function')w.onOneDriveStatus(message); else console.info(message)};
const description=e=>e?.message || String(e);
const uri=()=>w.location.origin+w.location.pathname;
function showAccount(email){
 const badge=w.document?.getElementById('oneDriveAccountBadge');
 if(!badge)return;
 badge.textContent=email?'🔐 Ellenőrzött OneDrive-fiók: '+email:'🔒 OneDrive-fiók: nincs ellenőrzött bejelentkezés';
 badge.style.color=email?'#b6f8d1':'#d4b681';
}
function b64(bytes){let s='';for(let b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function rand(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return b64(a);}
async function pkceHash(verifier){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));}
async function exchange(data){
 const res=await fetch(AUTH+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)});
 const json=await res.json();if(!res.ok||!json.access_token)throw Error((json.error_description||json.error||'Microsoft belépési hiba')+'; ellenőrizd a regisztrált SPA redirect URI-t.');
 credentials={access:json.access_token,refresh:json.refresh_token||credentials?.refresh,until:Date.now()+1000*Math.max(60,Number(json.expires_in||3600))};
}
async function signIn(){
 if(!(w.isSecureContext&&(w.location.protocol==='https:'||(w.location.protocol==='http:'&&['localhost','127.0.0.1'].includes(w.location.hostname)))))throw Error('A Microsoft webes belépéshez HTTPS-es SHO URL szükséges.');
 const state=rand(24),verifier=rand(48),challenge=await pkceHash(verifier);
 sessionStorage.setItem(STATE_KEY,JSON.stringify({state,verifier,at:Date.now(),redirect:uri()}));
 const url=new URL(AUTH+'/authorize');
 Object.entries({client_id:APP_ID,response_type:'code',redirect_uri:uri(),response_mode:'query',scope:SCOPE,code_challenge:challenge,code_challenge_method:'S256',state,prompt:'select_account',login_hint:EXPECTED_ACCOUNT}).forEach(([k,v])=>url.searchParams.set(k,v));
 w.location.assign(url.toString());
}
async function consumeRedirect(){
 const u=new URL(w.location.href),code=u.searchParams.get('code'),error=u.searchParams.get('error');if(!code&&!error)return;
 const state=u.searchParams.get('state');for(const k of ['code','state','session_state','error','error_description'])u.searchParams.delete(k);
 w.history.replaceState(null,'',u.pathname+u.search+u.hash);
 const data=sessionStorage.getItem(STATE_KEY);sessionStorage.removeItem(STATE_KEY);
 if(error){report('Microsoft belépés megszakítva: '+error);return;}
 if(!data)throw Error('Hiányzik a bejelentkezés biztonsági állapota.');
 const saved=JSON.parse(data);if(!state||state!==saved.state||saved.redirect!==uri()||Date.now()-saved.at>600000)throw Error('Érvénytelen OAuth állapot.');
 await exchange({client_id:APP_ID,grant_type:'authorization_code',code,code_verifier:saved.verifier,redirect_uri:uri(),scope:SCOPE});
 try{await verifyAccount();}
 catch(e){signOut(false);throw e;}
 report('✅ Ellenőrzött Microsoft-fiók: '+EXPECTED_ACCOUNT+'. A OneDrive-ot csak a Letöltés gombbal olvassuk be.');
}
async function token(){
 if(credentials && Date.now()+60000<credentials.until)return credentials.access;
 if(!credentials?.refresh)throw Error('OneDrive bejelentkezés szükséges.');
 await exchange({client_id:APP_ID,grant_type:'refresh_token',refresh_token:credentials.refresh,scope:SCOPE});
 return credentials.access;
}
async function graph(path,opts={}){
 if(!accountVerified && !path.startsWith('/me?'))requireAccount();
 const res=await fetch(API+path,{...opts,cache:'no-store',headers:{Authorization:'Bearer '+await token(),...(opts.headers||{})}});
 if(!res.ok)throw Error('Microsoft Graph HTTP '+res.status+(res.status===412?' (másik eszköz módosította a fájlt)':''));
 return res.json();
}
async function verifyAccount(){
 // The login_hint merely pre-fills the picker; this Graph check enforces the real identity.
 // Never infer account identity from cached browser sessions or the selected login label.
 const user=await graph('/me?$select=id,mail,userPrincipalName');
 const emails=[user.mail,user.userPrincipalName].filter(v=>typeof v==='string').map(v=>v.trim().toLowerCase());
 if(!emails.includes(EXPECTED_ACCOUNT)){
  const actual=emails.join(' / ')||'nem azonosítható';
  throw Error('Nem a Lakásfizetnivalókhoz tartozó Microsoft-fiók jelentkezett be ('+actual+'). Válaszd ezt: '+EXPECTED_ACCOUNT+'. OneDrive-művelet letiltva.');
 }
 accountVerified=true;
 showAccount(EXPECTED_ACCOUNT);
}
function requireAccount(){if(!accountVerified)throw Error('OneDrive hozzáférés tiltva: előbb igazold a '+EXPECTED_ACCOUNT+' fiókot.');}
async function meta(){
 requireAccount();
 // Keep full driveItem metadata; select filters sometimes omit transient downloadUrl.
 return graph(DATA_FILE);
}
function valid(x){
 if(!x||!Array.isArray(x.months)||!Array.isArray(x.expenses)||x.months.length>120||x.expenses.length>20000||x.months.some(y=>typeof y.key!=='string'))throw Error('A OneDrive adatfájl szerkezete nem megfelelő, nem módosítunk adatot.');return x;
}
async function bodyOf(fileMeta){
 // The downloadUrl is a transient Microsoft Graph instance annotation.
 // The first metadata call may omit it even though the file exists.
 let link=fileMeta?.['@microsoft.graph.downloadUrl'];
 if(!link && fileMeta?.id){
  const id=encodeURIComponent(fileMeta.id);
  const again=await graph('/me/drive/items/'+id+'?$select=id,%40microsoft.graph.downloadUrl');
  link=again['@microsoft.graph.downloadUrl'];
  if(!link){
   const full=await graph('/me/drive/items/'+id);
   link=full['@microsoft.graph.downloadUrl'];
  }
 }
 if(!link || !/^https:\/\//i.test(link))throw Error('A Microsoft Graph nem adott letöltési URL-t. Az eredeti OneDrive-adatokhoz nem nyúltunk.');
 // A preauthenticated download URL needs NO Authorization header.
 // Never use /content in a browser: its 302 redirect fails with CORS preflight.
 const res=await fetch(link,{credentials:'omit',cache:'no-store'});
 if(!res.ok)throw Error('OneDrive letöltés: HTTP '+res.status);
 return res;
}
async function downloadData(){
 report('OneDrive eredeti adatok ellenőrzése, csak olvasás…');
 const remote=await meta(),data=valid(await (await bodyOf(remote)).json());
 if(!w.confirm('Betöltjük az eredeti OneDrive-adatokat? Először biztonsági másolatot készítünk a böngésző helyi adatairól.')){report('Letöltés megszakítva.');return;}
 const local=localStorage.getItem(LOCAL_DATA);
 if(local){try{localStorage.setItem('lakas_web_before_cloud_'+new Date().toISOString().replace(/[:.]/g,'-'),local)}catch(e){throw Error('Helyi biztonsági mentés nem készült el, ezért nem importálunk.');}}
 if(typeof w.applyOneDriveData!=='function')throw Error('Az alkalmazás adatbetöltője hiányzik.');
 w.applyOneDriveData(data);
 baseline={id:remote.id,etag:remote.eTag};writeEnabled=false;
 report('✅ Eredeti Appok/Lakás Fizetnivalók adatok letöltve. A felhőben nem történt módosítás.');
 void restorePhotos(data.months);
}
async function restorePhotos(months){
 let count=0;
 for(const m of months){
  if(!m.meterPhotoFile||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(m.key))continue;
  try{
   const item=await graph(PHOTO_FOLDER+'/'+m.key+'_meter.jpg');
   const blob=await (await bodyOf(item)).blob();if(blob.size>8000000)continue;
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
   if(w.applyOneDriveMeterPhoto)w.applyOneDriveMeterPhoto(m.key,data);count++;
  }catch(e){/* missing individual photo must never stop financial data import */}
 }
 if(count)report(count+' mérőóra-fotó visszatöltve.');
}
async function currentBaseline(){
 if(!baseline?.id||!baseline.etag)throw Error('Először töltsd le az éles OneDrive-adatokat!');
 const live=await meta();if(live.id!==baseline.id||live.eTag!==baseline.etag){writeEnabled=false;throw Error('Ütközés: a OneDrive-fájl közben megváltozott. Feltöltés letiltva, a helyi adatok megmaradnak.');}return live;
}
async function uploadSession(path,bytes,etag){
 // OneDrive's upload session supports optimistic concurrency with If-Match.
 const session=await graph(path,{method:'POST',headers:{'Content-Type':'application/json',...(etag?{'If-Match':etag}:{'If-None-Match':'*'})},body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':etag?'replace':'fail'}})});
 if(!session.uploadUrl||!session.uploadUrl.startsWith('https://'))throw Error('OneDrive feltöltési munkamenet nem elérhető.');
 const res=await fetch(session.uploadUrl,{method:'PUT',headers:{'Content-Range':`bytes 0-${bytes.byteLength-1}/${bytes.byteLength}`,'Content-Length':String(bytes.byteLength)},body:bytes});
 if(!res.ok||res.status===202)throw Error('OneDrive feltöltés sikertelen: HTTP '+res.status);
 return res.json();
}
async function writeJson(json,manual){
 const next=valid(JSON.parse(json)),live=await currentBaseline();
 if(manual&&!writeEnabled && !w.confirm('A betöltött OneDrive-adatokat felülírjuk a mostani helyi adatokkal. Biztosan folytatod?')){report('Feltöltés megszakítva.');return false;}
 const bytes=new TextEncoder().encode(JSON.stringify(next));
 const uploaded=await uploadSession('/me/drive/items/'+encodeURIComponent(live.id)+'/createUploadSession',bytes,live.eTag);
 const after=uploaded.eTag ? uploaded : await meta();
 baseline={id:after.id||live.id,etag:after.eTag};
 writeEnabled=true;report('✅ OneDrive mentés kész.');return true;
}
function queued(data,manual){
 serial=serial.catch(()=>{}).then(()=>writeJson(data,manual));
 return serial.catch(e=>{report('⛔ OneDrive mentés leállítva: '+description(e));return false;});
}
function autoUploadData(data){
 if(!writeEnabled){report('Helyi mentés kész. Felhőbe csak az első ellenőrzött feltöltés után írunk.');return;}
 pending=data;clearTimeout(timer);timer=setTimeout(()=>{const now=pending;pending=null;if(now)void queued(now,false)},1400);
}
async function photoFolder(){
 try{return await graph(PHOTO_FOLDER)}catch(e){
  if(!description(e).includes('404'))throw e;
  return graph(ROOT_FOLDER+':/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'meter_photos',folder:{},'@microsoft.graph.conflictBehavior':'fail'})});
 }
}
async function uploadPhotoData(month,picture){
 try{
  if(!writeEnabled)throw Error('Az első ellenőrzött JSON-mentés még hiányzik.');
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!/^data:image\/jpeg;base64,/.test(picture))throw Error('Érvénytelen fotó / hónap.');
  await currentBaseline();const folder=await photoFolder(),name=month+'_meter.jpg';
  let previous=null;try{previous=await graph('/me/drive/items/'+encodeURIComponent(folder.id)+':/'+name)}catch(e){if(!description(e).includes('404'))throw e;}
  const bytes=new Uint8Array(await (await fetch(picture)).arrayBuffer());if(bytes.byteLength>8000000)throw Error('Fotó túl nagy.');
  const path=previous?'/me/drive/items/'+encodeURIComponent(previous.id)+'/createUploadSession':'/me/drive/items/'+encodeURIComponent(folder.id)+':/'+name+':/createUploadSession';
  await uploadSession(path,bytes,previous?.eTag);report('✅ Mérőóra-fotó feltöltve: '+name);
 }catch(e){report('Fotómentés elmaradt: '+description(e));}
}
function signOut(notify=true){clearTimeout(timer);pending=null;credentials=null;baseline=null;writeEnabled=false;accountVerified=false;showAccount(null);if(notify)report('Microsoft-kapcsolat bontva, helyi adatok maradtak.');}
w.OneDriveBridge={signIn:()=>signIn().catch(e=>report(description(e))),signOut,downloadData:()=>downloadData().catch(e=>report('Letöltés elmaradt: '+description(e))),uploadData:data=>queued(data,true),autoUploadData,uploadPhotoData,autoUploadPhotoData:(month,picture)=>{if(writeEnabled)void uploadPhotoData(month,picture)}};
w.SHO_LAKAS_WEB_PILOT={get hasCloudBaseline(){return !!baseline},get cloudWriteEnabled(){return writeEnabled},get accountVerified(){return accountVerified},get redirectUri(){return uri()},clientId:APP_ID};
w.addEventListener('DOMContentLoaded',()=>{void consumeRedirect().catch(e=>report('Bejelentkezési hiba: '+description(e)))});
})(window);
