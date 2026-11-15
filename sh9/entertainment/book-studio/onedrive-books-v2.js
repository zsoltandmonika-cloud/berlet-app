/* SHO Book Studio OneDrive V2.
 * Live delegated Files.Read only, SPA PKCE. No uploads/deletes against OneDrive.
 * Books remain in Microsoft OneDrive; only per-profile reading state in Supabase.
 * ChatGPT's connector access is NOT reused by this public static page.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),CFG='sh9-book-ms-config-v2',TOKEN='sh9-book-ms-access-v2',FLOW='sh9-book-ms-pkce-v2';
const GRAPH='https://graph.microsoft.com/v1.0/',AUTH='https://login.microsoftonline.com/consumers/oauth2/v2.0/';
const SCOPES='openid profile offline_access User.Read Files.Read';
const TRUST='sh9-book-ms-trusted-v3',SILENT_RETRY='sh9-book-ms-silent-attempt-v3';
const PERSIST=w.SH9_BOOK_ONEDRIVE_PERSIST_V3;
const SILENT_GAP_MS=4*60*60*1000,REFRESH_MAX_MS=23*60*60*1000;
const PROGRESS='hh_book_studio_drive_progress_v2';
const ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS=900,MAX_FOLDERS=65,MAX_DEPTH=5,MAX_DOWNLOAD=80*1024*1024;
let config=null,token='',expires=0,found=[],entries=[],folderId='',driveId='',ready=false,scanning=false,progressCloud=false;
let refreshToken='',refreshIssuedAt=0,renewing=null;
const CACHE=w.SH9_BOOK_CACHE_V3;
const coverUrls=new Map(),pendingDownloads=new Map();
let coverLoading=false,coverJob=0;
const element=(tag,cls,txt)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
const text=s=>String(s||'').trim().slice(0,200);
const pid=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const status=(s,problem)=>{$('odStatus').textContent=s;$('odStatus').dataset.error=problem?'1':'0'};
const origin=()=>new URL('./',w.location.href).href;
const store=(storage,key,val)=>{try{storage.setItem(key,val);return true}catch(_){return false}};
const load=(storage,key)=>{try{return storage.getItem(key)}catch(_){return null}};
const parse=s=>{try{return JSON.parse(s)}catch(_){return null}};
const clearQuery=()=>{
 const url=new URL(w.location.href);
 ['code','state','session_state','error','error_description'].forEach(k=>url.searchParams.delete(k));
 w.history.replaceState(w.history.state,'',url.pathname+url.search+url.hash);
};
function resetSession(){token='';expires=0;try{w.sessionStorage.removeItem(TOKEN)}catch(_){}ready=false;setConnected(false)}
function trusted(){
 const previous=parse(load(w.localStorage,TRUST));
 return !!(config&&previous?.clientId===config.clientId&&previous?.account===config.account);
}
function markTrusted(){if(config)store(w.localStorage,TRUST,JSON.stringify({clientId:config.clientId,account:config.account}))}
async function clearCredentials(){
 resetSession();dropCoverUrls();pendingDownloads.clear();++coverJob;refreshToken='';refreshIssuedAt=0;
 try{w.localStorage.removeItem(TRUST);w.localStorage.removeItem(SILENT_RETRY)}catch(_){}
 if(PERSIST)await PERSIST.clear(w);
}
async function rememberRefresh(){
 if(!PERSIST||!config||!refreshToken)return false;
 return await PERSIST.save(w,config.clientId,config.account,refreshToken,refreshIssuedAt);
}
async function reloadRefresh(){
 if(!PERSIST||!config)return false;
 const record=await PERSIST.load(w,config.clientId,config.account);
 if(!record)return false;
 refreshToken=record.refreshToken;refreshIssuedAt=record.issuedAt;return true;
}
function storeTokenResponse(reply,originalIssuedAt){
 if(!reply?.access_token)throw Error('A Microsoft nem adott hozzáférési tokent.');
 token=reply.access_token;expires=Date.now()+Math.max(60,Number(reply.expires_in)||3600)*1000;
 store(w.sessionStorage,TOKEN,JSON.stringify({accessToken:token,expires,clientId:config.clientId,account:config.account}));
 if(reply.refresh_token){
  refreshToken=reply.refresh_token;
  // A forgatott SPA refresh token nem indít új 24 órás időablakot.
  refreshIssuedAt=originalIssuedAt||Date.now();
 }
}
async function verifyAccount(){
 if(!token||expires<Date.now()+20000)throw Error('Microsoft munkamenet nem érhető el.');
 const response=await w.fetch(GRAPH+'me?$select=mail,userPrincipalName,otherMails',{
  method:'GET',cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+token}
 });
 if(!response.ok)throw Error('Microsoft profil-ellenőrzés HTTP '+response.status);
 verifyEmail(await response.json());
}
async function renewAccess(){
 if(renewing)return renewing;
 renewing=(async()=>{
  if(!refreshToken)await reloadRefresh();
  if(!refreshToken||!refreshIssuedAt||Date.now()-refreshIssuedAt>=REFRESH_MAX_MS)return false;
  try{
   const response=await w.fetch(AUTH+'token',{method:'POST',cache:'no-store',credentials:'omit',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:config.clientId,grant_type:'refresh_token',
      refresh_token:refreshToken,scope:SCOPES})
   });
   if(!response.ok)throw Error('Microsoft tokenfrissítés HTTP '+response.status);
   storeTokenResponse(await response.json(),refreshIssuedAt);
   await verifyAccount();
   await rememberRefresh();
   ready=true;setConnected(true);markTrusted();return true;
  }catch(e){
   resetSession();
   if(/HTTP 400|HTTP 401|Másik Microsoft-fiók/.test(e.message||'')){
    refreshToken='';refreshIssuedAt=0;if(PERSIST)await PERSIST.clear(w);
   }
   return false;
  }
 })().finally(()=>{renewing=null});
 return renewing;
}
async function ensureAccess(){
 if(token&&expires>Date.now()+40000)return true;
 return await renewAccess();
}
async function silentReconnect(){
 if(!trusted()||new URLSearchParams(w.location.search).get('sh9native')==='1')return false;
 const last=Number(load(w.localStorage,SILENT_RETRY)||0);
 if(last&&Date.now()-last<SILENT_GAP_MS)return false;
 store(w.localStorage,SILENT_RETRY,String(Date.now()));
 await beginAuth(true);return true;
}
function displayConfig(){
 const cached=parse(load(w.localStorage,CFG));
 const cal=parse(load(w.localStorage,'sh9-ms-calendar-config-v1'));
 config=cached&&ID_RE.test(cached.clientId)&&cached.account?cached:null;
 if(!config&&cal&&ID_RE.test(cal.clientId)&&cal.account)config={clientId:cal.clientId,account:cal.account};
 $('odClientId').value=config?.clientId||'';
 $('odAccount').value=config?.account||'';
 $('odConfig').hidden=!!config;
}
function setConnected(on){
 $('odConnect').hidden=on;
 $('odRefresh').hidden=!on;
 $('odDisconnect').hidden=!on;
 $('odConfigToggle').hidden=!config;
}
async function json(url,options={}){
 const u=new URL(url,GRAPH);
 if(u.protocol!=='https:'||u.hostname!=='graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))throw Error('Érvénytelen Microsoft Graph URL.');
 if(!await ensureAccess()){resetSession();throw Error('Lejárt a OneDrive-munkamenet. Microsoft-belépés szükséges.');}
 const send=()=>w.fetch(u.href,{method:'GET',cache:'no-store',credentials:'omit',
  ...options,headers:{...(options.headers||{}),Authorization:'Bearer '+token}});
 let res=await send();
 if(res.status===401){
  token='';expires=0;
  if(await renewAccess())res=await send();
 }
 if(!res.ok){if(res.status===401)resetSession();throw Error('Microsoft Graph: '+res.status);}
 return res.json();
}
function verifyEmail(me){
 const actual=[me.mail,me.userPrincipalName,...(me.otherMails||[])].filter(Boolean).map(x=>String(x).toLowerCase());
 if(!actual.includes(config.account))throw Error('Nem a beállított Microsoft-fiókba jelentkeztél be.');
}
function random(n){const b=new Uint8Array(n);w.crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
async function beginAuth(silent=false){
 if(!config){$('odConfig').hidden=false;status('Add meg a Microsoft alkalmazásazonosítót és e-mail-címet.',true);return}
 if(!w.crypto?.subtle||!w.isSecureContext){status('A Microsoft-belépéshez HTTPS és WebCrypto szükséges.',true);return}
 if(new URLSearchParams(w.location.search).get('sh9native')==='1'){status('A bejelentkezést a telefon rendszerböngészőjében végezd, ne a natív WebView-ben.',true);return}
 const verifier=random(48),state=random(24);
 const sha=await w.crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(sha))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
 if(!store(w.sessionStorage,FLOW,JSON.stringify({verifier,state,at:Date.now(),clientId:config.clientId,account:config.account,redirect:origin()}))){
  status('A böngésző blokkolja a biztonságos ideiglenes munkamenetet.',true);return
 }
 const url=new URL(AUTH+'authorize');
 for(const [k,v] of Object.entries({client_id:config.clientId,response_type:'code',redirect_uri:origin(),response_mode:'query',
  scope:SCOPES,code_challenge_method:'S256',code_challenge:challenge,state}))url.searchParams.set(k,v);
 if(silent)url.searchParams.set('prompt','none');
 w.location.assign(url.href);
}
async function handleCallback(){
 const search=new URLSearchParams(w.location.search);
 if(!search.has('code')&&!search.has('error'))return false;
 const flow=parse(load(w.sessionStorage,FLOW));try{w.sessionStorage.removeItem(FLOW)}catch(_){}
 const code=search.get('code'),state=search.get('state'),err=search.get('error');
 clearQuery();if(err){
  status((err==='login_required'||err==='interaction_required'||err==='consent_required')?
   'A Microsoft ismételt jóváhagyást kér. Kattints a Microsoft OneDrive csatlakozásra.':
   'Microsoft bejelentkezés sikertelen: '+err,true);
  return true;
 }
 if(!code||!flow||!config||flow.state!==state||flow.clientId!==config.clientId||flow.account!==config.account||
  flow.redirect!==origin()||Date.now()-flow.at>600000){status('Sikertelen biztonsági ellenőrzés. Próbáld újra.',true);return true}
 try{
  const form=new URLSearchParams({client_id:config.clientId,grant_type:'authorization_code',code,code_verifier:flow.verifier,
   redirect_uri:origin(),scope:SCOPES});
  const res=await w.fetch(AUTH+'token',{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  if(!res.ok)throw Error('Microsoft-belépés HTTP '+res.status);
  storeTokenResponse(await res.json());
  await verifyAccount();
  await rememberRefresh();
  markTrusted();
  ready=true;setConnected(true);void loadLibrary();
 }catch(e){resetSession();status('OneDrive-belépési hiba: '+e.message,true)}
 return true;
}
async function resume(){
 if(!config)return false;
 const s=parse(load(w.sessionStorage,TOKEN));
 if(s&&s.clientId===config.clientId&&s.account===config.account&&s.expires>Date.now()+40000){
  token=s.accessToken;expires=s.expires;
  try{
   await verifyAccount();ready=true;setConnected(true);markTrusted();
   return true;
  }catch(_){resetSession()}
 }
 return await renewAccess();
}
async function pages(url,limit=8){
 let next=url,data=[],page=0;
 while(next&&page++<limit&&data.length<MAX_ITEMS){
  const resp=await json(next);
  if(!Array.isArray(resp.value))throw Error('Érvénytelen OneDrive-válasz.');
  data.push(...resp.value);
  next=resp['@odata.nextLink']||'';
 }
 return data;
}
async function findFolders(){
 const q=encodeURIComponent("'EBOOKS'");
 const all=await pages(GRAPH+'me/drive/root/search(q='+q+')?$top=100',5);
 const seen=new Set();
 found=all.filter(x=>x.folder&&x.name.toLocaleUpperCase('hu-HU')==='EBOOKS'&&!seen.has(x.id)&&seen.add(x.id));
 const sel=$('odFolders');sel.replaceChildren();
 if(!found.length){
  status('Nem található EBOOKS nevű mappa ebben a Microsoft-fiókban.',true);
  $('odFolderSelector').hidden=true;return false;
 }
 for(const folder of found){
  const option=element('option','',folder.parentReference?.path?.replace(/\/root:/,'')||folder.name);
  option.value=folder.id;sel.append(option);
 }
 $('odFolderSelector').hidden=found.length<=1;
 if(!found.some(x=>x.id===folderId))folderId=found[0].id;
 sel.value=folderId;
 driveId=found.find(x=>x.id===folderId)?.parentReference?.driveId||'';
 return true;
}
async function scanFolder(){
 const all=[],work=[{id:folderId,depth:0}];let folders=0;
 while(work.length&&folders++<MAX_FOLDERS&&all.length<MAX_ITEMS){
  const curr=work.shift();
  const list=await pages(GRAPH+'me/drive/items/'+encodeURIComponent(curr.id)+'/children?$top=200',6);
  for(const item of list){
   if(item.folder&&curr.depth<MAX_DEPTH)work.push({id:item.id,depth:curr.depth+1});
   else if(item.file&&/\.(epub|pdf)$/i.test(item.name||'')&&Number(item.size)>0){
    all.push(item);if(all.length>=MAX_ITEMS)break;
   }
  }
 }
 return all;
}
function mapBook(item,stored={}){
 const format=item.name.toLowerCase().endsWith('.pdf')?'pdf':'epub',stem=item.name.replace(/\.(epub|pdf)$/i,'');
 // Filename is a presentation fallback, not metadata extracted from the book.
 let author='',title=stem;
 if(stem.includes(' - ')){const i=stem.indexOf(' - ');author=stem.slice(0,i);title=stem.slice(i+3)}
 return {id:'od_'+encodeURIComponent(item.id),source:'onedrive',drive_id:driveId,drive_item_id:item.id,profile_key:pid(),
  title:text(title),author:text(author),file_name:item.name,format,storage_path:null,
  // OneDrive occasionally includes this short-lived link in children responses.
  // Memory only: never persist a preauthenticated download URL to Supabase or browser storage.
  download_url:item['@microsoft.graph.downloadUrl']||item['@content.downloadUrl']||'',listed_at:Date.now(),
  size_bytes:item.size,etag:item.eTag||item.cTag||'',last_modified:item.lastModifiedDateTime||'',
  progress_locator:stored.progress_locator||'',progress_percent:stored.progress_percent||0,
  bookmarks:Array.isArray(stored.bookmarks)?stored.bookmarks:[],is_favorite:!!stored.is_favorite,
  theme:stored.theme||'dark',font_size:stored.font_size||100,updated_at:stored.updated_at||''};
}
async function progressRecords(){
 try{
  const api=await w.SH9_BOOK_STUDIO_V1.authorized(pid());
  const {data,error}=await api.from(PROGRESS).select('*').eq('profile_key',pid()).eq('drive_id',driveId).limit(MAX_ITEMS);
  if(error)throw error;
  progressCloud=true;return new Map((data||[]).map(x=>[x.item_id,x]));
 }catch(e){
  progressCloud=false;return new Map();
 }
}
async function loadLibrary(){
 if(!ready||scanning)return;
 scanning=true;status('📂 OneDrive könyvek keresése…',false);$('odGrid').replaceChildren();
 try{
  if(!await findFolders()){scanning=false;return}
  status('📚 Könyvek beolvasása…',false);
  const items=await scanFolder(),progress=await progressRecords();
  entries=items.map(item=>mapBook(item,progress.get(item.id))).sort((a,b)=>a.title.localeCompare(b.title,'hu-HU'));
  render();
  status('✓ '+entries.length+' könyv a OneDrive-on · '+(progressCloud?'olvasási állapot felhőben':'olvasási pozíció szinkronja: Family Guard-belépés szükséges'),!progressCloud);
  void updateCacheInfo();
 }catch(e){
  status('Nem sikerült olvasni a OneDrive-ot: '+e.message,true);
 }finally{scanning=false}
}
function dropCoverUrls(){for(const v of coverUrls.values())URL.revokeObjectURL(v);coverUrls.clear()}
function paintCover(b){
 const el=d.getElementById('odcover-'+b.id),url=coverUrls.get(b.id);
 if(el&&url){el.style.backgroundImage='url("'+url+'")';el.classList.add('has-art')}
}
async function cachedCover(b){
 if(!CACHE||coverUrls.has(b.id)||!config)return;
 const cover=await CACHE.get(config.account,b,'cover');
 if(!cover||!entries.some(x=>x.id===b.id))return;
 const url=URL.createObjectURL(cover);coverUrls.set(b.id,url);paintCover(b);
}
function render(){
 const grid=$('odGrid');grid.replaceChildren();
 const f=$('odFilter').value.toLocaleLowerCase('hu-HU').trim();
 const list=entries.filter(b=>(b.title+' '+b.author).toLocaleLowerCase('hu-HU').includes(f));
 $('odCount').textContent=entries.length+' könyv';
 $('odEmpty').hidden=!!list.length;
 $('odEmpty').textContent=entries.length?'Nincs ilyen cím vagy szerző.':'Ebben az EBOOKS mappában nem találtam EPUB/PDF könyvet.';
 const recent=entries.filter(x=>x.progress_locator).sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||''))[0];
 $('odResume').hidden=!recent;
 if(recent){$('odResumeName').textContent=recent.title;$('odResume').onclick=()=>void w.SH9_BOOK_STUDIO_V1.openBook(recent.id)}
 for(const b of list){
  const card=element('article','book-card onedrive-book');
  const cover=element('button','cover od-cover');cover.type='button';cover.id='odcover-'+b.id;
  const idx=b.id.length%6,colors=[['#0e4862','#628aa2'],['#5a254f','#a34e74'],['#4c3430','#b37c49'],['#263a60','#647cc0'],['#294f47','#62a78f'],['#51395e','#b8838c']];
  cover.style.setProperty('--tone1',colors[idx][0]);cover.style.setProperty('--tone2',colors[idx][1]);
  cover.append(element('span','cover-mark','✦'),element('strong','',b.title),element('small','',b.author||'OneDrive · '+b.format.toUpperCase()));
  cover.title=b.title;cover.setAttribute('aria-label',b.title+' megnyitása');
  cover.addEventListener('click',()=>void w.SH9_BOOK_STUDIO_V1.openBook(b.id));
  const h=element('h3','',b.title),p=element('p','',b.author||'☁️ OneDrive');
  const buttons=element('div','card-actions');
  const open=element('button','open','Olvasás →');open.addEventListener('click',()=>void w.SH9_BOOK_STUDIO_V1.openBook(b.id));
  const fav=element('button',b.is_favorite?'faved':'',b.is_favorite?'♥':'♡');
  fav.setAttribute('aria-label',b.is_favorite?'Kedvenc eltávolítása':'Kedvencekhez adás');
  fav.addEventListener('click',async()=>{const before=b.is_favorite;b.is_favorite=!before;render();await saveProgress(b);});
  buttons.append(open,fav);
  const progress=element('div','card-progress'),bar=element('span');bar.style.width=Math.min(100,Math.max(0,b.progress_percent||0))+'%';progress.append(bar);
  card.append(cover,h,p,buttons,progress);grid.append(card);
  paintCover(b);if(!coverUrls.has(b.id))void cachedCover(b);
 }
}
async function saveProgress(b,patch={}){
 if(!progressCloud)return;
 const p=pid();if(b.profile_key!==p)return;
 try{
  const api=await w.SH9_BOOK_STUDIO_V1.authorized(p);
  const entry={profile_key:p,drive_id:b.drive_id,item_id:b.drive_item_id,
   progress_locator:patch.progress_locator??b.progress_locator??null,
   progress_percent:patch.progress_percent??b.progress_percent??0,
   bookmarks:patch.bookmarks??b.bookmarks??[],is_favorite:b.is_favorite,
   theme:patch.theme??b.theme??'dark',font_size:patch.font_size??b.font_size??100,
   updated_at:new Date().toISOString()};
  const {error}=await api.from(PROGRESS).upsert(entry,{onConflict:'profile_key,drive_id,item_id'});
  if(error)throw error;
  b.updated_at=entry.updated_at;
 }catch(e){status('Olvasási állapot mentési hiba: '+e.message,true)}
}
function getBook(id){return entries.find(x=>x.id===id&&x.profile_key===pid())||null}
// Microsoft Graph's downloadUrl is an INSTANCE ANNOTATION. It is not a normal
// $select column. The documented browser example uses `?select=` (no dollar).
// Personal OneDrive may return it in full metadata or children, depending on
// endpoint/account. We accept only a short-lived HTTPS URL and never persist it.
const tempDownloadUrl=obj=>{
 const url=obj?.['@microsoft.graph.downloadUrl']||obj?.['@content.downloadUrl'];
 if(typeof url!=='string')return '';
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname?u.href:''}catch(_){return ''}
};
async function freshDownloadUrl(b){
 const id=encodeURIComponent(b.drive_item_id),drive=encodeURIComponent(b.drive_id);
 const routes=[
  GRAPH+'me/drive/items/'+id+'?select=id,@microsoft.graph.downloadUrl',
  GRAPH+'me/drive/items/'+id,
  GRAPH+'drives/'+drive+'/items/'+id+'?select=id,@microsoft.graph.downloadUrl',
  GRAPH+'drives/'+drive+'/items/'+id
 ];
 let lastError=null,hadMetadata=false;
 for(const route of routes){
  try{
   const metadata=await json(route);
   hadMetadata=true;
   const url=tempDownloadUrl(metadata);
   if(url)return url;
  }catch(e){
   lastError=e;
   if(/munkamenet|Microsoft Graph: 401|Microsoft Graph: 403/.test(e.message||''))throw e;
  }
 }
 // Fallback to a signed link from the same live folder listing, if fresh.
 if(Date.now()-b.listed_at<20*60*1000){
  const cached=tempDownloadUrl({'@microsoft.graph.downloadUrl':b.download_url});
  if(cached)return cached;
 }
 throw Error(hadMetadata?
  'A Microsoft Graph nem küldött letöltési hivatkozást ehhez a fájlhoz. Könyvtár frissítése, majd újrapróbálás szükséges.':
  'A könyvfájl metaadata nem elérhető: '+(lastError?.message||'ismeretlen hiba'));
}
async function download(b){
 if(!await ensureAccess()){resetSession();throw Error('A Microsoft-belépés lejárt. Kapcsolódj újra.');}
 if(!getBook(b.id)||b.size_bytes>MAX_DOWNLOAD)throw Error(b.size_bytes>MAX_DOWNLOAD?'Túl nagy könyv mobilos olvasáshoz (80 MB limit).':'Az adott könyv már nincs a könyvtárban.');
 const account=config.account,cacheKey=CACHE?.key(account,b,'file')||b.id;
 if(pendingDownloads.has(cacheKey))return pendingDownloads.get(cacheKey);
 const task=(async()=>{
  // This is a local browser cache. Same signed-in account + same file revision only.
  const old=CACHE?await CACHE.get(account,b,'file'):null;
  if(old?.size){void extractCover(b,old);return old}
  const url=await freshDownloadUrl(b);
  let blob;
  try{
   const res=await w.fetch(url,{method:'GET',credentials:'omit'});
   if(!res.ok)throw Error('OneDrive letöltés HTTP '+res.status);
   const len=Number(res.headers.get('Content-Length')||0);
   if(len>MAX_DOWNLOAD)throw Error('Túl nagy könyvfájl.');
   blob=await res.blob();
  }catch(e){
   if(e instanceof TypeError)throw Error('A OneDrive fájlletöltést a böngésző blokkolta (CORS/hálózat). '+e.message);
   throw e;
  }
  if(blob.size>MAX_DOWNLOAD)throw Error('Túl nagy könyvfájl.');
  if(CACHE)void CACHE.put(account,b,'file',blob).then(updateCacheInfo);
  void extractCover(b,blob);
  return blob;
 })().finally(()=>{pendingDownloads.delete(cacheKey)});
 pendingDownloads.set(cacheKey,task);return task;
}

function zipPath(base,href){
 let raw=String(href||'').split('#')[0].split('?')[0];
 try{raw=decodeURIComponent(raw)}catch(_){}
 const dirs=base.split('/').slice(0,-1);
 for(const part of raw.split('/')){
  if(!part||part==='.')continue;
  if(part==='..')dirs.pop();else dirs.push(part);
 }
 return dirs.join('/');
}
async function thumbFromBlob(blob){
 if(!blob?.size||!blob.type.startsWith('image/'))return null;
 try{
  const bit=await w.createImageBitmap(blob);
  const ratio=Math.min(1,420/bit.width,630/bit.height);
  const cv=d.createElement('canvas');cv.width=Math.max(1,Math.round(bit.width*ratio));cv.height=Math.max(1,Math.round(bit.height*ratio));
  cv.getContext('2d').drawImage(bit,0,0,cv.width,cv.height);bit.close();
  return await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg',.85));
 }catch(_){return null}
}
async function epubCover(blob){
 if(!w.JSZip||!w.DOMParser||blob.size>MAX_DOWNLOAD)return null;
 const zip=await w.JSZip.loadAsync(blob),manifestFile=zip.file('META-INF/container.xml');
 if(!manifestFile)return null;
 const parser=new w.DOMParser();
 const container=parser.parseFromString(await manifestFile.async('string'),'text/xml');
 const opfPath=container.querySelector('rootfile')?.getAttribute('full-path');
 if(!opfPath||!zip.file(opfPath))return null;
 const xml=parser.parseFromString(await zip.file(opfPath).async('string'),'text/xml');
 const coverMeta=Array.from(xml.getElementsByTagName('meta')).find(x=>x.getAttribute('name')==='cover')?.getAttribute('content');
 const manifest=Array.from(xml.getElementsByTagName('item'));
 let item=manifest.find(x=>(x.getAttribute('properties')||'').split(/\s+/).includes('cover-image'));
 if(!item&&coverMeta)item=manifest.find(x=>x.getAttribute('id')===coverMeta);
 if(!item)item=manifest.find(x=>/cover/i.test(x.getAttribute('href')||'')&&/^image\//i.test(x.getAttribute('media-type')||''));
 if(!item)return null;
 const name=zipPath(opfPath,item.getAttribute('href'));
 const z=zip.file(name);if(!z)return null;
 const bytes=await z.async('uint8array');
 if(bytes.length>12*1024*1024)return null;
 const type=item.getAttribute('media-type')||'image/jpeg';
 return await thumbFromBlob(new Blob([bytes],{type}));
}
async function pdfCover(blob){
 if(!w.pdfjsLib||blob.size>28*1024*1024)return null;
 let pdf=null;
 try{
  pdf=await w.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),useSystemFonts:true}).promise;
  const page=await pdf.getPage(1),initial=page.getViewport({scale:1});
  const vp=page.getViewport({scale:Math.min(1,420/initial.width,630/initial.height)});
  const canvas=d.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.83));
 }catch(_){return null}finally{try{await pdf?.destroy()}catch(_){}}
}
async function extractCover(b,blob){
 if(!CACHE||!config||coverUrls.has(b.id))return;
 // Never download files just to paint the shelf automatically. Use local copies only.
 const cached=await CACHE.get(config.account,b,'cover');
 let image=cached;
 if(!image){
  try{image=b.format==='epub'?await epubCover(blob):await pdfCover(blob)}catch(_){image=null}
  if(image)void CACHE.put(config.account,b,'cover',image).then(updateCacheInfo);
 }
 if(!image||!entries.some(x=>x.id===b.id)||coverUrls.has(b.id))return;
 const url=URL.createObjectURL(image);coverUrls.set(b.id,url);paintCover(b);
}
async function updateCacheInfo(){
 if(!CACHE||!config)return;
 const x=await CACHE.count(config.account);
 if($('odCacheInfo'))$('odCacheInfo').textContent=x.books+' könyv helyben · '+x.covers+' eredeti borító';
}
async function prepareCovers(){
 if(coverLoading||!ready)return;
 coverLoading=true;const id=++coverJob;
 const btn=$('odCoverSync');btn.disabled=true;
 const work=entries.filter(x=>!coverUrls.has(x.id)&&x.size_bytes>0&&x.size_bytes<28*1024*1024);
 let done=0;
 try{
  for(const book of work){
   if(id!==coverJob||!ready)break;
   try{
    const cover=await CACHE?.get(config.account,book,'cover');
    if(cover){await cachedCover(book)}
    else{const blob=await download(book);await extractCover(book,blob)}
   }catch(_){/* Degraded book cover retains readable premium placeholder. */}
   done++;
   status('📚 Eredeti borítók: '+done+' / '+work.length+' · a könyvek az eszközre egyszer töltődnek le.');
   await new Promise(resolve=>w.setTimeout(resolve,70));
  }
 }finally{coverLoading=false;btn.disabled=false;await updateCacheInfo();
  if(ready)status('✓ '+entries.length+' könyv · '+done+' borító ellenőrizve · ☁️ OneDrive');
 }
}

async function saveConfig(){
 const clientId=$('odClientId').value.trim(),account=$('odAccount').value.trim().toLowerCase();
 if(!ID_RE.test(clientId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)){status('Valós Microsoft App ID és e-mail-cím szükséges.',true);return}
 const changed=!config||clientId!==config.clientId||account!==config.account;
 if(changed)await clearCredentials();
 config={clientId,account};if(!store(w.localStorage,CFG,JSON.stringify(config))){status('Nem menthető a beállítás ebben a böngészőben.',true);return}
 $('odConfig').hidden=true;
 status(changed?'Beállítás mentve. Kattints egyszer a Microsoft-belépésre.':'Beállítások változatlanok. A Microsoft-kapcsolat megmaradt.');
}
$('odSave').addEventListener('click',()=>void saveConfig());
$('odConnect').addEventListener('click',()=>void beginAuth());
$('odRefresh').addEventListener('click',()=>void loadLibrary());
$('odDisconnect').addEventListener('click',async()=>{await clearCredentials();entries=[];render();status('OneDrive kapcsolat bontva. Az automatikus belépést is kikapcsoltuk.');});
$('odConfigToggle').addEventListener('click',()=>{$('odConfig').hidden=!$('odConfig').hidden;});
$('odFolders').addEventListener('change',()=>{folderId=$('odFolders').value;driveId=found.find(x=>x.id===folderId)?.parentReference?.driveId||'';void loadLibrary()});
$('odFilter').addEventListener('input',render);
$('odCoverSync').addEventListener('click',()=>void prepareCovers());
$('odCacheClear').addEventListener('click',async()=>{
 if(!config||!CACHE)return;
 if(!w.confirm('Töröljük az ezen az eszközön tárolt könyvmásolatokat és borítókat? A OneDrive könyveid nem változnak.'))return;
 ++coverJob;dropCoverUrls();
 await CACHE.clear(config.account);render();await updateCacheInfo();
 status('A helyi gyorsítótár kiürítve. Az eredeti OneDrive-könyvek érintetlenek.');
});
w.SH9_BOOK_STUDIO_DRIVE_V2=Object.freeze({getBook,download,saveProgress,render,reload:async()=>{entries=[];await loadLibrary()}});
displayConfig();setConnected(false);
(async()=>{
 if(await handleCallback())return;
 if(await resume()){
  status('☁️ OneDrive automatikusan csatlakoztatva…');
  await loadLibrary();return;
 }
 if(config&&await silentReconnect())return;
 status(config?'Microsoft-megerősítés szükséges. A könyvek továbbra is a OneDrive-on maradnak.':'Microsoft-kapcsolat beállítása szükséges.');
})();
})(window,document);