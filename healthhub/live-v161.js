(function(){
'use strict';
/* HealthHub v1.61 — Dropbox App Folder Health Vault (PKCE, no app secret) */
var APP_KEY='o2oe9qclhtoic9s';
var REDIRECT='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/';
var TOKEN_KEY='hh-dropbox-token-v1', PKCE_KEY='hh-dropbox-pkce-v1';
var DB='healthhub-healthradar-v2', BRIDGE_DB='healthhub-connect-v1', LEGACY_KEY='hh-health-vault-v1';

function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('A művelet megszakadt'))}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,1);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains('imports'))d.createObjectStore('imports',{keyPath:'id'});if(!d.objectStoreNames.contains('activity'))d.createObjectStore('activity',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function b64url(bytes){var s='';bytes.forEach(function(b){s+=String.fromCharCode(b)});return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function randomToken(n){var a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)}
async function sha256b64(s){var d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return b64url(new Uint8Array(d))}
function readToken(){try{return JSON.parse(localStorage.getItem(TOKEN_KEY)||'null')}catch(e){return null}}
function saveToken(t){localStorage.setItem(TOKEN_KEY,JSON.stringify(t))}
function clearToken(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(PKCE_KEY)}
function connected(){var t=readToken();return !!(t&&t.refresh_token)}

async function connect(){
 var verifier=randomToken(64),challenge=await sha256b64(verifier),state=randomToken(24);
 localStorage.setItem(PKCE_KEY,JSON.stringify({verifier:verifier,state:state,createdAt:Date.now()}));
 var u=new URL('https://www.dropbox.com/oauth2/authorize');
 u.searchParams.set('client_id',APP_KEY);
 u.searchParams.set('response_type','code');
 u.searchParams.set('redirect_uri',REDIRECT);
 u.searchParams.set('code_challenge',challenge);
 u.searchParams.set('code_challenge_method','S256');
 u.searchParams.set('token_access_type','offline');
 u.searchParams.set('state',state);
 location.href=u.toString();
}
async function handleCallback(){
 var u=new URL(location.href),code=u.searchParams.get('code'),state=u.searchParams.get('state'),err=u.searchParams.get('error');
 if(err){toast('Dropbox engedélyezés sikertelen: '+(u.searchParams.get('error_description')||err));history.replaceState({},'',REDIRECT);return}
 if(!code)return;
 var pk;try{pk=JSON.parse(localStorage.getItem(PKCE_KEY)||'null')}catch(e){}
 if(!pk||!pk.verifier||!pk.state||pk.state!==state){toast('Dropbox OAuth állapotellenőrzés sikertelen.');return}
 var body=new URLSearchParams({code:code,grant_type:'authorization_code',redirect_uri:REDIRECT,code_verifier:pk.verifier,client_id:APP_KEY});
 var r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
 var j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||'Dropbox token hiba');
 saveToken({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+((Number(j.expires_in)||14400)-60)*1000,scope:j.scope||'',account_id:j.account_id||''});
 localStorage.removeItem(PKCE_KEY);
 history.replaceState({},'',REDIRECT);
 toast('Dropbox Health Vault csatlakoztatva');
 setTimeout(decorate,80);
}
async function accessToken(){
 var t=readToken();if(!t||!t.refresh_token)throw new Error('A Dropbox nincs csatlakoztatva.');
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
 var body=new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY});
 var r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
 var j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||'Dropbox token frissítési hiba');
 t.access_token=j.access_token;t.expires_at=Date.now()+((Number(j.expires_in)||14400)-60)*1000;saveToken(t);return t.access_token;
}
async function dbAll(){
 var db=await openDb();try{return await reqP(db.transaction('measurements').objectStore('measurements').getAll())||[]}finally{db.close()}
}
async function bridgeAll(){
 var db=await openBridgeDb();try{
  var t=db.transaction(['imports','activity']);
  var imports=await reqP(t.objectStore('imports').getAll())||[];
  var activity=await reqP(t.objectStore('activity').getAll())||[];
  return {imports:imports,activity:activity};
 }finally{db.close()}
}
function legacyProfile(profile){
 try{var v=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');return v&&v.profiles&&v.profiles[profile]?v.profiles[profile]:null}catch(e){return null}
}
async function snapshot(profile){
 var all=await dbAll(),br=await bridgeAll();
 return {schemaVersion:'healthhub.dropbox.vault/1.0',profile:profile,exportedAt:new Date().toISOString(),legacyProfile:legacyProfile(profile),measurements:all.filter(function(x){return x.profile===profile}),bridgeImports:br.imports.filter(function(x){return x.profile===profile}),bridgeActivity:br.activity.filter(function(x){return x.profile===profile})};
}
function vaultPath(profile){return '/'+profile+'-data.json'}
async function uploadCurrent(silent){
 var profile=pkey(),data=await snapshot(profile),token=await accessToken(),body=JSON.stringify(data);
 var r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify({path:vaultPath(profile),mode:'overwrite',autorename:false,mute:true})},body:body});
 var j=await r.json();if(!r.ok)throw new Error((j.error_summary)||'Dropbox feltöltési hiba');
 localStorage.setItem('hh-dropbox-last-push-'+profile,new Date().toISOString());if(!silent)toast(pname(profile)+' Health Vault feltöltve');decorate();return j;
}
async function download(profile){
 var token=await accessToken(),r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path:vaultPath(profile)})}});
 if(r.status===409)throw new Error('Ehhez a profilhoz még nincs Dropbox Vault fájl.');
 if(!r.ok)throw new Error('Dropbox letöltési hiba');
 return await r.json();
}
async function mergeVault(data){
 if(!data||data.schemaVersion!=='healthhub.dropbox.vault/1.0')throw new Error('Nem támogatott HealthHub Vault fájl.');
 var profile=data.profile;if(profile!=='zsolt'&&profile!=='monika')throw new Error('Hibás profil a Vault fájlban.');
 var db=await openDb();try{
  var tx=db.transaction('measurements','readwrite'),st=tx.objectStore('measurements');
  (Array.isArray(data.measurements)?data.measurements:[]).forEach(function(x){st.put(x)});await txDone(tx);
 }finally{db.close()}
 var bd=await openBridgeDb();try{
  var bt=bd.transaction(['imports','activity'],'readwrite'),im=bt.objectStore('imports'),ac=bt.objectStore('activity');
  (Array.isArray(data.bridgeImports)?data.bridgeImports:[]).forEach(function(x){im.put(x)});
  (Array.isArray(data.bridgeActivity)?data.bridgeActivity:[]).forEach(function(x){ac.put(x)});
  await txDone(bt);
 }finally{bd.close()}
 if(data.legacyProfile){
  try{var v=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null')||{schemaVersion:'healthhub.local.v1',profiles:{}};v.profiles=v.profiles||{};v.profiles[profile]=Object.assign({},v.profiles[profile]||{},data.legacyProfile);localStorage.setItem(LEGACY_KEY,JSON.stringify(v))}catch(e){}
 }
 localStorage.setItem('hh-dropbox-last-pull-'+profile,new Date().toISOString());
 if(window.renderHealthSection)await window.renderHealthSection();
 if(window.hhSyncFullMigrationDashboard)window.hhSyncFullMigrationDashboard();
 decorate();
}
async function pullCurrent(){
 var profile=pkey(),data=await download(profile);await mergeVault(data);toast(pname(profile)+' Health Vault letöltve és egyesítve');
}
window.hhDropboxConnect=function(){connect().catch(function(e){console.error(e);toast(e.message||'Dropbox csatlakozási hiba')})};
window.hhDropboxPush=function(){uploadCurrent(false).catch(function(e){console.error(e);toast(e.message||'Dropbox feltöltési hiba')})};
window.hhDropboxPull=function(){pullCurrent().catch(function(e){console.error(e);toast(e.message||'Dropbox letöltési hiba')})};
window.hhDropboxDisconnect=function(){clearToken();toast('Dropbox kapcsolat törölve ezen az eszközön');decorate()};
window.hhDropboxPushCurrentProfile=function(){if(!connected())return Promise.resolve(null);return uploadCurrent(true)};

function fmt(s){if(!s)return 'még nem';var d=new Date(s);return isNaN(d)?'még nem':d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function style(){
 if(document.getElementById('hh-v161-style'))return;var s=document.createElement('style');s.id='hh-v161-style';s.textContent=
 '.hhDbxCard{border:1px solid #cfe0ec;background:linear-gradient(145deg,#fff,#f0f7fb);border-radius:16px;padding:12px;margin-bottom:8px;box-shadow:0 6px 16px rgba(31,65,91,.055)}'+
 '.hhDbxTop{display:flex;align-items:center;gap:10px}.hhDbxIcon{width:38px;height:38px;border-radius:12px;background:#0061ff;color:white;display:grid;place-items:center;font-weight:900;flex:none}.hhDbxText{min-width:0;flex:1}.hhDbxText b{display:block;font-size:11px;color:#173f62}.hhDbxText small{display:block;font-size:8px;color:#73879a;line-height:1.35;margin-top:2px}.hhDbxStatus{font-size:7.5px;font-weight:850;padding:5px 7px;border-radius:999px;background:#e8f7f2;color:#1d725c;white-space:nowrap}.hhDbxStatus.off{background:#f0f3f6;color:#758392}.hhDbxActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.hhDbxBtn{border:0;border-radius:11px;padding:8px 10px;font-size:8px;font-weight:850;background:#173f62;color:white}.hhDbxBtn.alt{background:#eef5fa;color:#31536f;border:1px solid #d7e4ed}.hhDbxMeta{font-size:7.5px;color:#7c8e9c;margin-top:8px;line-height:1.45}';
 document.head.appendChild(s)
}
function decorate(){
 if(window.healthSectionKind!=='more')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var old=document.getElementById('hhDropboxVaultCard');if(old)old.remove();
 var profile=pkey(),on=connected(),card=document.createElement('div');card.id='hhDropboxVaultCard';card.className='hhDbxCard';
 var push=localStorage.getItem('hh-dropbox-last-push-'+profile),pull=localStorage.getItem('hh-dropbox-last-pull-'+profile);
 card.innerHTML='<div class="hhDbxTop"><div class="hhDbxIcon">◆</div><div class="hhDbxText"><b>Dropbox Health Vault</b><small>Dedikált App Folder · '+esc(pname(profile))+' profil</small></div><span class="hhDbxStatus '+(on?'':'off')+'">'+(on?'Csatlakoztatva':'Nincs kapcsolat')+'</span></div>'+
 (on?'<div class="hhDbxActions"><button class="hhDbxBtn" onclick="hhDropboxPush()">Feltöltés</button><button class="hhDbxBtn alt" onclick="hhDropboxPull()">Letöltés + egyesítés</button><button class="hhDbxBtn alt" onclick="hhDropboxDisconnect()">Leválasztás</button></div><div class="hhDbxMeta">Utolsó feltöltés: '+esc(fmt(push))+' · Utolsó letöltés: '+esc(fmt(pull))+'<br>Fájl: '+esc(vaultPath(profile))+'</div>':'<div class="hhDbxActions"><button class="hhDbxBtn" onclick="hhDropboxConnect()">Dropbox csatlakoztatása</button></div><div class="hhDbxMeta">Egyszeri Dropbox engedélyezés szükséges. A HealthHub csak a saját App Folder mappáját használja.</div>');
 var admin=document.getElementById('hhAdminMenuCard');if(admin&&admin.parentNode===root)admin.insertAdjacentElement('afterend',card);else root.insertBefore(card,root.firstChild);
}
var prev=window.renderHealthSection;if(typeof prev==='function')window.renderHealthSection=async function(){var x=await prev.apply(this,arguments);style();decorate();return x};
style();
handleCallback().catch(function(e){console.error(e);toast(e.message||'Dropbox OAuth hiba')});
setTimeout(decorate,180);
window.addEventListener('focus',function(){setTimeout(decorate,100)});
document.documentElement.dataset.healthhubDropboxVault='1.61';
window.HH_DROPBOX_VAULT={connected:connected,push:window.hhDropboxPush,pull:window.hhDropboxPull};
})();