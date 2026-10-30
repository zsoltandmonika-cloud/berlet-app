/* SH9 Start Page: simple automatic, read-only, signed-release OTA indicator.
 * Green = this installed HH One build is up-to-date vs VERIFIED manifest.
 * Amber blink = NEWER signed OTA advertised for this actual phone owner.
 * Gray = unknown/unverified (never misrepresent app or GPS health).
 * No background polling, no APK download, no auth or permission changes.
 */
(function(w,d){
 'use strict';
 const el=d.getElementById('sh9OtaIndicatorV1043');
 const detail=d.getElementById('sh9OtaStateV1043');
 if(!el||!detail)return;
 const MANIFEST='../healthhub/data/bridge-ota.json';
 const DIRECT='healthhubconnect://settings?ota=install';
 const SETTINGS='healthhubconnect://settings';
 const SIX_HOURS=6*60*60*1000;
 const qs=new URLSearchParams(w.location.search);
 const build=Number(qs.get('hhBuildCode'));
 const owner=qs.get('hhOwner');
 const native=qs.get('sh9native')==='1';
 const known=native&&Number.isInteger(build)&&build>0&&
   (owner==='zsolt'||owner==='monika');
 let last=0,busy=false;
 function state(name,message,link){
  el.dataset.state=name;
  el.title=message;
  el.setAttribute('aria-label',message);
  el.href=link||SETTINGS;
  detail.textContent=message;
  el.querySelector('.sh9-ota-label-v1043').textContent=
    name==='update'?'UPDATE':name==='ok'?'':'?';
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
  last=Date.now();busy=true;
  if(!known){
   state('unknown','HH One verziója ezen a felületen nem ellenőrizhető. Nyisd meg a HH One alkalmazást.',SETTINGS);
   busy=false;return;
  }
  try{
   const r=await w.fetch(MANIFEST,{cache:'no-store'});
   if(!r.ok)throw Error('OTA manifest HTTP '+r.status);
   const m=await r.json();
   if(!valid(m))throw Error('Nem ellenőrizhető aláírt OTA kiadás.');
   if(m.versionCode>build&&m.rolloutProfiles.includes(owner)){
    state('update','SYSTEM UPDATE AVAILABLE · HH One v'+m.version+
      ' · nyomj ide a telepítéshez.',build>=38?DIRECT:SETTINGS);
   }else if(m.versionCode<=build){
    state('ok','HH One naprakész · telepített build '+build+
      ' · OTA v'+m.version+'. Ez nem GPS-állapotjelzés.',SETTINGS);
   }else{
    state('unknown','Nincs ehhez a profilhoz jóváhagyott új kiadás.',SETTINGS);
   }
  }catch(_){
   state('unknown','OTA-állapot nem ellenőrizhető. Koppints a HH One frissítőjének megnyitásához.',SETTINGS);
  }finally{busy=false}
 }
 state('unknown','HH One frissítés ellenőrzése…',SETTINGS);
 void check(false);
 d.addEventListener('visibilitychange',()=>{if(!d.hidden)void check(false)});
 w.addEventListener('pageshow',()=>void check(false));
})(window,document);
