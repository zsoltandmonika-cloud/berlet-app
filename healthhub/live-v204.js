(function(){
'use strict';

/* HealthHub v1.104
   Cloud Vault foundation.
   Dropbox is the primary cloud provider when connected; current GitHub-hosted
   daily JSON stays as a safe fallback until the cloud generator is migrated.
   No Dropbox token or health data is ever committed to GitHub. */

const CFG_KEY='hh-cloud-vault-config-v1';
const CACHE_KEY='hh-cloud-daily-cache-v1';
const AUTH_VERIFIER='hh-dropbox-pkce-verifier';
const AUTH_STATE='hh-dropbox-oauth-state';
const AUTH_APPKEY='hh-dropbox-oauth-appkey';
const TOKEN_DB='healthhub-cloud-auth-v1';
const TOKEN_STORE='tokens';
const DROPBOX_TOKEN_KEY='dropbox';
const PROVIDER='dropbox';

const LAYOUT={
  root:'/HealthHub',
  manifest:'/HealthHub/manifest.json',
  dailySpark:'/HealthHub/daily/daily-spark.json',
  dailyBriefing:'/HealthHub/daily/daily-briefing.json',
  profiles:'/HealthHub/profiles',
  documents:'/HealthHub/documents',
  explanations:'/HealthHub/explanations',
  devices:'/HealthHub/devices',
  measurements:'/HealthHub/measurements',
  appointments:'/HealthHub/appointments',
  sync:'/HealthHub/sync'
};

const FOLDERS=[
  '/HealthHub',
  '/HealthHub/daily',
  '/HealthHub/profiles',
  '/HealthHub/documents',
  '/HealthHub/explanations',
  '/HealthHub/devices',
  '/HealthHub/measurements',
  '/HealthHub/appointments',
  '/HealthHub/sync'
];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(_){}}
function todayISO(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function cfg(){
  try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(_){return {}}
}
function saveCfg(x){localStorage.setItem(CFG_KEY,JSON.stringify(x||{}))}
function redirectUri(){return location.origin+location.pathname}
function randomUrlSafe(bytes=32){
  const a=new Uint8Array(bytes);crypto.getRandomValues(a);
  let s='';a.forEach(b=>s+=String.fromCharCode(b));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function sha256UrlSafe(s){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  let raw='';new Uint8Array(b).forEach(x=>raw+=String.fromCharCode(x));
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function openTokenDb(){
  return new Promise((ok,no)=>{
    const r=indexedDB.open(TOKEN_DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(TOKEN_STORE))r.result.createObjectStore(TOKEN_STORE,{keyPath:'id'})};
    r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
  });
}
function reqP(r){return new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function tokenGet(){
  const db=await openTokenDb();try{return await reqP(db.transaction(TOKEN_STORE,'readonly').objectStore(TOKEN_STORE).get(DROPBOX_TOKEN_KEY))}finally{db.close()}
}
async function tokenPut(t){
  const db=await openTokenDb();try{await reqP(db.transaction(TOKEN_STORE,'readwrite').objectStore(TOKEN_STORE).put(Object.assign({id:DROPBOX_TOKEN_KEY},t))}finally{db.close()}
}
async function tokenDelete(){
  const db=await openTokenDb();try{await reqP(db.transaction(TOKEN_STORE,'readwrite').objectStore(TOKEN_STORE).delete(DROPBOX_TOKEN_KEY))}finally{db.close()}
}

async function exchangeCode(code,verifier,appKey){
  const body=new URLSearchParams({
    code,
    grant_type:'authorization_code',
    code_verifier:verifier,
    client_id:appKey,
    redirect_uri:redirectUri()
  });
  const r=await fetch('https://api.dropboxapi.com/oauth2/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.error||('Dropbox token HTTP '+r.status));
  await tokenPut({
    accessToken:j.access_token,
    refreshToken:j.refresh_token||'',
    expiresAt:Date.now()+Math.max(60,(j.expires_in||14400)-60)*1000,
    accountId:j.account_id||'',
    scope:j.scope||''
  });
  const c=cfg();c.provider=PROVIDER;c.appKey=appKey;c.connectedAt=new Date().toISOString();saveCfg(c);
}

async function accessToken(){
  const c=cfg(),t=await tokenGet();
  if(!c.appKey||!t)return null;
  if(t.accessToken&&t.expiresAt&&Date.now()<t.expiresAt)return t.accessToken;
  if(!t.refreshToken)return null;

  const body=new URLSearchParams({
    grant_type:'refresh_token',
    refresh_token:t.refreshToken,
    client_id:c.appKey
  });
  const r=await fetch('https://api.dropboxapi.com/oauth2/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.error||('Dropbox refresh HTTP '+r.status));
  const next=Object.assign({},t,{
    accessToken:j.access_token,
    expiresAt:Date.now()+Math.max(60,(j.expires_in||14400)-60)*1000,
    scope:j.scope||t.scope||''
  });
  await tokenPut(next);
  return next.accessToken;
}

async function dbxApi(endpoint,arg){
  const tok=await accessToken();if(!tok)throw new Error('Dropbox nincs csatlakoztatva.');
  const r=await fetch('https://api.dropboxapi.com/2/'+endpoint,{
    method:'POST',
    headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},
    body:JSON.stringify(arg||{})
  });
  const txt=await r.text();let j={};try{j=txt?JSON.parse(txt):{}}catch(_){}
  if(!r.ok){const e=new Error(j.error_summary||j.error?.['.tag']||('Dropbox HTTP '+r.status));e.status=r.status;e.payload=j;throw e}
  return j;
}
async function ensureFolder(path){
  try{await dbxApi('files/create_folder_v2',{path,autorename:false})}
  catch(e){if(e.status===409&&/conflict/i.test(JSON.stringify(e.payload||e.message)))return;throw e}
}
async function uploadBytes(path,bytes,mode='overwrite'){
  const tok=await accessToken();if(!tok)throw new Error('Dropbox nincs csatlakoztatva.');
  const arg={path,mode,autorename:false,mute:true,strict_conflict:false};
  const r=await fetch('https://content.dropboxapi.com/2/files/upload',{
    method:'POST',
    headers:{
      Authorization:'Bearer '+tok,
      'Content-Type':'application/octet-stream',
      'Dropbox-API-Arg':JSON.stringify(arg)
    },
    body:bytes
  });
  const txt=await r.text();let j={};try{j=txt?JSON.parse(txt):{}}catch(_){}
  if(!r.ok){const e=new Error(j.error_summary||('Dropbox upload HTTP '+r.status));e.status=r.status;e.payload=j;throw e}
  return j;
}
async function uploadJson(path,data){return uploadBytes(path,new TextEncoder().encode(JSON.stringify(data,null,2)+'\n'))}
async function downloadJson(path){
  const tok=await accessToken();if(!tok)throw new Error('Dropbox nincs csatlakoztatva.');
  const r=await fetch('https://content.dropboxapi.com/2/files/download',{
    method:'POST',
    headers:{Authorization:'Bearer '+tok,'Dropbox-API-Arg':JSON.stringify({path})}
  });
  if(!r.ok){
    const txt=await r.text();let j={};try{j=JSON.parse(txt)}catch(_){}
    const e=new Error(j.error_summary||('Dropbox download HTTP '+r.status));e.status=r.status;e.payload=j;throw e;
  }
  return r.json();
}

async function connected(){
  try{return !!(cfg().appKey&&(await tokenGet())?.refreshToken)}catch(_){return false}
}
function cacheRead(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch(_){return {}}
}
function cachePut(kind,data,source){
  const c=cacheRead();c[kind]={data,source:source||'unknown',cachedAt:new Date().toISOString()};localStorage.setItem(CACHE_KEY,JSON.stringify(c));
}
function validToday(x){return !!(x&&x.date===todayISO())}

async function repoJson(rel){
  const r=await fetch(rel+'?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

/* Daily Spark can self-heal without any scheduler. This mirrors the existing
   API-free generator and writes today's result to Dropbox when connected. */
const SPARK={
  focus:[
    'Válassz ki egyetlen ügyet, amely ma valóban számít, és vidd el egy konkrét következő lépésig.',
    'A mai nap akkor lesz könnyebb, ha a három fontos feladatból először a legkisebb bizonytalanságút zárod le.',
    'Ne próbálj mindent egyszerre optimalizálni. Egy jól befejezett dolog ma többet ér három félkésznél.',
    'Egy rövid rendrakás a teendők között meglepően sok mentális helyet szabadíthat fel.',
    'A fókusz ma nem több erőfeszítést jelent, hanem kevesebb felesleges váltást.'
  ],
  workMoney:[
    'A részletek ma segítenek. Egy rövid ellenőrzés vagy pontosítás megelőzhet egy fölösleges kört.',
    'Az egyszerű, jól ellenőrizhető megoldás ma erősebb, mint a túl sok feltételre épített terv.',
    'Egy kis adminisztratív rendrakás később időt és idegeskedést spórolhat.',
    'A mai döntéseknél különítsd el azt, ami sürgős attól, ami csak hangos.',
    'A jó kompromisszum ma az, amelyik később is könnyen visszaellenőrizhető.'
  ],
  relationships:[
    'A tömör, egyenes kommunikáció most könnyebben célba ér, mint a túlmagyarázás.',
    'Egy spontán beszélgetés könnyen közelebb hozhat valakit, ha nem akarod előre irányítani.',
    'Ma érdemes egy fél mondattal többet kérdezni, mielőtt következtetsz.',
    'A figyelem most többet adhat a másiknak, mint bármilyen nagy gesztus.',
    'Egy kisebb félreértést érdemes gyorsan tisztázni, mielőtt önálló életet kezd.'
  ],
  energy:[
    'Dolgozz rövidebb, fókuszált blokkokban, majd válts környezetet vagy mozogj pár percet.',
    'A változatosság segít. Egy másik környezet vagy rövid séta gyorsan visszahozhatja a lendületet.',
    'A nap közepén egy rövid szünet többet érhet, mint még egy erőből végigvitt óra.',
    'Ne várd meg, amíg teljesen elfogy a lendület. Egy kis váltás időben sokat számít.',
    'A tempó ma fontosabb, mint a sebesség: legyen benne ritmus és pihenő is.'
  ],
  evening:[
    'Az este akkor lesz igazán pihentető, ha egy lezárt nap érzésével érkezel meg hozzá.',
    'Valami könnyű és inspiráló program jobban feltölt, mint még egy feladat kipipálása.',
    'Az esti órákban hagyj egy kis helyet valaminek, aminek semmi haszna nincs, csak jólesik.',
    'Egy nyugodtabb este ma többet adhat, mint egy utolsó nagy nekifutás.',
    'Zárd le a napot egyetlen rövid holnapi jegyzettel, aztán hagyd békén a teendőlistát.'
  ],
  lenaThought:[
    'A haladás néha nem látványos. Néha csak annyi, hogy eggyel kevesebb nyitott szál marad.',
    'A jó ötletek ritkán kérnek engedélyt. Érdemes észrevenni őket, mielőtt továbbmennek.',
    'Nem minden problémának kell ma teljes megoldás. Néha a következő jó lépés bőven elég.',
    'A tisztább döntés gyakran abból születik, amit kihagysz, nem abból, amit még hozzáadsz.',
    'A nap végén az számít, mi lett egyszerűbb, nem az, hány dolgot mozgattál meg.'
  ]
};
const HEADLINES=[
  'Ma a tiszta prioritás és egy jól időzített döntés hozhat nyugodtabb ritmust.',
  'Egy egyszerűbb megközelítés ma többet érhet, mint egy túlkomplikált terv.',
  'A mai nap akkor működik jól, ha a fontos dolgoknak valódi helyet hagysz.',
  'Egy kis rend, egy őszinte mondat és egy lezárt feladat meglepően sokat adhat a naphoz.'
];
function hash(s){
  let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;
}
function pick(seed,a){return a[hash(seed)%a.length]}
function sparkProfile(date,name,sign){
  const base=date+':'+name,s={};Object.keys(SPARK).forEach(k=>s[k]=pick(base+':'+k,SPARK[k]));
  return {sign,headline:pick(base+':headline',HEADLINES),sections:s};
}
function generateLocalSpark(){
  const date=todayISO(),now=new Date();
  return {
    schemaVersion:1,date,generatedAt:now.toISOString(),
    cloudGenerated:'healthhub-local-self-heal',
    profiles:{
      zsolt:sparkProfile(date,'zsolt','Szűz'),
      monika:sparkProfile(date,'monika','Vízöntő')
    }
  };
}

async function cloudDaily(kind,path,fallbackRel){
  const cache=cacheRead()[kind]?.data;
  if(await connected()){
    try{
      const cloud=await downloadJson(path);
      if(validToday(cloud)){cachePut(kind,cloud,'dropbox');return {data:cloud,source:'dropbox'}}
    }catch(e){if(e.status!==409)console.warn('HealthHub Dropbox daily read',kind,e)}
  }
  if(kind==='spark'){
    const spark=generateLocalSpark();
    cachePut(kind,spark,'local-self-heal');
    if(await connected()){
      try{await uploadJson(path,spark);cachePut(kind,spark,'dropbox-self-heal')}catch(e){console.warn('HealthHub Dropbox Spark write',e)}
    }
    return {data:spark,source:'local-self-heal'};
  }
  try{
    const repo=await repoJson(fallbackRel);
    if(validToday(repo)){
      cachePut(kind,repo,'github-fallback');
      if(await connected()){try{await uploadJson(path,repo)}catch(e){console.warn('HealthHub Dropbox migration write',kind,e)}}
      return {data:repo,source:'github-fallback'};
    }
  }catch(e){console.warn('HealthHub repo fallback',kind,e)}
  if(cache)return {data:cache,source:'local-cache'};
  try{
    const repo=await repoJson(fallbackRel);cachePut(kind,repo,'github-stale-fallback');return {data:repo,source:'github-stale-fallback'};
  }catch(_){return {data:null,source:'none'}}
}

async function loadDailyCloudFirst(){
  const [s,b]=await Promise.all([
    cloudDaily('spark',LAYOUT.dailySpark,'./data/daily-spark.json'),
    cloudDaily('briefing',LAYOUT.dailyBriefing,'./data/daily-briefing.json')
  ]);
  try{
    if(s.data){dailySparkData=s.data;typeof renderDailySpark==='function'&&renderDailySpark()}
    if(b.data){briefingData=b.data;typeof renderBriefing==='function'&&renderBriefing()}
    document.documentElement.dataset.hhDailySparkSource=s.source;
    document.documentElement.dataset.hhDailyBriefingSource=b.source;
  }catch(e){console.warn('HealthHub daily render',e)}
}

async function initVault(){
  for(const p of FOLDERS)await ensureFolder(p);
  const manifest={
    schema:'healthhub-cloud-vault-v1',
    provider:'dropbox',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    paths:LAYOUT,
    privacy:{
      repositoryContainsPrivateHealthData:false,
      cloudVaultContainsPrivateHealthData:true,
      localCache:'IndexedDB'
    }
  };
  await uploadJson(LAYOUT.manifest,manifest);

  /* Seed cloud with the current daily files. Spark is always repaired to today. */
  const spark=generateLocalSpark();
  await uploadJson(LAYOUT.dailySpark,spark);
  try{const brief=await repoJson('./data/daily-briefing.json');await uploadJson(LAYOUT.dailyBriefing,brief)}catch(_){}
  return manifest;
}

async function startDropboxAuth(appKey){
  appKey=String(appKey||'').trim();
  if(!appKey)throw new Error('Dropbox App Key szükséges.');
  const verifier=randomUrlSafe(48),challenge=await sha256UrlSafe(verifier),state=randomUrlSafe(24);
  sessionStorage.setItem(AUTH_VERIFIER,verifier);sessionStorage.setItem(AUTH_STATE,state);sessionStorage.setItem(AUTH_APPKEY,appKey);
  const u=new URL('https://www.dropbox.com/oauth2/authorize');
  u.searchParams.set('client_id',appKey);
  u.searchParams.set('response_type','code');
  u.searchParams.set('redirect_uri',redirectUri());
  u.searchParams.set('code_challenge',challenge);
  u.searchParams.set('code_challenge_method','S256');
  u.searchParams.set('token_access_type','offline');
  u.searchParams.set('scope','files.content.read files.content.write');
  u.searchParams.set('state',state);
  location.href=u.toString();
}

async function handleOauthCallback(){
  const u=new URL(location.href),code=u.searchParams.get('code'),state=u.searchParams.get('state'),err=u.searchParams.get('error');
  if(!code&&!err)return false;
  if(err){history.replaceState({},'',redirectUri());toastMsg('Dropbox kapcsolat elutasítva.');return true}
  const expected=sessionStorage.getItem(AUTH_STATE),verifier=sessionStorage.getItem(AUTH_VERIFIER),appKey=sessionStorage.getItem(AUTH_APPKEY);
  if(!expected||state!==expected||!verifier||!appKey){history.replaceState({},'',redirectUri());throw new Error('Dropbox OAuth állapotellenőrzés sikertelen.')}
  await exchangeCode(code,verifier,appKey);
  sessionStorage.removeItem(AUTH_STATE);sessionStorage.removeItem(AUTH_VERIFIER);sessionStorage.removeItem(AUTH_APPKEY);
  history.replaceState({},'',redirectUri());
  await initVault();
  toastMsg('Dropbox Cloud Vault csatlakoztatva');
  await loadDailyCloudFirst();
  return true;
}

function style(){
  if(document.getElementById('hh-cloud-vault-style'))return;
  const s=document.createElement('style');s.id='hh-cloud-vault-style';s.textContent=
  '.hhCloudCard{border:1px solid #dcebf0;background:linear-gradient(145deg,#f8fcff,#fff)!important}.hhCloudHead{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.hhCloudStatus{font-size:7px;font-weight:900;border-radius:999px;padding:4px 7px;background:#eef4f7;color:#587286;white-space:nowrap}.hhCloudStatus.on{background:#e8faf3;color:#168468}.hhCloudGrid{display:grid;gap:7px;margin-top:9px}.hhCloudGrid input{width:100%;box-sizing:border-box;border:1px solid #dae6ec;border-radius:12px;padding:9px 10px;font-size:9px;color:#173f61;background:white}.hhCloudButtons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.hhCloudButtons button,.hhCloudLink{border:0;border-radius:12px;padding:9px;font-size:8px;font-weight:850;text-align:center;text-decoration:none}.hhCloudPrimary{background:#1677ff;color:white}.hhCloudSecondary{background:#eef5fa;color:#315c79}.hhCloudDanger{background:#fff1f3;color:#c84160}.hhCloudPath{font-size:7.5px;color:#71889a;line-height:1.45;background:#f5f9fb;border-radius:11px;padding:8px;word-break:break-word}@media(max-width:430px){.hhCloudButtons{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(s);
}

async function cloudCard(){
  const on=await connected(),c=cfg();
  return '<div class="hrSectionCard hhCloudCard" id="hhCloudVaultCard">'+
    '<div class="hhCloudHead"><div><h3 style="margin:0 0 3px">☁️ HealthHub Cloud Vault</h3><small style="font-size:8px;color:#71889a">Központi Dropbox tár + helyi cache. A Daily Spark és Morning Briefing már erre a rétegre van előkészítve.</small></div><span class="hhCloudStatus '+(on?'on':'')+'">'+(on?'Dropbox kapcsolva':'nincs kapcsolat')+'</span></div>'+
    '<div class="hhCloudGrid">'+
      (on
       ?'<div class="hhCloudPath">Cloud root: <b>/HealthHub</b><br>Daily: /HealthHub/daily · Profiles · Documents · Explanations · Devices · Measurements · Appointments · Sync</div>'+
        '<div class="hhCloudButtons"><button class="hhCloudPrimary" onclick="hhCloudSyncDaily()">↻ Daily sync</button><button class="hhCloudSecondary" onclick="hhCloudInitVault()">Vault ellenőrzése</button><button class="hhCloudDanger" onclick="hhCloudDisconnect()">Dropbox leválasztása</button><button class="hhCloudSecondary" onclick="open(\'https://www.dropbox.com/home/Apps\',\'_blank\')">Dropbox megnyitása</button></div>'
       :'<label style="font-size:8px;font-weight:850;color:#365f7a">Dropbox App Key<input id="hhDropboxAppKey" autocomplete="off" spellcheck="false" value="'+esc(c.appKey||'')+'" placeholder="App Console → App key"></label>'+
        '<div class="hhCloudButtons"><button class="hhCloudPrimary" onclick="hhCloudConnect()">Dropbox csatlakoztatása</button><a class="hhCloudSecondary hhCloudLink" href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener">Dropbox App Console</a></div>'+
        '<div class="privacyNote">Ajánlott beállítás: Scoped access + App folder, jogosultságok: files.content.read és files.content.write. A redirect URI: <b>'+esc(redirectUri())+'</b></div>')+
    '</div></div>';
}
async function injectCard(){
  if(window.healthSectionKind!=='more')return;
  const root=document.getElementById('healthSubContent');if(!root||document.getElementById('hhCloudVaultCard'))return;
  root.insertAdjacentHTML('afterbegin',await cloudCard());
}

window.hhCloudConnect=async function(){
  try{await startDropboxAuth(document.getElementById('hhDropboxAppKey')?.value)}catch(e){console.error(e);toastMsg(e.message||'Dropbox kapcsolat hiba')}
};
window.hhCloudDisconnect=async function(){
  if(!confirm('Leválasztod ezt a készüléket a Dropbox Cloud Vaultról? A Dropboxban tárolt HealthHub adatok nem törlődnek.'))return;
  await tokenDelete();const c=cfg();delete c.connectedAt;saveCfg(c);toastMsg('Dropbox leválasztva');if(window.renderHealthSection)await window.renderHealthSection();
};
window.hhCloudInitVault=async function(){
  try{await initVault();toastMsg('Dropbox Vault rendben');await loadDailyCloudFirst()}catch(e){console.error(e);toastMsg('Dropbox Vault hiba: '+(e.message||e))}
};
window.hhCloudSyncDaily=async function(){
  try{await loadDailyCloudFirst();toastMsg('Daily tartalom szinkronizálva')}catch(e){console.error(e);toastMsg('Daily sync hiba: '+(e.message||e))}
};

window.HHCloudVault={
  provider:PROVIDER,
  layout:LAYOUT,
  connected,
  getJson:downloadJson,
  putJson:uploadJson,
  init:initVault,
  syncDaily:loadDailyCloudFirst,
  generateLocalSpark
};

/* Replace daily content loading with cloud-first resolution, while preserving a
   fully working fallback before Dropbox is connected. */
window.loadDailyContent=loadDailyCloudFirst;

const previousRender=window.renderHealthSection;
if(typeof previousRender==='function'){
  window.renderHealthSection=async function(){
    const r=await previousRender.apply(this,arguments);
    await injectCard();
    return r;
  };
}

style();
handleOauthCallback().catch(e=>{console.error(e);toastMsg('Dropbox OAuth hiba: '+(e.message||e))});
setTimeout(loadDailyCloudFirst,250);
setInterval(loadDailyCloudFirst,15*60*1000);

document.documentElement.dataset.healthhubCloudVault='1.104';
window.HH_LIVE_BUILD='v1.104-cloud-vault';
})();