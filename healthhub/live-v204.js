(function(){
'use strict';

/* HealthHub v1.105 — shared Dropbox Cloud Vault daily layer
   Uses the canonical Dropbox connector from live-v161.
   One OAuth connection, one token store, one App Folder. */

var CACHE_KEY='hh-cloud-daily-cache-v2';
var INIT_KEY='hh-cloud-vault-init-v1';
var LAYOUT={
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
var FOLDERS=[
  '/HealthHub','/HealthHub/daily','/HealthHub/profiles','/HealthHub/documents',
  '/HealthHub/explanations','/HealthHub/devices','/HealthHub/measurements',
  '/HealthHub/appointments','/HealthHub/sync'
];

function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function vault(){return window.HH_DROPBOX_VAULT||null}
function connected(){var v=vault();try{return !!(v&&v.connected&&v.connected())}catch(e){return false}}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function cacheRead(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch(e){return {}}}
function cachePut(kind,data,source){var c=cacheRead();c[kind]={data:data,source:source||'unknown',cachedAt:new Date().toISOString()};localStorage.setItem(CACHE_KEY,JSON.stringify(c))}
function validToday(x){return !!(x&&x.date===todayISO())}
async function repoJson(rel){var r=await fetch(rel+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
async function uploadJson(path,data){var v=vault();if(!v||!v.uploadJson)throw new Error('Dropbox Vault API nem elérhető.');return await v.uploadJson(path,data)}
async function downloadJson(path){var v=vault();if(!v||!v.downloadJson)throw new Error('Dropbox Vault API nem elérhető.');return await v.downloadJson(path)}

async function dbxApi(endpoint,arg){
 var v=vault();if(!v||!v.accessToken)throw new Error('Dropbox Vault API nem elérhető.');
 var token=await v.accessToken();
 var r=await fetch('https://api.dropboxapi.com/2/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(arg||{})});
 var txt=await r.text(),j={};try{j=txt?JSON.parse(txt):{}}catch(e){}
 if(!r.ok){var er=new Error(j.error_summary||('Dropbox HTTP '+r.status));er.status=r.status;er.payload=j;throw er}
 return j;
}
async function ensureFolder(path){
 try{await dbxApi('files/create_folder_v2',{path:path,autorename:false})}
 catch(e){if(e.status===409&&/conflict/i.test(JSON.stringify(e.payload||e.message)))return;throw e}
}

var SPARK={
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
var HEADLINES=[
 'Ma a tiszta prioritás és egy jól időzített döntés hozhat nyugodtabb ritmust.',
 'Egy egyszerűbb megközelítés ma többet érhet, mint egy túlkomplikált terv.',
 'A mai nap akkor működik jól, ha a fontos dolgoknak valódi helyet hagysz.',
 'Egy kis rend, egy őszinte mondat és egy lezárt feladat meglepően sokat adhat a naphoz.'
];
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function pick(seed,a){return a[hash(seed)%a.length]}
function sparkProfile(date,name,sign){var base=date+':'+name,s={};Object.keys(SPARK).forEach(function(k){s[k]=pick(base+':'+k,SPARK[k])});return {sign:sign,headline:pick(base+':headline',HEADLINES),sections:s}}
function generateLocalSpark(){
 var date=todayISO();
 return {schemaVersion:1,date:date,generatedAt:new Date().toISOString(),cloudGenerated:'healthhub-local-self-heal',profiles:{zsolt:sparkProfile(date,'zsolt','Szűz'),monika:sparkProfile(date,'monika','Vízöntő')}};
}

async function cloudDaily(kind,path,fallbackRel){
 var cache=cacheRead()[kind]&&cacheRead()[kind].data;
 if(connected()){
  try{
   var cloud=await downloadJson(path);
   if(validToday(cloud)){cachePut(kind,cloud,'dropbox');return {data:cloud,source:'dropbox'}}
  }catch(e){if(e.status!==409)console.warn('HealthHub Dropbox daily read',kind,e)}
 }
 if(kind==='spark'){
  var spark=generateLocalSpark();cachePut(kind,spark,'local-self-heal');
  if(connected()){try{await uploadJson(path,spark);cachePut(kind,spark,'dropbox-self-heal')}catch(e){console.warn('HealthHub Dropbox Spark write',e)}}
  return {data:spark,source:'local-self-heal'};
 }
 try{
  var repo=await repoJson(fallbackRel);
  if(validToday(repo)){
   cachePut(kind,repo,'github-fallback');
   if(connected()){try{await uploadJson(path,repo)}catch(e){console.warn('HealthHub Dropbox migration write',kind,e)}}
   return {data:repo,source:'github-fallback'};
  }
 }catch(e){console.warn('HealthHub repo fallback',kind,e)}
 if(cache)return {data:cache,source:'local-cache'};
 try{
  var stale=await repoJson(fallbackRel);cachePut(kind,stale,'github-stale-fallback');return {data:stale,source:'github-stale-fallback'}
 }catch(e){return {data:null,source:'none'}}
}

async function loadDailyCloudFirst(){
 var pair=await Promise.all([
  cloudDaily('spark',LAYOUT.dailySpark,'./data/daily-spark.json'),
  cloudDaily('briefing',LAYOUT.dailyBriefing,'./data/daily-briefing.json')
 ]);
 var s=pair[0],b=pair[1];
 try{
  if(s.data){dailySparkData=s.data;if(typeof renderDailySpark==='function')renderDailySpark()}
  if(b.data){briefingData=b.data;if(typeof renderBriefing==='function')renderBriefing()}
  document.documentElement.dataset.hhDailySparkSource=s.source;
  document.documentElement.dataset.hhDailyBriefingSource=b.source;
 }catch(e){console.warn('HealthHub daily render',e)}
 decorateDailyState();
}

async function initVault(){
 if(!connected())return false;
 for(var i=0;i<FOLDERS.length;i++)await ensureFolder(FOLDERS[i]);
 var manifest={
  schema:'healthhub-cloud-vault-v1',provider:'dropbox',updatedAt:new Date().toISOString(),paths:LAYOUT,
  privacy:{repositoryContainsPrivateHealthData:false,cloudVaultContainsPrivateHealthData:true,localCache:'IndexedDB'}
 };
 await uploadJson(LAYOUT.manifest,manifest);
 var spark=generateLocalSpark();await uploadJson(LAYOUT.dailySpark,spark);
 try{var brief=await repoJson('./data/daily-briefing.json');if(brief)await uploadJson(LAYOUT.dailyBriefing,brief)}catch(e){}
 localStorage.setItem(INIT_KEY,todayISO());
 return true;
}

function decorateDailyState(){
 var card=document.getElementById('hhDropboxVaultCard');if(!card)return;
 var old=document.getElementById('hhCloudDailyState');if(old)old.remove();
 var c=cacheRead(),s=c.spark||{},b=c.briefing||{},box=document.createElement('div');
 box.id='hhCloudDailyState';box.className='hhDbxMeta';
 box.style.marginTop='7px';box.style.paddingTop='7px';box.style.borderTop='1px solid #dce8ef';
 box.innerHTML='<b style="color:#31536f">Daily Cloud:</b> Spark '+(s.source||'—')+' · Briefing '+(b.source||'—')+' <button class="hhDbxBtn alt" style="padding:4px 7px;margin-left:5px" onclick="hhCloudSyncDaily()">↻</button>';
 card.appendChild(box);
}

window.hhCloudSyncDaily=function(){loadDailyCloudFirst().then(function(){toast('Daily Cloud szinkronizálva')}).catch(function(e){console.error(e);toast(e.message||'Daily Cloud sync hiba')})};
window.hhCloudInitVault=function(){initVault().then(function(){toast('Dropbox Cloud Vault rendben');return loadDailyCloudFirst()}).catch(function(e){console.error(e);toast(e.message||'Dropbox Cloud Vault hiba')})};
window.HHCloudVault={layout:LAYOUT,connected:connected,init:initVault,syncDaily:loadDailyCloudFirst,generateLocalSpark:generateLocalSpark};

window.loadDailyContent=loadDailyCloudFirst;

var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){
 var x=await prev.apply(this,arguments);
 setTimeout(decorateDailyState,0);
 return x;
};

setTimeout(function(){
 loadDailyCloudFirst();
 if(connected()&&localStorage.getItem(INIT_KEY)!==todayISO())initVault().then(loadDailyCloudFirst).catch(function(e){console.warn('HealthHub Vault init',e)});
},650);
setInterval(loadDailyCloudFirst,15*60*1000);
window.addEventListener('focus',function(){setTimeout(loadDailyCloudFirst,250)});

document.documentElement.dataset.healthhubCloudVault='1.105';
window.HH_LIVE_BUILD='v1.105-cloud-vault-shared';
})();