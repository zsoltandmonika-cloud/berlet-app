/* SHO Book Studio OneDrive V2.
 * Live delegated Files.Read only, SPA PKCE. No uploads/deletes against OneDrive.
 * Books remain in Microsoft OneDrive; only per-profile reading state in Supabase.
 * ChatGPT's connector access is NOT reused by this public static page.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),CFG='sh9-book-ms-config-v2',TOKEN='sh9-book-ms-access-v2',FLOW='sh9-book-ms-pkce-v2';
const GRAPH='https://graph.microsoft.com/v1.0/',AUTH='https://login.microsoftonline.com/consumers/oauth2/v2.0/';
const SCOPES='openid profile User.Read Files.Read';
const PROGRESS='hh_book_studio_drive_progress_v2';
const ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS=900,MAX_FOLDERS=65,MAX_DEPTH=5,MAX_DOWNLOAD=80*1024*1024;
let config=null,token='',expires=0,found=[],entries=[],folderId='',driveId='',ready=false,scanning=false,progressCloud=false;
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
function resetSession(){token='';expires=0;try{sessionStorage.removeItem(TOKEN)}catch(_){}ready=false;setConnected(false)}
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
 $('odConfigToggle').hidden=!on;
}
async function json(url,options={}){
 const u=new URL(url,GRAPH);
 if(u.protocol!=='https:'||u.hostname!=='graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))throw Error('Érvénytelen Microsoft Graph URL.');
 if(!token||expires<Date.now()+20000)throw Error('Lejárt a OneDrive-munkamenet. Kérlek, csatlakozz újra.');
 const res=await w.fetch(u.href,{method:'GET',cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+token},...options});
 if(!res.ok){if(res.status===401)resetSession();throw Error('Microsoft Graph: '+res.status);}
 return res.json();
}
function verifyEmail(me){
 const actual=[me.mail,me.userPrincipalName,...(me.otherMails||[])].filter(Boolean).map(x=>String(x).toLowerCase());
 if(!actual.includes(config.account))throw Error('Nem a beállított Microsoft-fiókba jelentkeztél be.');
}
function random(n){const b=new Uint8Array(n);w.crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
async function beginAuth(){
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
 w.location.assign(url.href);
}
async function handleCallback(){
 const search=new URLSearchParams(w.location.search);
 if(!search.has('code')&&!search.has('error'))return false;
 const flow=parse(load(w.sessionStorage,FLOW));try{w.sessionStorage.removeItem(FLOW)}catch(_){}
 const code=search.get('code'),state=search.get('state'),err=search.get('error');
 clearQuery();if(err){status('Microsoft nem engedélyezte az olvasást: '+err,true);return true}
 if(!code||!flow||!config||flow.state!==state||flow.clientId!==config.clientId||flow.account!==config.account||
  flow.redirect!==origin()||Date.now()-flow.at>600000){status('Sikertelen biztonsági ellenőrzés. Próbáld újra.',true);return true}
 try{
  const form=new URLSearchParams({client_id:config.clientId,grant_type:'authorization_code',code,code_verifier:flow.verifier,
   redirect_uri:origin(),scope:SCOPES});
  const res=await w.fetch(AUTH+'token',{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  if(!res.ok)throw Error('Microsoft-belépés HTTP '+res.status);
  const out=await res.json();if(!out.access_token)throw Error('A Microsoft nem adott hozzáférési tokent.');
  token=out.access_token;expires=Date.now()+Math.max(60,Number(out.expires_in)||3600)*1000;
  const me=await json(GRAPH+'me?$select=mail,userPrincipalName,otherMails');
  verifyEmail(me);
  store(w.sessionStorage,TOKEN,JSON.stringify({accessToken:token,expires,clientId:config.clientId,account:config.account}));
  ready=true;setConnected(true);void loadLibrary();
 }catch(e){resetSession();status('OneDrive-belépési hiba: '+e.message,true)}
 return true;
}
async function resume(){
 if(!config)return false;
 const s=parse(load(w.sessionStorage,TOKEN));
 if(!s||s.clientId!==config.clientId||s.account!==config.account||s.expires<Date.now()+40000)return false;
 token=s.accessToken;expires=s.expires;
 try{const me=await json(GRAPH+'me?$select=mail,userPrincipalName,otherMails');verifyEmail(me);
  ready=true;setConnected(true);return true
 }catch(_){resetSession();return false}
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
  size_bytes:item.size,progress_locator:stored.progress_locator||'',progress_percent:stored.progress_percent||0,
  bookmarks:Array.isArray(stored.bookmarks)?stored.bookmarks:[],is_favorite:!!stored.is_favorite,
  theme:stored.theme||'dark',font_size:stored.font_size||100};
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
 }catch(e){
  status('Nem sikerült olvasni a OneDrive-ot: '+e.message,true);
 }finally{scanning=false}
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
  const cover=element('button','cover od-cover');cover.type='button';
  const idx=b.id.length%6,colors=[['#0e4862','#628aa2'],['#5a254f','#a34e74'],['#4c3430','#b37c49'],['#263a60','#647cc0'],['#294f47','#62a78f'],['#51395e','#b8838c']];
  cover.style.setProperty('--tone1',colors[idx][0]);cover.style.setProperty('--tone2',colors[idx][1]);
  cover.append(element('span','cover-mark','✦'),element('strong','',b.title),element('small','',b.author||'OneDrive · '+b.format.toUpperCase()));
  cover.title=b.title;cover.addEventListener('click',()=>void w.SH9_BOOK_STUDIO_V1.openBook(b.id));
  const h=element('h3','',b.title),p=element('p','',b.author||'☁️ OneDrive');
  const buttons=element('div','card-actions');
  const open=element('button','open','Olvasás →');open.addEventListener('click',()=>void w.SH9_BOOK_STUDIO_V1.openBook(b.id));
  const fav=element('button',b.is_favorite?'faved':'',b.is_favorite?'♥':'♡');
  fav.setAttribute('aria-label',b.is_favorite?'Kedvenc eltávolítása':'Kedvencekhez adás');
  fav.addEventListener('click',async()=>{const before=b.is_favorite;b.is_favorite=!before;render();await saveProgress(b);});
  buttons.append(open,fav);
  const progress=element('div','card-progress'),bar=element('span');bar.style.width=Math.min(100,Math.max(0,b.progress_percent||0))+'%';progress.append(bar);
  card.append(cover,h,p,buttons,progress);grid.append(card);
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
 }catch(e){status('Olvasási állapot mentési hiba: '+e.message,true)}
}
function getBook(id){return entries.find(x=>x.id===id&&x.profile_key===pid())||null}
async function download(b){
 if(!ready||!token||expires<Date.now()+25000)throw Error('A Microsoft-belépés lejárt. Kapcsolódj újra.');
 if(!getBook(b.id)||b.size_bytes>MAX_DOWNLOAD)throw Error(b.size_bytes>MAX_DOWNLOAD?'Túl nagy könyv mobilos olvasáshoz (80 MB limit).':'Az adott könyv már nincs a könyvtárban.');
 // /content has CORS redirect trouble. Graph @microsoft.graph.downloadUrl is the documented SPA route.
 const meta=await json(GRAPH+'me/drive/items/'+encodeURIComponent(b.drive_item_id)+'?$select=id,@microsoft.graph.downloadUrl');
 const url=meta['@microsoft.graph.downloadUrl'];
 if(typeof url!=='string'||!url.startsWith('https://'))throw Error('A Microsoft nem adott ideiglenes letöltési URL-t.');
 const blob=await w.fetch(url,{method:'GET',cache:'no-store',credentials:'omit'}).then(async res=>{
  if(!res.ok)throw Error('OneDrive letöltés HTTP '+res.status);
  const len=Number(res.headers.get('Content-Length')||0);
  if(len>MAX_DOWNLOAD)throw Error('Túl nagy könyvfájl.');
  return res.blob();
 });
 if(blob.size>MAX_DOWNLOAD)throw Error('Túl nagy könyvfájl.');
 return blob;
}
async function saveConfig(){
 const clientId=$('odClientId').value.trim(),account=$('odAccount').value.trim().toLowerCase();
 if(!ID_RE.test(clientId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)){status('Valós Microsoft App ID és e-mail-cím szükséges.',true);return}
 config={clientId,account};if(!store(w.localStorage,CFG,JSON.stringify(config))){status('Nem menthető a beállítás ebben a böngészőben.',true);return}
 resetSession();$('odConfig').hidden=true;
 status('Beállítás mentve. Kattints a Microsoft-belépésre (Files.Read jogosultság).');
}
$('odSave').addEventListener('click',()=>void saveConfig());
$('odConnect').addEventListener('click',()=>void beginAuth());
$('odRefresh').addEventListener('click',()=>void loadLibrary());
$('odDisconnect').addEventListener('click',()=>{resetSession();entries=[];render();status('OneDrive kapcsolat bontva.');});
$('odConfigToggle').addEventListener('click',()=>{$('odConfig').hidden=!$('odConfig').hidden;});
$('odFolders').addEventListener('change',()=>{folderId=$('odFolders').value;driveId=found.find(x=>x.id===folderId)?.parentReference?.driveId||'';void loadLibrary()});
$('odFilter').addEventListener('input',render);
w.SH9_BOOK_STUDIO_DRIVE_V2=Object.freeze({getBook,download,saveProgress,render,reload:async()=>{entries=[];await loadLibrary()}});
displayConfig();setConnected(false);
(async()=>{
 if(await handleCallback())return;
 if(await resume())await loadLibrary();
 else status(config?'Microsoft-kapcsolat szükséges. Az EPUB/PDF könyvek közvetlenül a OneDrive-on maradnak.':'Microsoft-kapcsolat beállítása szükséges.');
})();
})(window,document);