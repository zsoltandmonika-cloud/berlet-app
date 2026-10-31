/* SH9 OTA v1067 · Chrome / Edge ONLY.
 * Uses the EXISTING same-origin Dropbox Vault session and validated physical
 * Android registry. It never guesses the installed app build from a browser.
 * Two private read-only files per foreground check, max once per five minutes;
 * no background polling, no coordinates, no new credentials or APK installs.
 */
(function(w,d){
 'use strict';
 const q=new URLSearchParams(w.location.search);
 if(q.get('sh9native')==='1')return;
 const id=x=>d.getElementById(x);
 const lamp=id('sh9OtaIndicatorV1043'),label=id('sh9OtaStateV1043');
 const panel=id('sh9OtaManualV1044'),close=id('sh9OtaManualCloseV1044');
 const message=id('sh9OtaManualStatusV1044'),app=id('sh9OtaManualSettingsV1044');
 const apk=id('sh9OtaManualApkV1044'),select=id('sh9OtaDeviceSelectV1067');
 const refresh=id('sh9OtaRefreshV1067'),vaultLink=id('sh9OtaConnectVaultV1067');
 if(!lamp||!label||!panel||!close||!message||!app||!apk||!select||!refresh||!vaultLink)return;
 const PROFILE_KEY='sh9-ota-phone-v1067',TOKEN_KEY='hh-dropbox-token-v2';
 const APP='t68rmhh5f1l8d85',ROOT='/HealthHub/orchestrator/';
 const MANIFEST='../healthhub/data/bridge-ota.json';
 const SETTINGS='healthhubconnect://settings',CHECK=SETTINGS+'?ota=check';
 const INSTALL=SETTINGS+'?ota=install',COOLDOWN=5*60*1000,MAX_AGE=20*60*1000;
 const validProfile=p=>p==='zsolt'||p==='monika';
 const validId=x=>typeof x==='string'&&/^android-[a-zA-Z0-9-]{1,83}$/.test(x);
 const name=p=>p==='monika'?'Mónika':'Zsolt';
 let chosen='';
 try{
  const saved=w.localStorage?.getItem(PROFILE_KEY);
  const profile=w.localStorage?.getItem('hh-profile');
  chosen=validProfile(saved)?saved:profile==='m'?'monika':profile==='z'?'zsolt':'';
 }catch(_){}
 select.value=chosen;
 let busy=false,pending=false,lastCheck=0,generation=0,validUntil=0;
 let latest={state:'unknown',build:null,release:null,chosen,reason:'A telefon állapota még nem ellenőrzött.'};
 function show(state,text,href){
  lamp.dataset.state=state;
  lamp.title=text;lamp.setAttribute('aria-label',text);
  lamp.href=href||CHECK;
  lamp.querySelector('.sh9-ota-label-v1043').textContent=state==='update'?'FRISSÍTÉS':state==='ok'?'':'?';
  label.textContent=text;
 }
 function choices(){
  panel.hidden=false;
  message.textContent=latest.reason+
    ' · A jelzés a kijelölt telefonról szól, nem bizonyítja, hogy a böngésző azon a készüléken fut.';
  app.href=latest.state==='update'?INSTALL:CHECK;
  app.textContent=latest.state==='update'?'📦 HH One frissítő megnyitása ezen a telefonon':
   '📱 HH One OTA ellenőrzése ezen a telefonon';
  const eligible=latest.state==='update'&&typeof latest.release==='string';
  apk.hidden=!eligible;apk.href=eligible?latest.release:'#';
  vaultLink.hidden=latest.reason.indexOf('Dropbox')===-1;
 }
 function releaseValid(m){
  if(!m||m.schema!=='healthhub.connect.ota/1'||m.channel!=='signed-release'||
    m.applicationId!=='hu.zsoltmonika.healthhubbridge'||
    !Number.isInteger(m.versionCode)||m.versionCode<1||
    !/^\d+\.\d+\.\d+$/.test(m.version||'')||
    !/^[a-f0-9]{64}$/.test(m.sha256||'')||
    !Array.isArray(m.rolloutProfiles)||!m.rolloutProfiles.every(validProfile))return false;
  const expected='https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/'+
    'healthhub-connect-ota-v'+m.version+'/HealthHub-Connect-v'+m.version+'-ota.apk';
  return m.downloadUrl===expected;
 }
 async function accessToken(){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.accessToken==='function')return vault.accessToken();
  let t;
  try{t=JSON.parse(w.localStorage?.getItem(TOKEN_KEY)||'null')}catch(_){}
  if(!t||typeof t.refresh_token!=='string'||t.refresh_token.length<12)
    throw Error('Dropbox-kapcsolat hiányzik ebben a böngészőben.');
  if(typeof t.access_token==='string'&&Number(t.expires_at)>Date.now()+60000)
    return t.access_token;
  const r=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP})
  });
  if(!r.ok)throw Error('Dropbox-hitelesítés megújítása sikertelen.');
  const body=await r.json();
  if(typeof body.access_token!=='string')throw Error('Dropbox-token nem ellenőrizhető.');
  t.access_token=body.access_token;
  t.expires_at=Date.now()+((Number(body.expires_in)||14400)-60)*1000;
  w.localStorage?.setItem(TOKEN_KEY,JSON.stringify(t));
  return t.access_token;
 }
 async function read(path,token){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.downloadJson==='function')return vault.downloadJson(path);
  const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path})},
   cache:'no-store'
  });
  if(!r.ok)throw Error('Privát telefonjelentés nem olvasható (HTTP '+r.status+').');
  return r.json();
 }
 async function device(owner){
  // Never query any device without both a local Dropbox session and a valid
  // owner-scoped, unarchived Android primary-phone registry entry.
  const token=await accessToken();
  const registry=await read(ROOT+'device-registry-v401.json',token);
  const deviceId=registry?.activePhones?.[owner];
  if(registry?.schema!=='healthhub.device_registry/1'||
    !Array.isArray(registry.archived)||!validId(deviceId)||
    registry.archived.includes(deviceId))
    throw Error(name(owner)+' telefonja nincs igazoltan kijelölve a családi regiszterben.');
  const record=await read(ROOT+'devices/'+deviceId+'.json',token);
  if(record?.schema!=='healthhub.orchestrator.device/1'||
    record.deviceType!=='android'||record.deviceId!==deviceId||
    record.activeProfile!==owner)throw Error('A telefonjelentés nem egyezik a regiszterrel.');
  const seen=Date.parse(record.lastSeenAt||'');
  if(!Number.isFinite(seen)||seen>Date.now()+5000||Date.now()-seen>MAX_AGE)
    throw Error(name(owner)+' telefonjának jelentése 20 percnél régebbi.');
  const code=record.buildCode;
  if(!Number.isInteger(code)||code<1)throw Error('A telepített buildszám nem ellenőrizhető.');
  return {build:code,seen};
 }
 function unknown(reason){
  latest={state:'unknown',build:null,release:null,chosen,reason};
  validUntil=0;
  show('unknown','⚪ '+(chosen?name(chosen)+' telefonja: ':'')+reason,CHECK);
  if(!panel.hidden)choices();
 }
 async function check(force=false){
  if(busy){if(force)pending=true;return}
  const now=Date.now();
  if(!force&&now-lastCheck<COOLDOWN)return;
  lastCheck=now;busy=true;
  const current=chosen,myGeneration=++generation;
  refresh.disabled=true;
  if(!validProfile(current)){
   unknown('Válaszd ki egyszer, melyik családi telefont figyeljük.');
   busy=false;refresh.disabled=false;return;
  }
  show('unknown','⚪ '+name(current)+' telefonja · OTA ellenőrzés folyamatban…',CHECK);
  try{
   const [installed,response]=await Promise.all([
    device(current),w.fetch(MANIFEST,{cache:'no-store'})
   ]);
   if(myGeneration!==generation||current!==chosen)return;
   if(!response.ok)throw Error('OTA kiadási lista nem elérhető.');
   const m=await response.json();
   if(!releaseValid(m))throw Error('A kiadott APK adatai nem ellenőrizhetők.');
   const eligible=m.rolloutProfiles.includes(current);
   let state,reason,href,release=null;
   if(m.versionCode<=installed.build){
    state='ok';reason='🟢 '+name(current)+' telefonja NAPRAKÉSZ · build '+installed.build+
      ' · kiadott build '+m.versionCode;href=CHECK;
   }else if(eligible){
    state='update';reason='🟠 '+name(current)+' telefonjához frissítés: build '+
      installed.build+' → '+m.versionCode+' · v'+m.version;
    href=INSTALL;release=m.downloadUrl;
   }else{
    state='unknown';reason='⚪ '+name(current)+' telefonjára nincs jóváhagyott új OTA-kiadás.';href=CHECK;
   }
   latest={state,build:installed.build,release,chosen:current,reason};
   validUntil=installed.seen+MAX_AGE;
   show(state,reason,href);
   if(!panel.hidden)choices();
   const expiry=validUntil;
   if(state!=='unknown')w.setTimeout(()=>{
    if(chosen===current&&validUntil===expiry&&Date.now()>=expiry)
      unknown('A telefonjelentés már nem friss. Ellenőrizd újra.');
   },Math.max(0,expiry-Date.now())+1000);
  }catch(e){
   if(myGeneration===generation&&current===chosen)
    unknown(String(e?.message||'Kapcsolati hiba').slice(0,160));
  }finally{
   busy=false;refresh.disabled=false;
   if(pending){pending=false;void check(true)}
  }
 }
 select.addEventListener('change',()=>{
  chosen=validProfile(select.value)?select.value:'';
  try{if(chosen)w.localStorage?.setItem(PROFILE_KEY,chosen);
      else w.localStorage?.removeItem(PROFILE_KEY)}catch(_){}
  generation++;lastCheck=0;unknown('Új telefon kiválasztva, ellenőrzés folyamatban.');
  void check(true);
 });
 lamp.addEventListener('click',e=>{
  // Unverified state stays on-page; never claim a successful Android handoff.
  if(latest.state==='unknown'){
   e?.preventDefault?.();choices();return;
  }
  panel.hidden=true;
  w.setTimeout(()=>{if(!d.hidden)choices()},1800);
 });
 close.addEventListener('click',()=>{panel.hidden=true;lamp.focus()});
 refresh.addEventListener('click',()=>{void check(true)});
 d.addEventListener('visibilitychange',()=>{
  if(!d.hidden){
   if(validUntil&&Date.now()>=validUntil)unknown('A telefonjelentés lejárt.');
   void check(false);
  }
 });
 w.addEventListener('pageshow',()=>{
  if(validUntil&&Date.now()>=validUntil)unknown('A telefonjelentés lejárt.');
  void check(false);
 });
 // A profile switch inside SH9 is not proof of which physical device is local.
 // The deliberately chosen monitored phone survives browser restarts.
 unknown(chosen?'Telefonjelentés ellenőrzése folyamatban.':'Válassz figyelt telefont.');
 void check(false);
})(window,document);
