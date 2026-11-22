/* Family Guard v785 · native-only family GPS publishing; read-only Outlook Dropbox GPS status.
 * Native HH One owns explicit GPS publishing to the owner's private Outlook Dropbox.
 * This browser component NEVER writes or deletes remote position rows; RLS remains strict.
 * Owner-approved native sharing runs independently of browser map GPS.
 * Keep only an authenticated latest fix with timestamp/stale marker;
 * never mistake a missing, revoked or old location for a live position.
 * No GPS history and no synthetic family markers.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const cfg=w.HH_CENTRAL_VAULT;
const NATIVE_OAUTH=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg&&cfg.enabled&&cfg.supabaseUrl&&cfg.publishableKey&&w.supabase&&w.supabase.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:NATIVE_OAUTH?'pkce':'implicit'}
 }):null;
const TABLE='hh_guardian_live_locations',PREF_TABLE='hh_guardian_location_settings',AGE_MS=20000,LAST_KNOWN_MS=12*60*60*1000,ACCURACY_LIMIT=100;
const DEVICE_KEY='hh-guardian-own-phone-profile-v785',INTERVAL_KEY='hh-guardian-refresh-v785';
const AUTO_KEY='hh-guardian-foreground-auto-v786';
const validIntervals=[1000,3000,5000,10000,30000,60000];
let user=null,access=[],map=null,peerMarker=null,peerCoord=null,sharing=false,sharingProfile=null;
// Restored sessions need verification before the login button is exposed.
let authPending=true;
let interval=5000,pollTimer=null,polling=false,generation=0,lastUploaded=0,lastSeen=null;
let uploads=Promise.resolve(),settingsWrites=Promise.resolve(),settingsSignature='',authGeneration=0,authInFlight=false,peerAvailable=false,peerUpdatedAt=null;
// GPS Data Saver v868: share a short-lived authenticated GPS read between the
// Family Live map, the profile portrait and the Health/GPS status tile.
const LOCATION_READ_CACHE_MS=2200,LOCATION_IDLE_CACHE_MS=8500,locationReads=new Map();
// Read-only GPS responses can be shared by all three UI consumers in this tab.
// A longer cache is allowed ONLY for fresh, accurate, measured stationary fixes.
// Moving, unknown-speed, poor-accuracy and stale fixes keep the 2.2s path.
function locationCacheMs(response,at){
 const fix=response&&response.data;
 if(!fix||response.error||typeof fix.speed_kmh!=='number'||
  !Number.isFinite(fix.speed_kmh)||fix.speed_kmh<0||fix.speed_kmh>=4||
  typeof fix.accuracy_m!=='number'||!Number.isFinite(fix.accuracy_m)||
  fix.accuracy_m<0||fix.accuracy_m>40)return LOCATION_READ_CACHE_MS;
 const ts=Date.parse(fix.updated_at||''),age=at-ts;
 if(!Number.isFinite(ts)||age<0||age>=AGE_MS)return LOCATION_READ_CACHE_MS;
 return Math.max(LOCATION_READ_CACHE_MS,Math.min(LOCATION_IDLE_CACHE_MS,AGE_MS-age));
}
let lastPeerSpeedKmh=null,lastPeerReadAt=0;
function self(){return w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function other(){return self()==='monika'?'zsolt':'monika'}
function label(k){return k==='monika'?'Mónika':'Zsolt'}
function time(iso){return new Date(iso).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function msg(s){const el=$('guardianLiveStatus');if(el)el.textContent=s}
function set(elId,s){const el=$(elId);if(el)el.textContent=s}
function bound(){try{return w.localStorage.getItem(DEVICE_KEY)}catch(_){return null}}
function autoEnabled(){try{return bound()===self()&&w.localStorage.getItem(AUTO_KEY)===self()}catch(_){return false}}
function removeAuto(){try{w.localStorage.removeItem(AUTO_KEY)}catch(_){}}
function gpsInfo(s){
 set('guardianLiveGpsDetail811',s);
}
function onGpsSignal(kind,accuracy){
 // The browser GPS feed is device-level; permission/owner consent and
 // server publishing are separately verified by Family Live.
 if(kind==='starting')gpsInfo('📡 Böngészős GPS: pozíciókérés folyamatban.');
 else if(kind==='timeout')gpsInfo('🟠 Böngészős GPS: 20 mp időtúllépés, még nincs új helyadat. Követés aktív.');
 else if(kind==='unavailable')gpsInfo('🟠 Böngészős GPS: átmenetileg nem érhető el pozíció.');
 else if(kind==='inaccurate')gpsInfo('🟠 Valódi, de pontatlan mérés: '+(Number.isFinite(accuracy)?'±'+Math.round(accuracy)+' m':'pontosság ismeretlen')+'. 100 m alatt válhat élővé.');
 else if(kind==='fix')gpsInfo('🟢 Böngészős GPS: megfelelő pontosságú valódi pozíció érkezett.');
 else if(kind==='stopped')gpsInfo('⚪ Böngészős GPS: leállítva vagy háttérbe került.');
 else if(kind==='denied')gpsInfo('🔴 Böngészős GPS: helyengedély megtagadva.');
 if(sharing&&(kind==='timeout'||kind==='unavailable'||kind==='inaccurate'))
  msg('A Family Live megosztása engedélyezett, de még nincs új, megfelelő GPS-pozíció. A részletes GPS-állapot lent látható.');
}
function updateUi(){
 const me=self(),meReady=!!user&&access.includes(me);
 const owner=bound(),ownerMismatch=!!owner&&owner!==me;
 set('guardianLiveIdentity',ownerMismatch?
  '⚠️ A kiválasztott '+label(me)+' profil NEM egyezik a telefon korábbi, '+label(owner)+' hozzárendelésével.':
  'Saját profil: '+label(me)+(owner?' · ehhez a profilhoz rögzítve':' · még nincs hozzárendelve'));
 const ownerNotice=$('guardianLiveOwnerHelp811'),ownerFix=$('guardianLiveResolveOwner811');
 if(ownerNotice)ownerNotice.hidden=!ownerMismatch;
 if(ownerFix)ownerFix.hidden=!ownerMismatch;
 set('guardianLiveAuth',user?'Hitelesítve · családi hozzáférés ellenőrizve':
  authPending?'Mentett bejelentkezés ellenőrzése…':'Google-bejelentkezés szükséges');
 const login=$('guardianLiveLogin'),logout=$('guardianLiveLogout');
 if(login)login.hidden=!!user||authPending;if(logout)logout.hidden=!user;
 const start=$('guardianLiveStart'),stop=$('guardianLiveStop');
 if(start){
  start.disabled=!meReady;
  start.hidden=false;
  start.textContent='📡 Natív GPS állapot ellenőrzése';
 }
 // The browser cannot start/stop the separately consented HH One native share.
 if(stop){stop.disabled=true;stop.hidden=true}
 const reset=$('guardianLiveResetDevice');if(reset){
  reset.hidden=!owner;
  reset.textContent=ownerMismatch?'📱 Saját telefon hozzárendelésének ellenőrzése':'Ez egy másik családtag telefonja';
 }
 set('guardianLiveAutoStatus',
  '🛡️ Családi GPS: kizárólag a saját HH One natív helymegosztása → Outlook Dropbox. '+
  'A böngészős Követés nem küld családi helyadatot.');
 const disableAuto=$('guardianLiveDisableAuto');
 if(disableAuto)disableAuto.hidden=true;
 if(!user)set('guardianOtherState','Csak belépés után kérdezhető le');
 else if(!access.includes(other()))set('guardianOtherState','Nincs hozzáférés ehhez a profilhoz');
}
function removePeer(){
 peerAvailable=false;peerCoord=null;peerUpdatedAt=null;
 if(peerMarker){peerMarker.remove();peerMarker=null}
 const card=$('guardianOtherCard');if(card){card.classList.remove('live');card.classList.remove('guardian-last-known-v807')}
}
function setPeerState(s){set('guardianOtherState',s);set('guardianLivePeerStatus',s)}
// v1181 · Retain only a previously verified same-profile GPS point on a
// transient timeout/network error, and label it as NOT LIVE.
function retainVerifiedPeer(reason){
 const ts=Date.parse(peerUpdatedAt||''),age=Date.now()-ts;
 if(!peerAvailable||!peerMarker||!Number.isFinite(ts)||age< -5000||age>LAST_KNOWN_MS){
  removePeer();setPeerState('Nincs igazolt utolsó GPS-pozíció.');return false;
 }
 lastPeerSpeedKmh=null;
 const card=$('guardianOtherCard');
 if(card){card.classList.remove('live');card.classList.add('guardian-last-known-v807')}
 const el=peerMarker.getElement?.();
 if(el){
  el.classList?.add('guardian-peer-stale-v807');
  el.setAttribute?.('aria-label',label(other())+' · UTOLSÓ ISMERT HELY · '+time(peerUpdatedAt)+' · NEM ÉLŐ');
 }
 setPeerState('🕘 '+label(other())+' · UTOLSÓ ISMERT HELY · '+time(peerUpdatedAt)+
  ' ('+peerAgeLabel(age)+' óta) · NEM ÉLŐ'+(reason?' · '+reason:''));
 return true;
}
function renderPeer(data){
 if(!map||!w.maplibregl||!w.maplibregl.Marker)return;
 const k=other(),av=w.HH_GOLDEN_AVATARS_V529||{};
 const el=d.createElement('div');el.className='guardian-position guardian-peer-position';
 el.setAttribute('data-guardian-person',k==='monika'?'m':'z');
 el.setAttribute('role','img');el.setAttribute('aria-label',label(k)+' · megosztott GPS; az állapot a családi kártyán látszik');
 const photo=d.createElement('span');photo.className='guardian-position-photo';
 const img=d.createElement('img');img.alt='';img.src=k==='monika'?av.m:av.z;
 photo.appendChild(img);el.appendChild(photo);
 const name=d.createElement('span');name.className='guardian-position-label';name.textContent=label(k);el.appendChild(name);
 peerMarker=new w.maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([data.longitude,data.latitude]).addTo(map);
}
function peerAgeLabel(ageMs){
 const n=Math.max(0,Math.round(ageMs/1000));
 return n<60?n+' mp':n<3600?Math.floor(n/60)+' perc':
  Math.floor(n/3600)+' óra '+Math.floor(n%3600/60)+' perc';
}
function peerSnapshot(data,now=Date.now()){
 if(!data||!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)||
  Math.abs(data.latitude)>90||Math.abs(data.longitude)>180||
  !Number.isFinite(data.accuracy_m)||data.accuracy_m<0||data.accuracy_m>ACCURACY_LIMIT)return null;
 const stamp=Date.parse(data.updated_at),age=now-stamp;
 if(!Number.isFinite(stamp)||age< -5000||age>LAST_KNOWN_MS)return null;
 const freshness=data.source==='HH One Native GPS'?75_000:AGE_MS;
 return {age,live:age<=freshness,coord:[data.longitude,data.latitude]};
}
function peerStatus(data,age){
 const native=data.source==='HH One Native GPS',freshness=native?75_000:AGE_MS;
 const source=native?' · HH One natív':' · böngészős';
 if(age<=freshness){
  const speed=Number.isFinite(data.speed_kmh)?' · '+data.speed_kmh.toFixed(1).replace('.',',')+' km/h':'';
  return '🟢 ÉLŐ'+source+' · '+time(data.updated_at)+' · ±'+Math.round(data.accuracy_m)+' m'+speed;
 }
 return '🕘 UTOLSÓ ISMERT HELY'+source+' · '+time(data.updated_at)+' ('+
  peerAgeLabel(age)+' óta nincs friss GPS-jel) · NEM ÉLŐ';
}
function displayPeer(data,now=Date.now()){
 const state=peerSnapshot(data,now);
 if(!state){removePeer();setPeerState('Nincs megosztott helyadat az elmúlt 12 órából.');return false}
 if(!peerMarker)renderPeer(data);
 else peerMarker.setLngLat(state.coord);
 peerCoord=state.coord;peerAvailable=true;peerUpdatedAt=data.updated_at;
 const card=$('guardianOtherCard');
 if(card){
  card.classList.toggle('live',state.live);
  card.classList.toggle('guardian-last-known-v807',!state.live);
 }
 if(peerMarker&&peerMarker.getElement){
  const node=peerMarker.getElement();
  if(node){
   node.classList.toggle('guardian-peer-stale-v807',!state.live);
   node.setAttribute('aria-label',label(other())+' · '+(state.live?'ÉLŐ':'UTOLSÓ ISMERT HELY, NEM ÉLŐ')+' · '+time(data.updated_at));
  }
 }
 setPeerState(peerStatus(data,state.age));
 return true;
}
function readSharedLocation(k){
 if(!api||!user||!access.includes(k)||!['zsolt','monika'].includes(k))
  return Promise.resolve({data:null,error:{message:'Nincs GPS-olvasási jogosultság'}});
 const key=user.id+':'+k,now=Date.now(),old=locationReads.get(key);
 if(old&&old.pending)return old.pending;
 if(old&&old.result&&now-old.at<locationCacheMs(old.result,old.at))
  return Promise.resolve(old.result);
 const ownerId=user.id;
 const pending=Promise.resolve(api.from(TABLE)
  .select('profile_key,latitude,longitude,accuracy_m,updated_at,speed_kmh')
  .eq('profile_key',k).maybeSingle()).then(result=>{
   // An invalidated pending request must not repopulate a revoked/profile-switched cache.
   if(locationReads.get(key)?.pending===pending){
    if(user&&user.id===ownerId&&access.includes(k)&&!result.error)
     locationReads.set(key,{result,at:Date.now()});
    else locationReads.delete(key);
   }
   return result;
  }).catch(error=>{
   if(locationReads.get(key)?.pending===pending)locationReads.delete(key);
   throw error;
  });
 locationReads.set(key,{pending});
 return pending;
}
async function poll(){
 if(polling||d.hidden||!user||!access.includes(other())||!api)return;
 // The source speed must be genuinely measured. Unknown/moving remains fast;
 // verified stationary data can be read every 10s without ageing out at 20s.
 const now=Date.now();
 if(lastPeerSpeedKmh!==null&&lastPeerSpeedKmh<4&&lastPeerReadAt&&now-lastPeerReadAt<10000)return;
 lastPeerReadAt=now;polling=true;
 const token=generation,k=other();
 try{
  // v1173: Monika's Supabase browser row is not attested to her physical phone.
  // Never promote a possibly misassigned home fix to a remote live pin.
  // v1177: no Supabase/browser coordinate reads for either profile.
  const relay=w.HH_GUARDIAN_GPS_ROUTER_V1177;
  const native=relay&&relay.connected()?await relay.read(k):null;
  if(token!==generation||d.hidden||k!==other()||!user)return;
  const nativeFix=native&&native.status==='ok'?native.data:null;
  // Native revocation supersedes older cached browser positions.
  if(native&&native.status==='revoked'){
   lastPeerSpeedKmh=null;removePeer();setPeerState('Natív helymegosztás visszavonva.');
   return;
  }
  const selected=nativeFix&&peerSnapshot(nativeFix)?nativeFix:null;
  if(selected){
   // A valid authenticated 75-second-old HH One reading may be shown as last
   // known for up to 12h, never LIVE, never after a newer measured position.
   if(peerUpdatedAt&&Date.parse(selected.updated_at)<Date.parse(peerUpdatedAt)){
    retainVerifiedPeer('régebbi GPS-jel érkezett');return;
   }
   lastPeerSpeedKmh=peerSnapshot(selected)?.live&&Number.isFinite(selected.speed_kmh)&&
    selected.speed_kmh>=0&&selected.speed_kmh<200&&selected.accuracy_m<=40?
    selected.speed_kmh:null;
   displayPeer(selected);return;
  }
  if(native?.status==='error'){
   retainVerifiedPeer('átmeneti Dropbox-olvasási hiba');return;
  }
  // Actual revocation, missing credentials, invalid owner proof or a missing
  // source are not papered over with a historical marker.
  lastPeerSpeedKmh=null;removePeer();
  setPeerState(!relay||!relay.connected()||native?.status==='not-connected'?
   'Nincs megosztott hely · a családi Outlook Dropbox csatlakoztatása szükséges.':
   'Nincs igazolt családi GPS-pozíció vagy a megosztás megszűnt.');
 }catch(e){
  lastPeerSpeedKmh=null;
  if(token===generation)retainVerifiedPeer('átmeneti hálózati hiba');
 }finally{polling=false}
}
function resetPolling(){
 lastPeerSpeedKmh=null;lastPeerReadAt=0;
 if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}
 generation++;
 if(user&&!d.hidden){
  poll();pollTimer=w.setInterval(poll,interval);
 }
}
// Retired browser-row deletion: revocation of native consent is ONLY on the phone.
function clearRow(){return Promise.resolve();}
function stopSharing(){
 const k=sharingProfile,uid=user&&user.id;
 // Never serve a cached own fix after explicit Stop/revocation.
 if(k&&uid)locationReads.delete(uid+':'+k);
 sharing=false;sharingProfile=null;lastUploaded=0;lastSeen=null;
 set('guardianLiveOwnSpeed','—');
 updateUi();
 if(k)msg('Élő helymegosztás kikapcsolva ezen a telefonon.');
 return k&&uid?clearRow(k,uid):Promise.resolve();
}
function onGpsStopped(){onGpsSignal('stopped');if(sharing)stopSharing()}
function onGpsPaused(){
 // Browser sleep/pagehide pauses uploading but MUST NOT revoke the owner's consent.
 // Retain only the single last uploaded fix; foreground reactivation is opt-in.
 if(!sharing)return;
 sharing=false;sharingProfile=null;lastUploaded=0;lastSeen=null;
 set('guardianLiveOwnSpeed','—');updateUi();
 msg('Böngészős GPS szünetel. Az utolsó ismert hely megmarad, időbélyeggel (nem élő követés).');
}
function onProfileChanged(){
 locationReads.clear();
 // Selecting another person on the map must NOT revoke or delete this
 // phone's previously approved GPS publication. Device owner and viewed
 // profile are separate concepts. Stop only if the physical binding itself
 // is no longer trustworthy.
 const owner=bound();
 const keepOwnerPublishing=sharing&&!!owner&&sharingProfile===owner&&
  access.includes(owner);
 if(sharing&&!keepOwnerPublishing)stopSharing();
 removePeer();
 setPeerState('Új profil · élő jel ellenőrzése');
 gpsInfo(keepOwnerPublishing
  ?'🟢 Saját telefon GPS-megosztása tovább működik; másik profil követése.'
  :'⚪ Nincs aktív saját GPS-megosztás; tulajdonosi jóváhagyás szükséges.');
 updateUi();resetPolling();loadSettings();
 if(!sharing)resumeOwnPhoneAutoFollow();
}
function onGpsFix(pos){
 // Legacy owner guard is retained, but browser fixes are LOCAL MAP ONLY.
 if(sharingProfile!==bound())return;
 // Do not upsert to hh_guardian_live_locations; native HH One is the sole publisher.
 // No fallback to older Supabase GPS, including when Outlook is disconnected.
 return;
}
function syncSettings(){
 if(!api||!user||!access.includes(self()))return Promise.resolve();
 const k=self(),g=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.getLocationSettings?w.HH_GUARDIAN_V761.getLocationSettings():{};
 const uid=user.id;
 const payload={profile_key:k,refresh_interval_ms:interval,follow_map:g.follow_map!==false,map_3d:g.map_3d!==false,updated_at:new Date().toISOString()};
 // v867: Map drag/follow events can fire repeatedly without changing settings.
 // Do not create a new POST (and timestamp) unless one of the values changed.
 const signature=JSON.stringify([k,uid,payload.refresh_interval_ms,payload.follow_map,payload.map_3d]);
 if(settingsSignature===signature)return settingsWrites;
 settingsSignature=signature;
 settingsWrites=settingsWrites.catch(()=>{}).then(async()=>{
  if(!user||user.id!==uid||!access.includes(k))return;
  const {error}=await api.from(PREF_TABLE).upsert(payload,{onConflict:'profile_key'});
  if(error){
   if(settingsSignature===signature)settingsSignature='';
   set('guardianLocationSyncStatus','Helybeállítások · szinkronhiba: '+error.message);
  }else set('guardianLocationSyncStatus','Helybeállítások · szinkronizálva');
 }).catch(e=>{
  if(settingsSignature===signature)settingsSignature='';
  set('guardianLocationSyncStatus','Helybeállítások · szinkronhiba: '+(e&&e.message||'hálózat'));
 });
 return settingsWrites;
}
async function loadSettings(){
 if(!api||!user||!access.includes(self()))return;
 const k=self(),uid=user.id;
 try{
  const {data,error}=await api.from(PREF_TABLE).select('refresh_interval_ms,follow_map,map_3d').eq('profile_key',k).maybeSingle();
  if(!user||user.id!==uid||self()!==k)return;
  if(error)throw error;
  if(!data){set('guardianLocationSyncStatus','Helybeállítások · alapértékek; módosításkor szinkronizálunk');return}
  if(validIntervals.includes(Number(data.refresh_interval_ms))){
   interval=Number(data.refresh_interval_ms);
   const select=$('guardianLiveInterval');if(select)select.value=String(interval);
   try{w.localStorage.setItem(INTERVAL_KEY,String(interval))}catch(_){}
  }
  // Preserve the saved refresh interval, but never use older cloud
  // follow_map/map_3d booleans to switch off the requested launch view.
  // User taps can still change and explicitly sync these settings later.
  resetPolling();set('guardianLocationSyncStatus','Helybeállítások · frissítési idő betöltve; nézet: Követés + 3D + Család');
 }catch(e){set('guardianLocationSyncStatus','Helybeállítások · felhőkapcsolat nem elérhető: '+(e&&e.message||'hálózat'))}
}
// A transient network/provider failure is not evidence of a signed-out user.
// GPS upload and peer reads remain disabled until user AND profile ACL validate.
function temporaryAuthError(error){
 const status=Number(error&&error.status);
 return w.navigator?.onLine===false||!Number.isFinite(status)||status===0||status===429||status>=500;
}
let authRetryTimer=null;
function scheduleAuthRetry(){
 if(authRetryTimer!==null||d.hidden)return;
 authRetryTimer=w.setTimeout(()=>{
  authRetryTimer=null;
  if(!user&&w.navigator?.onLine!==false)refreshAuth();
 },30000); // bounded; no auth request storm
}
async function refreshAuth(){
 if(!api||authInFlight)return;
 locationReads.clear();
 authInFlight=true;
 const token=++authGeneration;
 try{
  const who=await api.auth.getUser();
  if(who.error||!who.data||!who.data.user){
   const transient=!!who.error&&temporaryAuthError(who.error);
   // A temporary auth outage must NEVER DELETE a consented owner's last
   // verified server fix. Pause publishing; restart only after ACL recheck.
   if(sharing){if(transient)onGpsPaused();else stopSharing()}
   user=null;access=[];removePeer();
   if(transient){
    authPending=true;
    setPeerState('Mentett bejelentkezés ellenőrzésére várunk');
    msg('Átmeneti hálózati hiba. A mentett belépést újraellenőrizzük, ne jelentkezz be újra.');
    scheduleAuthRetry();return;
   }
   authPending=false;
   setPeerState('Google-bejelentkezés szükséges');
   msg('A Live működéséhez családi Google-bejelentkezés szükséges.');return;
  }
  const u=who.data.user;
  const {data,error}=await api.from('hh_profile_access').select('profile_key').in('profile_key',['monika','zsolt']);
  if(error)throw error;
  if(token!==authGeneration)return;
  const profileKeys=(data||[]).map(x=>x.profile_key).filter(x=>x==='monika'||x==='zsolt');
  if(sharing&&user&&user.id!==u.id)stopSharing();
  user=u;access=profileKeys;authPending=false;
  if(!access.includes(self()))msg('Ezzel a fiókkal nincs hozzáférés a kiválasztott profilhoz.');
  else msg('Bejelentkezve. Élő megosztás csak a saját indítógomb megnyomása után.');
  resetPolling();
  await loadSettings();
  maybeAutoStart();
 }catch(e){
  const transient=temporaryAuthError(e);
  // ACL/network outage: no new uploads, but preserve the timestamped last
  // known point. Only actual revocation/sign-out may clear the server row.
  if(sharing){if(transient)onGpsPaused();else stopSharing()}
  user=null;access=[];
  authPending=transient;
  msg(authPending?
   'A mentett belépés ellenőrzése átmenetileg nem elérhető. Megismételjük a próbát.':
   'A jogosultság ellenőrzése sikertelen; ellenőrizd a Google-belépést.');
  if(authPending)scheduleAuthRetry();
 }finally{
  authInFlight=false;updateUi();
  if(w.dispatchEvent&&w.CustomEvent)w.dispatchEvent(new w.CustomEvent('hh-guardian-auth-changed'));
 }
}
async function startSharing(){
 const p=self();
 if(!user||!access.includes(p)){
  msg('Előbb hitelesítsd a saját családi profilt.');return;
 }
 const router=w.HH_GUARDIAN_GPS_ROUTER_V1177;
 if(!router?.forProfile?.(p)){
  msg('Nincs hitelesített natív GPS-route a kiválasztott profilhoz.');return;
 }
 if(!router.connected()){
  msg('📦 Nincs Outlook Dropbox Vault kapcsolat ezen a megjelenítőn. '+
   'A HH One natív GPS-megosztást a saját telefonodon tudod engedélyezni.');return;
 }
 msg('📡 Natív GPS-adat ellenőrzése az Outlook Dropboxból…');
 try{
  const r=await router.read(p);
  if(p!==self())return; // a profil időközben megváltozott
  if(r?.status==='ok'){
   const age=Date.now()-Date.parse(r.data?.updated_at||'');
   if(Number.isFinite(age)&&age>=0&&age<=75000){
    msg('🟢 '+label(p)+' · hitelesített natív GPS-frissítés érkezett az Outlook Dropboxból.');
   }else{
    msg('🟠 '+label(p)+' · natív GPS-adat van, de nem igazoltan élő.');
   }
  }else if(r?.status==='revoked'){
   msg('🔴 '+label(p)+' · a natív helymegosztás vissza van vonva. '+
    'A saját HH One natív beállításaiban kell újra engedélyezni.');
  }else if(r?.status==='invalid'){
   msg('🔴 '+label(p)+' · a natív GPS-adat elavult vagy érvénytelen. '+
    'A saját HH One telefonon ellenőrizd a Smart Location és a helymegosztás állapotát.');
  }else if(r?.status==='not-connected'){
   msg('📦 Nincs hitelesített Outlook Dropbox kapcsolat a megjelenítőn.');
  }else if(r?.status==='missing'){
   msg('🔴 '+label(p)+' · még nincs natív GPS-adat az Outlook Dropboxban.');
  }else{
   msg('⚠️ Natív GPS-adat nem olvasható ('+String(r?.status||'error')+
    '). Ellenőrizd az Outlook Dropbox kapcsolatot és a HH One GPS-t.');
  }
 }catch(_){
  msg('⚠️ A natív GPS Outlook Dropbox ellenőrzése sikertelen. A telefon GPS-állapota ismeretlen.');
 }
}
function maybeAutoStart(){
 // Retired browser auto-publisher must never revive a Supabase location write.
 // Do not erase old local preferences during OTA or alter native consent.
 return;
}
// Revalidate auth on foreground return. A transient Google/network check failure
// must not force a previously consented owner to tap Follow every time.
// Never trigger a new consent prompt or start GPS on a different owner's phone.
function resumeOwnPhoneAutoFollow(){
 if(d.hidden)return;
 if(!user){if(api)refreshAuth();return}
 maybeAutoStart();
}
function userStopSharing(){
 // Browser Stop cannot revoke the independently consented Android share.
 msg('A natív GPS-megosztás csak a saját HH One telefonon állítható le.');
}
function resetDevice(){
 if(sharing){msg('Előbb állítsd le az élő megosztást.');return}
 if(w.confirm&&!w.confirm('Biztosan a '+label(self())+' profilhoz tartozik ez a FIZIKAI telefon?\n\nCsak a tényleges tulajdonos saját készülékén módosítsd a hozzárendelést. Más személy GPS-adatait nem mozgatjuk át.'))return;
 try{w.localStorage.removeItem(DEVICE_KEY)}catch(_){}
 removeAuto();
 updateUi();msg('Telefon-hozzárendelés törölve. A következő engedélyezéskor újra meg kell erősítened.');
}
function init(){
 const select=$('guardianLiveInterval');
 try{const saved=Number(w.localStorage.getItem(INTERVAL_KEY));if(validIntervals.includes(saved))interval=saved}catch(_){}
 if(select){select.value=String(interval);select.addEventListener('change',()=>{
  const n=Number(select.value);
  if(!validIntervals.includes(n))return;
  interval=n;try{w.localStorage.setItem(INTERVAL_KEY,String(n))}catch(_){}
  lastUploaded=0;resetPolling();syncSettings();msg('Térképi frissítési cél: '+(interval/1000)+' mp. A natív GPS saját mintavételezést használ.');
 })}
 const login=$('guardianLiveLogin');if(login)login.addEventListener('click',async()=>{
  if(!api){msg('Supabase-kapcsolat nem elérhető.');return}
  msg('Google bejelentkezés megnyitása…');
  try{
   if(NATIVE_OAUTH){
    const bridged=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);
    if(!bridged)throw Error('A HH One natív bejelentkezési híd nem áll készen.');
    return;
   }
   const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
   if(error)throw error;
  }catch(e){msg('Google-belépés nem indítható: '+String(e?.message||'kapcsolati hiba').slice(0,130))}
 });
 const logout=$('guardianLiveLogout');if(logout)logout.addEventListener('click',async()=>{await stopSharing();if(api)await api.auth.signOut();user=null;access=[];authPending=false;removePeer();resetPolling();updateUi();msg('Kijelentkezve.');if(w.dispatchEvent&&w.CustomEvent)w.dispatchEvent(new w.CustomEvent('hh-guardian-auth-changed'));});
 const start=$('guardianLiveStart');if(start)start.addEventListener('click',startSharing);
 const stop=$('guardianLiveStop');if(stop)stop.addEventListener('click',userStopSharing);
 const disable=$('guardianLiveDisableAuto');if(disable)disable.addEventListener('click',userStopSharing);
 const gpsStop=$('guardianStop');if(gpsStop)gpsStop.addEventListener('click',()=>{
  // Deliberate GPS Stop revokes the persistent choice; browser pagehide does not.
  if(autoEnabled()){removeAuto();updateUi();msg('A böngészős GPS leállítva. A natív családi megosztás állapotát ez nem módosítja.');}
 });
 const reset=$('guardianLiveResetDevice');if(reset)reset.addEventListener('click',resetDevice);
 const ownerFix=$('guardianLiveResolveOwner811');if(ownerFix)ownerFix.addEventListener('click',resetDevice);
 d.addEventListener('hh-guardian-location-settings-changed',syncSettings);
 const card=$('guardianOtherCard');if(card)card.addEventListener('click',()=>{if(map&&peerAvailable&&peerCoord)map.easeTo({center:peerCoord,zoom:Math.max(map.getZoom(),15.3),duration:750})});
 d.addEventListener('visibilitychange',()=>{if(d.hidden){onGpsPaused();if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}generation++;setPeerState('Háttérben nincs böngészős GPS · visszatéréskor frissítünk')}else{resetPolling();resumeOwnPhoneAutoFollow()}});
 w.addEventListener('pagehide',()=>{
  onGpsPaused();
  if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}
  generation++; // Ignore a pre-hide asynchronous GPS read.
 });
 // A bfcache restore does NOT rerun init(). Re-arm the read loop once,
 // without page reload or a second interval. Native foreground tracking
 // remains a separate owner-approved Android service.
 w.addEventListener('pageshow',()=>{
  if(!d.hidden&&user&&pollTimer===null)resetPolling();
  resumeOwnPhoneAutoFollow();
 });
 // Network recovery gets one immediate authenticated read; the normal
 // timer remains in charge afterwards. Poll() already deduplicates.
 w.addEventListener('online',()=>{
  if(!d.hidden&&!user&&api)refreshAuth();
  if(!d.hidden&&user&&pollTimer!==null){
   locationReads.clear();poll();
  }
 });
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')onProfileChanged()});
 updateUi();
 if(!api){msg('A Family Live hitelesített adatkapcsolata nem elérhető. A helyadat nem kerül továbbításra.');return}
 api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')w.setTimeout(refreshAuth,0)});
 refreshAuth();
}
w.HH_GUARDIAN_LIVE_V785=Object.freeze({onGpsFix,onGpsSignal,onGpsStopped,onGpsPaused,onProfileChanged,mountMap(m){map=m;locationReads.clear();resetPolling();},
 getClient(){return api},readSharedLocation,get familyAuthorized(){return !!user&&access.includes('zsolt')&&access.includes('monika')},
 get boundProfile(){return bound()},
 get sharing(){return sharing},get interval(){return interval},get authenticated(){return !!user}});
init();
})(window,document);
