/* Family Guard v1040 · consent-gated private Remote Diagnosis + GPS restart REQUEST.
 * One user-initiated read, no polling. Existing Dropbox Orchestrator Android commands.
 * The GPS restart action only notifies the phone OWNER for approval.
 * Never claims live GPS from last-seen telemetry or a queued command.
 */
(function(w,d){
 'use strict';
 const ROOT='/HealthHub/orchestrator', REG=ROOT+'/device-registry-v401.json';
 const DEVICE=ROOT+'/devices/', STATUS=ROOT+'/status/', CMD=ROOT+'/commands/';
 const TOKEN='hh-dropbox-token-v2',APP='t68rmhh5f1l8d85';
 const panel=d.getElementById('guardianRemoteServiceV1040');
 const output=d.getElementById('guardianRemoteServiceStateV1040');
 const refreshButton=d.getElementById('guardianRemoteRefreshV1040');
 const diagButton=d.getElementById('guardianRemoteDiagV1040');
 const restartButton=d.getElementById('guardianRemoteRestartV1040');
 if(!panel||!output||!refreshButton||!diagButton||!restartButton)return;
 const selected=()=>w.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 const authorized=()=>w.HH_GUARDIAN_LIVE_V785?.familyAuthorized===true;
 const label=p=>p==='monika'?'Mónika':'Zsolt';
 const validId=x=>typeof x==='string'&&/^android-[a-zA-Z0-9-]{1,83}$/.test(x);
 const now=()=>Date.now();
 const age=s=>{const t=Date.parse(s||'');return Number.isFinite(t)&&t<=now()+5000?now()-t:Infinity};
 const time=s=>Number.isFinite(Date.parse(s||''))?new Date(s).toLocaleString('hu-HU'):'nincs adat';
 const ago=ms=>!Number.isFinite(ms)?'nincs adat':ms<60000?Math.round(ms/1000)+' mp':ms<3600000?Math.round(ms/60000)+' perc':Math.round(ms/3600000)+' óra';
 let loading=false,sending=false,last=null,cycle=0;
 function text(message){output.textContent=message}
 function controls(profile){
  const valid=last&&last.profile===profile&&last.verified&&authorized()&&!loading&&!sending;
  const caps=valid&&last.device?.capabilities;
  diagButton.disabled=!(caps?.includes('diagnostics')&&Number(last.device.buildCode)>=21);
  restartButton.disabled=!(caps?.includes('gps_resume_request')&&Number(last.device.buildCode)>=33);
  refreshButton.disabled=loading||sending;
 }
 function tokenStored(){
  try{const t=JSON.parse(w.localStorage?.getItem(TOKEN)||'null');
   return t&&typeof t.refresh_token==='string'&&t.refresh_token.length>10?t:null;
  }catch(_){return null}
 }
 async function accessToken(){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.accessToken==='function')return vault.accessToken();
  const t=tokenStored();
  if(!t)throw Error('Ebben a böngészőben nincs privát családi Dropbox-kapcsolat.');
  if(t.access_token&&Number(t.expires_at)>now()+60000)return t.access_token;
  const res=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP})
  });
  if(!res.ok)throw Error('Dropbox token megújítása sikertelen (HTTP '+res.status+').');
  const body=await res.json();
  if(typeof body.access_token!=='string')throw Error('Érvénytelen Dropbox hozzáférés.');
  t.access_token=body.access_token;
  t.expires_at=now()+(Number(body.expires_in)||14400)*1000-60000;
  w.localStorage?.setItem(TOKEN,JSON.stringify(t));
  return t.access_token;
 }
 async function download(path){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.downloadJson==='function'){
   try{return await vault.downloadJson(path)}catch(e){
    if(e?.status===409&&/not_found/i.test(String(e.message||'')))return null;
    throw e;
   }
  }
  const t=await accessToken();
  const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
   method:'POST',headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path})},
   cache:'no-store'
  });
  if(r.status===409)return null;
  if(!r.ok)throw Error('Privát Dropbox-adatolvasás HTTP '+r.status);
  return r.json();
 }
 async function upload(path,payload){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.uploadJson==='function')return vault.uploadJson(path,payload);
  const t=await accessToken();
  const r=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
   method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/octet-stream',
    'Dropbox-API-Arg':JSON.stringify({path,mode:'overwrite',autorename:false,mute:true})},
   body:JSON.stringify(payload)
  });
  if(!r.ok)throw Error('Parancs feltöltése sikertelen (HTTP '+r.status+')');
 }
 function checkDevice(reg,device,profile){
  if(!reg||reg.schema!=='healthhub.device_registry/1'||
   !Array.isArray(reg.archived)||!reg.activePhones)return false;
  const id=reg.activePhones[profile];
  if(!validId(id)||reg.archived.includes(id))return false;
  return !!device&&device.schema==='healthhub.orchestrator.device/1'&&
   device.deviceType==='android'&&device.deviceId===id&&device.activeProfile===profile;
 }
 function report(profile,device,native,status){
  const lines=[label(profile)+' · hitelesített Remote Diagnosis'];
  const heartbeat=age(device.lastSeenAt);
  lines.push('📱 HH One utolsó jelentkezés: '+time(device.lastSeenAt)+' ('+ago(heartbeat)+')');
  if(heartbeat>20*60000)lines.push('⚠ Telefonos heartbeat régi; az aktuális szolgáltatásállapot NEM ismert.');
  else if(device.familyGuardNativeGpsActive===false)lines.push('🔴 A legutóbbi jelentéskor a GPS-szolgáltatás nem futott.');
  else if(device.familyGuardNativeGpsActive===true)lines.push('🟢 A jelentéskor a GPS-szolgáltatás futott (nem élő garancia).');
  else lines.push('GPS-szolgáltatás: nem állapítható meg.');
  lines.push('📍 Utolsó valódi GPS-fix: '+time(device.smartLocationLastFixAt));
  lines.push('☁️ Utolsó Dropbox-feltöltés: '+time(device.familyGuardLastUploadedAt));
  lines.push('📤 Telefonos feltöltési állapot: '+String(device.familyGuardUploadStatus||'nincs adat').slice(0,90));
  if(String(device.familyGuardUploadStatus||'').startsWith('network-error:'))
   lines.push('⚠ Natív Dropbox-feltöltési hiba a telefon utolsó jelentésében.');
  if(native?.status==='ok'){
   const t=age(native.data?.updated_at);
   lines.push(t<=75000?'✅ Privát GPS-mérés friss ('+ago(t)+').':
    '⚠ Privát GPS-mérés régi ('+ago(t)+').');
  }else{
   const desc={'not-connected':'a megjelenítő Dropbox-kapcsolata hiányzik',
    missing:'még nincs natív snapshot',revoked:'a megosztás visszavonva',
    invalid:'érvénytelen / túl régi snapshot',error:'privát Dropbox-olvasási hiba'};
   lines.push('📡 Privát GPS-adat: '+(desc[native?.status]||'nem ellenőrizhető'));
  }
  if(status&&status.deviceId===device.deviceId){
   const pending=['pending','running','queued'].includes(status.state);
   lines.push('🧾 Legutóbbi távoli parancs: '+String(status.state||'ismeretlen').slice(0,25)+
    ' · '+time(status.updatedAt)+(pending?' (nem végrehajtási bizonyíték)':''));
  }
  return lines.join('\n');
 }
 async function diagnose(){
  const run=++cycle,profile=selected();
  last=null;
  if(!panel.open)return;
  if(!authorized()){text('🔒 Bejelentkezett, mindkét családtaghoz jogosult Family Guard-fiók szükséges.');controls(profile);return}
  loading=true;controls(profile);text('📡 '+label(profile)+' telefonjának ellenőrzése…');
  try{
   const registry=await download(REG);
   const id=registry?.activePhones?.[profile];
   if(!validId(id)||!Array.isArray(registry?.archived)||registry.archived.includes(id))
    throw Error('A kijelölt fizikai telefon nem ellenőrizhető a v401 eszközregiszterben.');
   const [device,status,native]=await Promise.all([
    download(DEVICE+id+'.json'),download(STATUS+id+'.json'),
    w.HH_GUARDIAN_NATIVE_V156?.read(profile)??Promise.resolve({status:'not-connected'})
   ]);
   if(run!==cycle||profile!==selected()||!authorized())return;
   if(!checkDevice(registry,device,profile))
    throw Error('A telefonazonosító és a tulajdonosi profil nem egyezik.');
   last={profile,device,verified:true};
   text(report(profile,device,native,status));
  }catch(e){
   if(run===cycle)text('⚠ Remote Diagnosis: '+String(e?.message||e).slice(0,180));
  }finally{
   if(run===cycle){loading=false;controls(selected())}
  }
 }
 async function send(scope){
  const profile=selected();
  if(!last?.verified||last.profile!==profile||!authorized()||loading||sending)return;
  if(!['diagnostics','gps_resume_request'].includes(scope))return;
  sending=true;controls(profile);
  try{
   // Re-read authoritative device registry and advertised capabilities just before send.
   const registry=await download(REG);
   const id=registry?.activePhones?.[profile];
   if(!validId(id)||!Array.isArray(registry?.archived)||registry.archived.includes(id))
    throw Error('Nincs ellenőrzött kijelölt telefon.');
   const device=await download(DEVICE+id+'.json');
   if(!checkDevice(registry,device,profile))throw Error('Telefonazonosító vagy profil megváltozott.');
   const minimum=scope==='diagnostics'?21:33;
   if(Number(device.buildCode)<minimum||!Array.isArray(device.capabilities)||
    !device.capabilities.includes(scope))throw Error('A telefon nem engedélyezte ezt a távoli műveletet.');
   if(profile!==selected()||!authorized())throw Error('A jogosultság vagy profil közben megváltozott.');
   const isGps=scope==='gps_resume_request';
   const question=isGps?'A kijelölt telefonra GPS-újraindítási JÓVÁHAGYÁSKÉRÉST küldünk. A GPS nem indul el a tulajdonos telefonos jóváhagyása nélkül.':'A kijelölt telefon műszaki diagnosztikai jelentését kérjük. Nem kérünk egészségügyi méréseket.';
   if(!w.confirm(label(profile)+': '+question))return;
   const issued=new Date().toISOString(),uuid=w.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
   const commandId='cmd-'+Date.now().toString(36)+'-'+uuid.replace(/[^a-zA-Z0-9-]/g,'').slice(0,18);
   const command={schema:'healthhub.orchestrator.command/1',commandId,targetDeviceId:id,
    issuedAt:issued,expiresAt:new Date(now()+(isGps?40*60000:24*3600000)).toISOString(),
    requestedBy:'family-guard',profileScope:profile,scopes:[scope],state:'pending'};
   // A command is a request only. An Android ACK is required for any result.
   await upload(CMD+id+'.json',command);
   await upload(STATUS+id+'.json',{schema:'healthhub.orchestrator.status/1',
    deviceId:id,deviceType:'android',commandId,state:'pending',updatedAt:issued,
    startedAt:null,completedAt:null,profileScope:profile,scopes:[scope],steps:[],
    message:'Family Guard remote kérés; a telefon visszaigazolására vár.'});
   text('📨 '+label(profile)+': '+(isGps?'GPS Service Recovery jóváhagyáskérés':'Remote DIAG')+
    ' elküldve. PENDING · a telefon visszaigazolásáig NEM tekintjük végrehajtottnak.');
  }catch(e){text('⚠ Kérés nem igazolt: '+String(e?.message||e).slice(0,190))}
  finally{sending=false;last=null;controls(profile)}
 }
 panel.addEventListener('toggle',()=>{if(panel.open)void diagnose()});
 refreshButton.addEventListener('click',()=>void diagnose());
 diagButton.addEventListener('click',()=>void send('diagnostics'));
 restartButton.addEventListener('click',()=>void send('gps_resume_request'));
 d.getElementById('guardianProfileSwitch')?.addEventListener('click',()=>{
  cycle++;last=null;controls(selected());
  if(panel.open)w.setTimeout(()=>void diagnose(),50);
 });
 w.addEventListener('hh-guardian-auth-changed',()=>{cycle++;last=null;controls(selected());if(panel.open)void diagnose()});
 w.addEventListener('storage',e=>{
  if(e.key==='hh-profile'){cycle++;last=null;controls(selected());if(panel.open)void diagnose()}
 });
 controls(selected());
})(window,document);
