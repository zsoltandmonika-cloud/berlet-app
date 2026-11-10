/* HH One remote-service v1. No HealthHub bootstrap, admin observers, timers or auto-reload. */
(function(){
'use strict';
const ROOT='/HealthHub/orchestrator';
const REGISTRY=ROOT+'/device-registry-v401.json';
const DEVICE_DIR=ROOT+'/devices/';
const COMMAND_DIR=ROOT+'/commands/';
const STATUS_DIR=ROOT+'/status/';
const GMAIL='zsoltandmonika@gmail.com';
const APP_KEY='t68rmhh5f1l8d85'; // existing public Dropbox OAuth app id, never a secret
const REDIRECT='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/';
const OWN_TOKEN='hh-remote-service-token-v1';
const LEGACY_TOKEN='hh-dropbox-token-v2';
const PKCE='hh-remote-service-pkce-v1';
const EXPECTED_DEVICE_BUILD=47;
const EXPIRY_MIN=40;
const $=id=>document.getElementById(id);
let connected=false,verifiedDevice=null,currentAccount=null,selectedStorage=null,access=null,accessUntil=0,sessionCommandId=null,busy=false;
function status(id,msg,level='info'){const el=$(id);if(el){el.textContent=msg;el.dataset.level=level;}}
function field(id,value){const el=$(id);if(el)el.textContent=value;}
function parse(stored){try{const j=JSON.parse(localStorage.getItem(stored)||'null');return j&&j.refresh_token?j:null;}catch(_){return null}}
function makeId(){const bits=new Uint8Array(12);crypto.getRandomValues(bits);return 'cmd-'+Date.now().toString(36)+'-'+Array.from(bits,x=>x.toString(16).padStart(2,'0')).join('');}
function b64url(bytes){let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function clock(date){const n=Date.parse(date||'');return Number.isFinite(n)?new Date(n).toLocaleString('hu-HU'):'Ismeretlen'}
function dateMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
function enableButtons(){const ok=connected&&!!verifiedDevice&&!busy;$('sendBtn').disabled=!ok||$('suffix').value.trim().length!==8||!$('confirm').checked;$('checkBtn').disabled=busy;$('connectBtn').disabled=busy;$('statusBtn').disabled=busy||!connected||!verifiedDevice;}
function resetDevice(){verifiedDevice=null;['deviceId','deviceBuild','deviceConsent','deviceSeen'].forEach(id=>field(id,'—'));field('deviceNote','Kapcsolat ellenőrzése szükséges.');enableButtons();}
function failText(error){return (error&&error.message)||String(error)||'Ismeretlen hiba'}
async function refreshAccess(key,t){
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000){
  access=t.access_token;accessUntil=Number(t.expires_at);selectedStorage=key;return;
 }
 const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY})});
 if(!r.ok)throw Error('A Dropbox-hozzáférés lejárt vagy visszavonták. Csatlakoztasd újra a Gmail-fiókot.');
 const j=await r.json();if(!j.access_token)throw Error('A Dropbox nem adott érvényes hozzáférést.');
 access=j.access_token;accessUntil=Date.now()+Math.max(60,Number(j.expires_in)||14400)*1000-60000;selectedStorage=key;
 // The standalone token may be renewed independently. Never touch the HH Vault token.
 if(key===OWN_TOKEN)localStorage.setItem(key,JSON.stringify({...t,access_token:access,expires_at:accessUntil}));
}
async function bearer(){
 if(!selectedStorage)throw Error('Előbb ellenőrizd a Gmail Dropbox-kapcsolatát.');
 if(access&&accessUntil>Date.now()+15000)return access;
 const t=parse(selectedStorage);if(!t)throw Error('A kapcsolat megszakadt. Csatlakoztasd újra a Gmail Dropboxot.');
 await refreshAccess(selectedStorage,t);return access;
}
async function apiAccount(){
 const r=await fetch('https://api.dropboxapi.com/2/users/get_current_account',{method:'POST',headers:{Authorization:'Bearer '+await bearer(),'Content-Type':'application/json'},body:'null'});
 if(!r.ok)throw Error('A Dropbox-fiók hitelesítése nem sikerült ('+r.status+').');
 return r.json();
}
async function apiRead(path,optional=false){
 const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+await bearer(),'Dropbox-API-Arg':JSON.stringify({path})}});
 if(optional&&r.status===409)return null;
 if(!r.ok)throw Error('Dropbox-fájl nem olvasható: '+path+' ('+r.status+').');
 return r.json();
}
async function apiWrite(path,value){
 const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{Authorization:'Bearer '+await bearer(),'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify({path,mode:'overwrite',autorename:false,mute:true})},body:JSON.stringify(value,null,2)+'\n'});
 if(!r.ok)throw Error('A Dropbox nem fogadta el a parancsot: '+path+' ('+r.status+').');
 const result=await r.json();
 if(String(result.path_lower||'').toLowerCase()!==path.toLowerCase())throw Error('Eltérő Dropbox-célútvonalat adott vissza a szerver.');
 return result;
}
async function chooseAccount(){
 let problem=null;
 for(const key of [OWN_TOKEN,LEGACY_TOKEN]){
  const t=parse(key);if(!t)continue;
  try{
   await refreshAccess(key,t);
   const a=await apiAccount();
   if(String(a.email||'').toLowerCase()!==GMAIL){problem='Ez a kapcsolat nem a Mónika telefonja által használt Gmail Dropbox ('+String(a.email||'ismeretlen')+').';continue;}
   currentAccount=a;selectedStorage=key;connected=true;
   status('accountStatus','✅ Gmail forrásfiók hitelesítve: '+a.email,'success');
   return true;
  }catch(e){problem=failText(e)}
 }
 connected=false;selectedStorage=null;currentAccount=null;access=null;
 status('accountStatus',problem||'Még nincs Gmail Dropbox-hozzáférés ebben a böngészőben. Használd a csatlakozás gombot.',problem?'error':'info');
 return false;
}
function assertDevice(reg,d){
 if(!reg||reg.schema!=='healthhub.device_registry/1'||!reg.activePhones||!Array.isArray(reg.archived))throw Error('A Gmail Dropboxban nem található hiteles v401 telefonregiszter.');
 const id=reg.activePhones.monika;
 if(typeof id!=='string'||!/^android-[a-f0-9-]{36}$/.test(id))throw Error('Mónika fizikai telefonja nincs egyértelműen kijelölve.');
 if(reg.archived.includes(id))throw Error('Mónika telefonja archivált; nem küldünk parancsot.');
 if(!d||d.deviceId!==id||d.deviceType!=='android'||d.activeProfile!=='monika')throw Error('A telefon jelentése nem egyezik a regiszterben jóváhagyott Mónika-profillal.');
 if(Number(d.buildCode)<EXPECTED_DEVICE_BUILD||!Array.isArray(d.capabilities)||!d.capabilities.includes('dropbox_account_review'))throw Error('A kiválasztott telefon még nem igazolta a Dropbox-ellenőrzést támogató 0.15.20-as verziót.');
 if(d.remoteAdminAllowed!==true)throw Error('A telefonon nincs engedélyezve a Remote Admin.');
 const age=Date.now()-dateMs(d.lastSeenAt);
 if(!Number.isFinite(age)||age< -300000||age>24*3600000)throw Error('A telefon utolsó hiteles jelentése túl régi. Nyissátok meg a HH Connectet Mónika telefonján.');
 return {id,device:d,age};
}
async function inspect(){
 resetDevice();
 if(!await chooseAccount())return;
 const reg=await apiRead(REGISTRY);
 const id=reg?.activePhones?.monika;
 if(typeof id!=='string'||!/^android-[a-f0-9-]{36}$/.test(id))throw Error('Nincs hiteles Mónika telefonszintű kijelölés a Gmail Dropboxban.');
 const d=await apiRead(DEVICE_DIR+id+'.json');
 const v=assertDevice(reg,d);
 verifiedDevice=v.id;
 field('deviceId',v.id.slice(0,13)+'…'+v.id.slice(-10));
 field('deviceBuild',String(d.build)+' / build '+d.buildCode);
 field('deviceConsent','✅ Engedélyezve');
 field('deviceSeen',clock(d.lastSeenAt));
 field('deviceNote',v.age>20*60000?'🟠 A telefon utolsó jelentése 20 percnél régebbi. Az értesítés csak a következő kapcsolódáskor jelenhet meg.':'✅ Mónika kijelölt fizikai telefonja hitelesítve. Küldésre előkészítve.');
 status('sendStatus','Az ellenőrzés kész. A célfiókazonosító megadása és a megerősítés után küldhető az értesítés.');
}
async function inspectClicked(){
 if(busy)return;busy=true;enableButtons();status('accountStatus','A Gmail Dropbox és Mónika telefonjának ellenőrzése…');
 try{await inspect()}catch(e){resetDevice();status('sendStatus',failText(e),'error')}finally{busy=false;enableButtons()}
}
async function send(){
 if(busy||!connected||!verifiedDevice)return;
 const suffix=$('suffix').value.trim(),id=verifiedDevice;
 if(!/^[A-Za-z0-9_-]{8}$/.test(suffix)||!$('confirm').checked){status('sendStatus','Pontosan 8 karakter és külön jóváhagyás szükséges.','error');return;}
 if(!window.confirm('Küldjük a Dropbox-ellenőrzési értesítést Mónika telefonjára?\n\nA fiókváltást Mónika dönti el a saját telefonján.'))return;
 busy=true;enableButtons();
 try{
  // Revalidate owner/consent immediately before mutation; never trust stale UI.
  const reg=await apiRead(REGISTRY),d=await apiRead(DEVICE_DIR+id+'.json'),verified=assertDevice(reg,d);
  if(verified.id!==id)throw Error('A kijelölt telefon időközben megváltozott. Kérj új ellenőrzést.');
  if(String(currentAccount?.account_id||'').slice(-8)===suffix)throw Error('A célfiók nem lehet ugyanaz a Gmail-fiók, amelybe a parancsot küldjük.');
  const current=await apiRead(COMMAND_DIR+id+'.json',true);
  if(current?.commandId&&dateMs(current.expiresAt)>Date.now()&&current.state==='pending'){
   const existing=await apiRead(STATUS_DIR+id+'.json',true);
   if(!existing||existing.commandId===current.commandId&&['pending','running','queued'].includes(existing.state)){
    throw Error('Már van aktív telefonparancs. Ne írd felül: előbb ellenőrizd a visszajelzést, vagy várd meg a lejáratot.');
   }
  }
  const issuedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+EXPIRY_MIN*60000).toISOString(),commandId=makeId();
  const command={schema:'healthhub.orchestrator.command/1',commandId,targetDeviceId:id,issuedAt,expiresAt,requestedBy:'web-standalone-service',profileScope:'monika',scopes:['dropbox_account_review'],state:'pending',accountReview:{targetSuffix:suffix}};
  const initial={schema:'healthhub.orchestrator.status/1',deviceId:id,deviceType:'android',commandId,state:'pending',updatedAt:issuedAt,startedAt:null,completedAt:null,profileScope:'monika',scopes:['dropbox_account_review'],steps:[],message:'A telefonra küldött Dropbox-ellenőrzési kérés várakozik.'};
  // Status first, command last: a fast worker can never have its completed status overwritten by this page.
  await apiWrite(STATUS_DIR+id+'.json',initial);
  await apiWrite(COMMAND_DIR+id+'.json',command);
  const receipt=await apiRead(COMMAND_DIR+id+'.json');
  if(receipt?.commandId!==commandId||receipt.targetDeviceId!==id)throw Error('A parancsot nem sikerült a Dropboxból visszaellenőrizni.');
  sessionCommandId=commandId;
  status('sendStatus','✅ A jóváhagyáskérés a Gmail Dropboxba került. Mónika telefonja a következő ellenőrzéskor értesítést jeleníthet meg. Kérés: '+commandId,'success');
 }catch(e){status('sendStatus',failText(e),'error')}finally{busy=false;enableButtons()}
}
async function checkStatus(){
 if(busy||!connected||!verifiedDevice)return;busy=true;enableButtons();
 try{
  const d=await apiRead(DEVICE_DIR+verifiedDevice+'.json');
  if(d?.deviceId===verifiedDevice){field('deviceSeen',clock(d.lastSeenAt));field('deviceBuild',String(d.build)+' / build '+d.buildCode)}
  const s=await apiRead(STATUS_DIR+verifiedDevice+'.json',true);
  if(!s){status('sendStatus','Még nincs telefonos visszajelzés.');return;}
  if(sessionCommandId&&s.commandId!==sessionCommandId){status('sendStatus','Más parancs státusza érkezett. A mostani kérés visszaigazolása még nem ellenőrizhető.','error');return;}
  const state=String(s.state||'ismeretlen');
  status('sendStatus','Telefon visszajelzése: '+state.toUpperCase()+' · '+String(s.message||'Nincs további részlet')+'. A DONE sem bizonyít Outlook-fiókváltást.',state==='failed'||state==='rejected'?'error':'info');
 }catch(e){status('sendStatus',failText(e),'error')}finally{busy=false;enableButtons()}
}
async function startOAuth(){
 if(busy)return;
 const bits=new Uint8Array(24),verBits=new Uint8Array(64);crypto.getRandomValues(bits);crypto.getRandomValues(verBits);
 const state='hhsrv_'+b64url(bits),verifier=b64url(verBits);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 sessionStorage.setItem(PKCE,JSON.stringify({state,verifier,at:Date.now()}));
 const u=new URL('https://www.dropbox.com/oauth2/authorize');
 for(const [key,value] of Object.entries({client_id:APP_KEY,response_type:'code',redirect_uri:REDIRECT,code_challenge:b64url(new Uint8Array(hash)),code_challenge_method:'S256',token_access_type:'offline',scope:'files.metadata.read files.content.read files.content.write files.metadata.write',state,force_reapprove:'true'}))u.searchParams.set(key,value);
 location.assign(u.toString());
}
async function finishOAuth(){
 const u=new URL(location.href),code=u.searchParams.get('code'),state=u.searchParams.get('state'),error=u.searchParams.get('error');
 if(!code&&!error)return false;
 history.replaceState(history.state,'',location.pathname);
 let pk;try{pk=JSON.parse(sessionStorage.getItem(PKCE)||'null')}catch(_){pk=null}
 sessionStorage.removeItem(PKCE);
 if(!pk||!state||state!==pk.state||Date.now()-Number(pk.at)>10*60000)throw Error('A Dropbox-jóváhagyás biztonsági állapota nem egyezik. Indítsd újra.');
 if(error)throw Error('A Dropbox-jóváhagyás megszakadt: '+error);
 if(!/^[A-Za-z0-9._~-]{8,2048}$/.test(code||''))throw Error('Érvénytelen OAuth-válasz.');
 const resp=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,grant_type:'authorization_code',redirect_uri:REDIRECT,code_verifier:pk.verifier,client_id:APP_KEY})});
 if(!resp.ok)throw Error('A Dropbox-fiók engedélyezése nem sikerült ('+resp.status+').');
 const j=await resp.json();if(!j.refresh_token||!j.access_token)throw Error('A Dropbox nem adott tartós hozzáférést.');
 access=j.access_token;accessUntil=Date.now()+((Number(j.expires_in)||14400)-60)*1000;selectedStorage=OWN_TOKEN;
 const a=await apiAccount();
 if(String(a.email||'').toLowerCase()!==GMAIL){selectedStorage=null;access=null;throw Error('Nem a Gmail-forrásfiókot választottad: '+String(a.email||'ismeretlen')+'. A kapcsolat nem lett eltárolva.');}
 localStorage.setItem(OWN_TOKEN,JSON.stringify({refresh_token:j.refresh_token,access_token:j.access_token,expires_at:accessUntil,account_id:a.account_id}));
 return true;
}
$('connectBtn').addEventListener('click',()=>startOAuth().catch(e=>status('accountStatus',failText(e),'error')));
$('checkBtn').addEventListener('click',inspectClicked);
$('sendBtn').addEventListener('click',send);
$('statusBtn').addEventListener('click',checkStatus);
$('suffix').addEventListener('input',enableButtons);
$('confirm').addEventListener('change',enableButtons);
enableButtons();
finishOAuth().then(inspectClicked).catch(e=>{status('accountStatus',failText(e),'error');enableButtons()});
})();
