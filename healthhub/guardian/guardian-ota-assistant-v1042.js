/* Family Guard · HH One owner-controlled OTA assistant v1042.
 * No background downloads or installation. Reads one signed-release manifest
 * and 2 private device-registry files only on page entry / return, with a
 * bounded five-minute cooldown unless the admin presses "Ellenőrzés".
 */
(function(w,d){
 'use strict';
 const notice=d.getElementById('guardianOtaAlertV1042');
 const action=d.getElementById('guardianOtaOpenV1042');
 const check=d.getElementById('guardianOtaCheckV1042');
 const feedback=d.getElementById('guardianOtaStatusV1042');
 if(!notice||!action||!check||!feedback)return;
 const REG='/HealthHub/orchestrator/device-registry-v401.json';
 const PREFIX='/HealthHub/orchestrator/devices/';
 const CACHE_MS=5*60000; // foreground-only state freshness; no background polling
 const TOKEN='hh-dropbox-token-v2',APP='t68rmhh5f1l8d85';
 const OTA='../data/bridge-ota.json';
 let busy=false,lastRead=0,epoch=0,pendingRefresh=false,activeProfile=null,activeEpoch=0;
 const owner=()=>w.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 const label=p=>p==='monika'?'Mónika':'Zsolt';
 const authorized=()=>w.HH_GUARDIAN_LIVE_V785?.familyAuthorized===true;
 const validId=id=>typeof id==='string'&&/^android-[a-zA-Z0-9-]{1,83}$/.test(id);
 const noOffer=(message)=>{notice.hidden=true;notice.href='#';action.hidden=true;action.href='#';check.disabled=false;if(message)feedback.textContent=message};
 async function token(){
  const v=w.HH_DROPBOX_VAULT;
  if(v?.connected?.()&&typeof v.accessToken==='function')return v.accessToken();
  let t=null;
  try{t=JSON.parse(w.localStorage?.getItem(TOKEN)||'null')}catch(_){}
  if(!t||typeof t.refresh_token!=='string')throw Error('Dropbox Vault kapcsolat hiányzik ebben a böngészőben.');
  if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
  const res=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP})
  });
  if(!res.ok)throw Error('Dropbox kapcsolat megújítása sikertelen.');
  const body=await res.json();
  if(typeof body.access_token!=='string')throw Error('Dropbox hozzáférés nem használható.');
  t.access_token=body.access_token;
  t.expires_at=Date.now()+(Number(body.expires_in)||14400)*1000-60000;
  w.localStorage.setItem(TOKEN,JSON.stringify(t));
  return t.access_token;
 }
 async function read(path){
  const v=w.HH_DROPBOX_VAULT;
  if(v?.connected?.()&&typeof v.downloadJson==='function')return v.downloadJson(path);
  const t=await token();
  const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
   method:'POST',headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path})},cache:'no-store'
  });
  if(!r.ok)throw Error('Privát eszközadat nem elérhető: '+r.status);
  return r.json();
 }
 function validRelease(m,p){
  if(!m||m.schema!=='healthhub.connect.ota/1'||m.channel!=='signed-release'||
    m.applicationId!=='hu.zsoltmonika.healthhubbridge'||!Number.isInteger(m.versionCode)||
    !/^\d+\.\d+\.\d+$/.test(m.version||'')||!/^[a-f0-9]{64}$/.test(m.sha256||'')||
    !Array.isArray(m.rolloutProfiles)||!m.rolloutProfiles.includes(p))return false;
  const expected='https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/'+
   'healthhub-connect-ota-v'+m.version+'/HealthHub-Connect-v'+m.version+'-ota.apk';
  return m.downloadUrl===expected;
 }
 async function refresh(force){
  // A profile change during another phone's read must not silently disappear.
  // Queue exactly one read for the newly selected profile, not a polling loop.
  if(busy){
   if(force&&(owner()!==activeProfile||epoch!==activeEpoch))pendingRefresh=true;
   return;
  }
  if(!force&&Date.now()-lastRead<CACHE_MS)return;
  const generation=++epoch,p=owner();
  activeProfile=p;activeEpoch=generation;
  busy=true;lastRead=Date.now();check.disabled=true;noOffer('📦 HH One: kiadási verzió ellenőrzése…');
  try{
   // Live phone evidence is NOT gated by OTA rollout. This must work for
   // Mónika even while a signed APK pilot is available only to Zsolt.
   if(!authorized()){noOffer('Az eszközállapothoz hitelesített Family Live és Dropbox Vault szükséges.');return}
   const registry=await read(REG);
   const id=registry?.activePhones?.[p];
   if(registry?.schema!=='healthhub.device_registry/1'||!Array.isArray(registry.archived)||
      !validId(id)||registry.archived.includes(id))throw Error('A kijelölt fizikai telefon nincs hitelesítve.');
   const device=await read(PREFIX+id+'.json');
   if(generation!==epoch||p!==owner()||!authorized())return;
   if(device?.schema!=='healthhub.orchestrator.device/1'||device.deviceType!=='android'||
     device.deviceId!==id||device.activeProfile!==p)throw Error('A telefon és tulajdonosi profil nem egyezik.');
   // v1053 preview: pass along ONLY sanitized, already verified device state.
   // No new Dropbox/Supabase read, no extra polling, no device ID or tokens.
   if(d.documentElement?.dataset?.hhDevicePackPreview==='on'&&
      typeof w.CustomEvent==='function'&&typeof w.dispatchEvent==='function'){
    const net=device.networkStatus&&typeof device.networkStatus==='object'?device.networkStatus:{};
    const transport=['wifi','mobile','ethernet'].includes(net.transport)?net.transport:'unknown';
    w.dispatchEvent(new w.CustomEvent('hh-guardian-device-evidence-v1053',{detail:{
     profile:p,lastSeenAt:device.lastSeenAt,
     verifiedAt:new Date().toISOString(),
     // Only the coarse native build number, never a device identifier or token.
     buildCode:Number.isInteger(Number(device.buildCode))&&Number(device.buildCode)>0?Number(device.buildCode):null,
     networkStatus:{transport:transport,
       internetValidated:typeof net.internetValidated==='boolean'?net.internetValidated:null},
     // Native HH One reports only the radio on/off flag; no paired-device data.
     bluetoothEnabled:typeof device.bluetoothEnabled==='boolean'?device.bluetoothEnabled:null
    }}));
   }
   // Independent signed-release check. A profile without OTA rollout still
   // receives read-only Wi-Fi/Mobile/Bluetooth evidence above.
   const releaseRes=await w.fetch(OTA,{cache:'no-store'});
   if(!releaseRes.ok)throw Error('OTA verzióleíró nem érhető el.');
   const m=await releaseRes.json();
   if(!validRelease(m,p)){
    noOffer(label(p)+': telefonállapot lekérdezve; az OTA-frissítés erre a profilra még nem engedélyezett.');
    return;
   }
   const installed=Number(device.buildCode);
   const lastSeen=Date.parse(device.lastSeenAt||'');
   if(!Number.isFinite(lastSeen)||lastSeen>Date.now()+5000||Date.now()-lastSeen>20*60000){
    noOffer('A telefon utolsó jelentése régi. Nincs igazolt friss verzióállapot; a frissítés manuálisan ellenőrizhető a HH One-ban.');
    return;
   }
   if(!Number.isInteger(installed)||installed<1){noOffer('A telepített HH One verziója nem ellenőrizhető.');return}
   if(installed>=m.versionCode){
    noOffer('✓ '+label(p)+': HH One naprakész a legutóbbi telefonjelentés szerint (build '+installed+').');
    return;
   }
   // The installed v0.15.10 already supports the signed OTA installer from its
   // settings screen. Older clients cannot understand the new ?ota=install deep link.
   // One family click opens HH One, then one tap on its existing "Telepítés" button.
   action.href=installed>=38?'healthhubconnect://settings?ota=install':'healthhubconnect://settings';
   notice.href=action.href;
   action.textContent=installed>=38?'📦 Ellenőrzött frissítés telepítése':'📦 HH One telepítő megnyitása';
   action.setAttribute('aria-label',label(p)+' HH One v'+m.version+
     ' frissítés. A telepítés az adott telefonon és Android-jóváhagyással történik.');
   notice.hidden=false;action.hidden=false;
   feedback.textContent='🟠 '+label(p)+': HH One v'+m.version+
    ' elérhető, telepített build '+installed+'. A letöltést Mónika/Zsolt saját telefonján kell elindítani.';
  }catch(e){
   noOffer('⚠ OTA állapot nem igazolható: '+String(e?.message||e).slice(0,140));
  }finally{
   busy=false;activeProfile=null;check.disabled=false;
   if(pendingRefresh){pendingRefresh=false;void refresh(true)}
  }
 }
 check.addEventListener('click',()=>void refresh(true));
 d.addEventListener('visibilitychange',()=>{if(!d.hidden)void refresh(false)});
 w.addEventListener('hh-guardian-auth-changed',()=>{epoch++;lastRead=0;void refresh(true)});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'){epoch++;lastRead=0;void refresh(true)}});
 d.getElementById('guardianProfileSwitch')?.addEventListener('click',()=>{
  epoch++;lastRead=0;w.setTimeout(()=>void refresh(true),80);
 });
 notice.addEventListener('click',e=>{
  if(notice.hidden||notice.getAttribute('href')==='#')e.preventDefault();
 });
 action.addEventListener('click',e=>{
  if(notice.hidden||action.getAttribute('href')==='#'){e.preventDefault();return}
  // Never treat a remote viewer's profile as the device's local owner.
  // Android HH One checks its own actual owner and signed rollout once opened.
  feedback.textContent='A frissítés AZON a telefonon indul, amelyiken erre koppintottál. Az Android telepítéshez jóváhagyást kér.';
 });
 w.setTimeout(()=>void refresh(false),2200);
})(window,document);
