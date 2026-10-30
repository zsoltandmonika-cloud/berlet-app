/* SH9 Start Page: simple automatic, read-only, signed-release OTA indicator.
 * Green = this installed HH One build is up-to-date vs VERIFIED manifest.
 * Amber blink = NEWER signed OTA advertised for this actual phone owner.
 * Gray = unknown/unverified (never misrepresent app or GPS health).
 * No background polling, no automatic APK download, no auth or permission changes.
 * A user-visible manual failover offers an owner-eligible official signed release URL.
 */
(function(w,d){
 'use strict';
 const el=d.getElementById('sh9OtaIndicatorV1043');
 const detail=d.getElementById('sh9OtaStateV1043');
 const manual=d.getElementById('sh9OtaManualV1044');
 const manualClose=d.getElementById('sh9OtaManualCloseV1044');
 const manualStatus=d.getElementById('sh9OtaManualStatusV1044');
 const manualSettings=d.getElementById('sh9OtaManualSettingsV1044');
 const manualApk=d.getElementById('sh9OtaManualApkV1044');
 if(!el||!detail||!manual||!manualClose||!manualStatus||!manualSettings||!manualApk)return;
 const MANIFEST='../healthhub/data/bridge-ota.json';
 const DIRECT='healthhubconnect://settings?ota=install';
 const SETTINGS='healthhubconnect://settings';
 const SIX_HOURS=6*60*60*1000;
 const qs=new URLSearchParams(w.location.search);
 const queryBuild=Number(qs.get('hhBuildCode'));
 const queryOwner=qs.get('hhOwner');
 const queryHealth=qs.get('hhServiceHealth');
 const querySeen=Number(qs.get('hhServiceSeenAt'));
 const native=qs.get('sh9native')==='1';
 const trustedLaunch=native&&Number.isInteger(queryBuild)&&queryBuild>0&&
   (queryOwner==='zsolt'||queryOwner==='monika');
 const KEY='sh9-ota-native-session-v1043';
 const STATUS_MAX_AGE=10*60*1000;
 const allowedHealth=['ok','warning','unknown'];
 let cached=null;
 try{
   if(trustedLaunch){
     cached={build:queryBuild,owner:queryOwner,
       health:allowedHealth.includes(queryHealth)?queryHealth:'unknown',
       seenAt:Number.isFinite(querySeen)&&querySeen>0?querySeen:0};
     w.sessionStorage?.setItem(KEY,JSON.stringify(cached));
   }else{
     const raw=JSON.parse(w.sessionStorage?.getItem(KEY)||'null');
     if(raw&&Number.isInteger(raw.build)&&raw.build>0&&
       (raw.owner==='zsolt'||raw.owner==='monika'))cached=raw;
   }
 }catch(_){cached=trustedLaunch?{build:queryBuild,owner:queryOwner,
   health:allowedHealth.includes(queryHealth)?queryHealth:'unknown',seenAt:querySeen}:null}
 const build=cached?.build;
 const owner=cached?.owner;
 const known=!!cached;
 function nativeHealth(){
  const seen=Number(cached?.seenAt);
  if(!Number.isFinite(seen)||seen<=0||seen>Date.now()+5000||Date.now()-seen>STATUS_MAX_AGE)return 'unknown';
  return allowedHealth.includes(cached?.health)?cached.health:'unknown';
 }
 let last=0,busy=false,approvedRelease=null;
 function showManualFallback(){
  manual.hidden=false;
  // Only a known, newer release that passed exact signed-channel URL and
  // this phone owner's rollout gate may appear as a manual download.
  const canDownload=!!approvedRelease;
  manualApk.hidden=!canDownload;
  manualApk.href=canDownload?approvedRelease:'#';
  manualSettings.href=SETTINGS;
  manualStatus.textContent=canDownload?
   'Ha a gyors telepítés nem nyílt meg, a telefonodon válaszd a HH One frissítőt vagy a hivatalos APK kézi letöltését.':
   'A frissítés verziója ezen a telefonon nem igazolt. Nyisd meg a HH One saját frissítőjét; kézi APK-t csak ellenőrzött kiadásnál mutatunk.';
 }
 // One real tap launches the native installer. Manual failover appears ONLY
 // if the same page remains visible because Android did not open the handler.
 el.addEventListener('click',()=>{
  if(el.dataset.state!=='update')return;
  manual.hidden=true;
  w.setTimeout(()=>{
   if(!d.hidden&&el.dataset.state==='update')showManualFallback();
  },1800);
 });
 manualClose.addEventListener('click',()=>{manual.hidden=true;el.focus()});

 function state(name,message,link){
  el.dataset.state=name;
  el.title=message;
  el.setAttribute('aria-label',message);
  el.href=link||SETTINGS;
  detail.textContent=message;
  el.querySelector('.sh9-ota-label-v1043').textContent=
    name==='update'?'FRISSÍTÉS':name==='ok'?'':name==='warning'?'!':'?';
 }
 function valid(m){
  if(!m||m.schema!=='healthhub.connect.ota/1'||
   m.channel!=='signed-release'||m.applicationId!=='hu.zsoltmonika.healthhubbridge'||
   !Number.isInteger(m.versionCode)||m.versionCode<1||
   !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(m.version||'')||
   !/^[a-f0-9]{64}$/.test(m.sha256||'')||
   !Array.isArray(m.rolloutProfiles))return false;
  const link='https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/'+
    'healthhub-connect-ota-v'+m.version+'/HealthHub-Connect-v'+m.version+'-ota.apk';
  return m.downloadUrl===link;
 }
 async function check(force){
  if(busy||(!force&&Date.now()-last<SIX_HOURS))return;
  last=Date.now();busy=true;approvedRelease=null;
  manualApk.hidden=true;manualApk.href='#';
  if(!known){
   state('unknown','HH One verziója ezen a felületen nem ellenőrizhető. Nyisd meg a HH One alkalmazást.',SETTINGS);
   busy=false;return;
  }
  try{
   const r=await w.fetch(MANIFEST,{cache:'no-store'});
   if(!r.ok)throw Error('OTA manifest HTTP '+r.status);
   const m=await r.json();
   if(!valid(m))throw Error('Nem ellenőrizhető aláírt OTA kiadás.');
   const service=nativeHealth();
   if(m.versionCode>build&&m.rolloutProfiles.includes(owner)){
    approvedRelease=m.downloadUrl;
    state('update','FRISSÍTÉS ELÉRHETŐ · HH One v'+m.version+
      ' · egy koppintás a telepítéshez.',build>=38?DIRECT:SETTINGS);
   }else if(service==='warning'){
    state('warning','SH9 SERVICE NEEDS ATTENTION · Indításkor észlelt szolgáltatási hiba. Koppints a HH One diagnosztikához.',SETTINGS);
   }else if(m.versionCode<=build&&service==='ok'){
    state('ok','SH9 SYSTEM OK · HH One naprakész (build '+build+
      ') és a natív szolgáltatás az indításkor rendben volt. Nem folyamatos mérés.',SETTINGS);
   }else if(m.versionCode<=build){
    state('unknown','HH One naprakész · a natív szolgáltatás aktuális állapota még nem igazolt.',SETTINGS);
   }else{
    state('unknown','Nincs ehhez a profilhoz jóváhagyott új kiadás.',SETTINGS);
   }
  }catch(_){
   if(nativeHealth()==='warning')
    state('warning','SH9 SERVICE NEEDS ATTENTION · A natív szolgáltatás indításkor hibás volt; OTA állapot ismeretlen.',SETTINGS);
   else state('unknown','OTA-állapot nem ellenőrizhető. Koppints a HH One frissítőjének megnyitásához.',SETTINGS);
  }finally{busy=false}
 }
 // A still-open page must not keep showing yesterday's healthy boot snapshot.
 if(known&&Number.isFinite(Number(cached?.seenAt))&&cached.seenAt>0){
  const remaining=Math.max(0,STATUS_MAX_AGE-(Date.now()-cached.seenAt));
  w.setTimeout(()=>{
   if(el.dataset.state==='ok'&&nativeHealth()!=='ok')
    state('unknown','A telefon natív állapotjelentése már nem friss. Nyisd meg a HH One-t új ellenőrzéshez.',SETTINGS);
  },Math.min(remaining+1000,STATUS_MAX_AGE+1000));
 }
 state('unknown','HH One frissítés ellenőrzése…',SETTINGS);
 void check(false);
 d.addEventListener('visibilitychange',()=>{if(!d.hidden){
  if(el.dataset.state==='ok'&&nativeHealth()!=='ok')state('unknown','A natív szolgáltatás állapotellenőrzése elöregedett. Koppints a HH One-hoz.',SETTINGS);
  void check(false);
 }});
 w.addEventListener('pageshow',()=>{
  if(el.dataset.state==='ok'&&nativeHealth()!=='ok')state('unknown','A natív szolgáltatás ellenőrzése már nem friss. Koppints a HH One-hoz.',SETTINGS);
  void check(false);
 });
})(window,document);
