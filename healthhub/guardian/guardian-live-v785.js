/* Family Guard v785 · user-consented, authenticated, foreground-only Family Live.
 * Each real phone uploads only its own explicitly selected profile's current GPS fix.
 * RLS controls readers/writers in hh_guardian_live_locations; never write a history.
 * Revocable, one-time owner consent enables automatic FOREGROUND reactivation only.
 * Browser background GPS remains OFF. Keep the consented last known fix with a
 * timestamp/stale marker, never mistake it for live tracking.
 * No GPS history and no synthetic family markers.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const cfg=w.HH_CENTRAL_VAULT;
const api=cfg&&cfg.enabled&&cfg.supabaseUrl&&cfg.publishableKey&&w.supabase&&w.supabase.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
 }):null;
const TABLE='hh_guardian_live_locations',PREF_TABLE='hh_guardian_location_settings',AGE_MS=20000,LAST_KNOWN_MS=12*60*60*1000,ACCURACY_LIMIT=100;
const DEVICE_KEY='hh-guardian-own-phone-profile-v785',INTERVAL_KEY='hh-guardian-refresh-v785';
const AUTO_KEY='hh-guardian-foreground-auto-v786';
const validIntervals=[1000,3000,5000,10000,30000,60000];
let user=null,access=[],map=null,peerMarker=null,peerCoord=null,sharing=false,sharingProfile=null;
let interval=5000,pollTimer=null,polling=false,generation=0,lastUploaded=0,lastSeen=null;
let uploads=Promise.resolve(),settingsWrites=Promise.resolve(),authGeneration=0,authInFlight=false,peerAvailable=false,peerUpdatedAt=null;
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
 set('guardianLiveAuth',user?'Hitelesítve · családi hozzáférés ellenőrizve':'Google-bejelentkezés szükséges');
 const login=$('guardianLiveLogin'),logout=$('guardianLiveLogout');
 if(login)login.hidden=!!user;if(logout)logout.hidden=!user;
 const start=$('guardianLiveStart'),stop=$('guardianLiveStop');
 if(start){start.disabled=!meReady||sharing||ownerMismatch;start.hidden=sharing}
 if(stop){stop.disabled=!sharing;stop.hidden=!sharing}
 const reset=$('guardianLiveResetDevice');if(reset){
  reset.hidden=!owner;
  reset.textContent=ownerMismatch?'📱 Saját telefon hozzárendelésének ellenőrzése':'Ez egy másik családtag telefonja';
 }
 const auto=autoEnabled();
 set('guardianLiveAutoStatus',auto?'Automatikus előtéri indulás: BE · csak ezen a telefonon, amíg ki nem kapcsolod.':'Automatikus előtéri indulás: KI · egyszeri jóváhagyás szükséges.');
 const disableAuto=$('guardianLiveDisableAuto');if(disableAuto)disableAuto.hidden=!auto;
 if(!user)set('guardianOtherState','Csak belépés után kérdezhető le');
 else if(!access.includes(other()))set('guardianOtherState','Nincs hozzáférés ehhez a profilhoz');
}
function removePeer(){
 peerAvailable=false;peerCoord=null;peerUpdatedAt=null;
 if(peerMarker){peerMarker.remove();peerMarker=null}
 const card=$('guardianOtherCard');if(card){card.classList.remove('live');card.classList.remove('guardian-last-known-v807')}
}
function setPeerState(s){set('guardianOtherState',s);set('guardianLivePeerStatus',s)}
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
 return {age,live:age<=AGE_MS,coord:[data.longitude,data.latitude]};
}
function peerStatus(data,age){
 if(age<=AGE_MS){
  const speed=Number.isFinite(data.speed_kmh)?' · '+data.speed_kmh.toFixed(1).replace('.',',')+' km/h':'';
  return '🟢 ÉLŐ · '+time(data.updated_at)+' · ±'+Math.round(data.accuracy_m)+' m'+speed;
 }
 return '🕘 UTOLSÓ ISMERT HELY · '+time(data.updated_at)+' ('+
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
async function poll(){
 if(polling||d.hidden||!user||!access.includes(other())||!api)return;
 polling=true;
 const token=generation,k=other();
 try{
  const {data,error}=await api.from(TABLE).select('profile_key,latitude,longitude,accuracy_m,updated_at,speed_kmh')
   .eq('profile_key',k).maybeSingle();
  if(token!==generation||d.hidden||k!==other()||!user)return;
  if(error)throw error;
  if(!data){
   removePeer();setPeerState('Nincs megosztott hely: a családtag leállította, vagy még nem engedélyezte.');
   return;
  }
  displayPeer(data);
 }catch(e){
  if(token===generation){
   // Temporary network failure must not silently remove a still valid, consented fix.
   const known=peerAvailable&&peerUpdatedAt&&Date.now()-Date.parse(peerUpdatedAt)<=LAST_KNOWN_MS;
   if(!known)removePeer();
   else{
    const card=$('guardianOtherCard');
    if(card){card.classList.remove('live');card.classList.add('guardian-last-known-v807')}
    if(peerMarker&&peerMarker.getElement){
     const el=peerMarker.getElement();if(el)el.classList.add('guardian-peer-stale-v807');
    }
   }
   setPeerState((known?'⚠️ Utolsó ismert hely megőrizve · ':'⚠️ Nincs új helyadat · ')+
    'kapcsolati hiba, NEM élő követés');
  }
 }finally{polling=false}
}
function resetPolling(){
 if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}
 generation++;
 if(user&&!d.hidden){
  poll();pollTimer=w.setInterval(poll,interval);
 }
}
function clearRow(k,uid){
 if(!api||!k||!uid)return Promise.resolve();
 uploads=uploads.catch(()=>{}).then(async()=>{
  const {error}=await api.from(TABLE).delete().eq('profile_key',k).eq('owner_id',uid);
  if(error)msg('Megosztás leállítva. A szerverről a jel törlése nem igazolható; 20 mp után a térképről eltűnik.');
 }).catch(()=>{msg('Megosztás leállítva. A távoli jel legkésőbb 20 mp után nem látszik élőként.')});
 return uploads;
}
function stopSharing(){
 const k=sharingProfile,uid=user&&user.id;
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
 stopSharing();removePeer();
 setPeerState('Új profil · élő jel ellenőrzése');
 gpsInfo('⚪ Profilváltás után a böngészős GPS-t külön újra kell indítani.');
 updateUi();resetPolling();loadSettings();maybeAutoStart();
}
function onGpsFix(pos){
 if(!api||!sharing||!user||d.hidden||sharingProfile!==self()||!access.includes(sharingProfile))return;
 const c=pos&&pos.coords||{},lat=Number(c.latitude),lon=Number(c.longitude),accuracy=Number(c.accuracy);
 const ts=Number(pos.timestamp)||Date.now();
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(accuracy)||
  Math.abs(lat)>90||Math.abs(lon)>180||accuracy<0||accuracy>ACCURACY_LIMIT||
  Date.now()-ts>AGE_MS)return;
 let speed=(typeof c.speed==='number'&&Number.isFinite(c.speed)&&c.speed>=0)?c.speed*3.6:null;
 if(speed===null&&lastSeen){
  const dt=(ts-lastSeen.ts)/1000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(lat-lastSeen.lat),dLon=toRad(lon-lastSeen.lon);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat))*Math.cos(toRad(lastSeen.lat))*Math.sin(dLon/2)**2;
  if(dt>0&&dt<30&&accuracy<40&&lastSeen.accuracy<40)speed=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)))/dt*3.6;
 }
 lastSeen={lat,lon,ts,accuracy};
 const kmh=speed!==null&&speed<=300?Math.round(speed*10)/10:null;
 set('guardianLiveOwnSpeed',kmh===null?'—':kmh.toFixed(1).replace('.',',')+' km/h');
 const now=Date.now();if(now-lastUploaded<interval)return;
 lastUploaded=now;
 const uid=user.id,k=sharingProfile;
 const payload={profile_key:k,owner_id:uid,latitude:lat,longitude:lon,accuracy_m:accuracy,
  speed_kmh:kmh,updated_at:new Date(now).toISOString()};
 uploads=uploads.catch(()=>{}).then(async()=>{
  if(!sharing||sharingProfile!==k||!user||user.id!==uid||d.hidden)return;
  const {error}=await api.from(TABLE).upsert(payload,{onConflict:'profile_key'});
  if(error){lastUploaded=0;msg('GPS működik, de a helymegosztás nem sikerült: '+error.message)}
  else if(sharing&&sharingProfile===k)msg('ÉLŐ megosztás · '+label(k)+' · frissítve '+time(payload.updated_at));
 }).catch(e=>{lastUploaded=0;msg('Megosztási hiba: '+(e&&e.message||'hálózat'))});
}
function syncSettings(){
 if(!api||!user||!access.includes(self()))return Promise.resolve();
 const k=self(),g=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.getLocationSettings?w.HH_GUARDIAN_V761.getLocationSettings():{};
 const payload={profile_key:k,refresh_interval_ms:interval,follow_map:g.follow_map!==false,map_3d:g.map_3d!==false,updated_at:new Date().toISOString()};
 settingsWrites=settingsWrites.catch(()=>{}).then(async()=>{
  if(!user||!access.includes(k))return;
  const {error}=await api.from(PREF_TABLE).upsert(payload,{onConflict:'profile_key'});
  if(error)set('guardianLocationSyncStatus','Helybeállítások · szinkronhiba: '+error.message);
  else set('guardianLocationSyncStatus','Helybeállítások · szinkronizálva');
 }).catch(e=>set('guardianLocationSyncStatus','Helybeállítások · szinkronhiba: '+(e&&e.message||'hálózat')));
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
async function refreshAuth(){
 if(!api||authInFlight)return;
 authInFlight=true;
 const token=++authGeneration;
 try{
  const who=await api.auth.getUser();
  if(who.error||!who.data||!who.data.user){if(sharing)stopSharing();user=null;access=[];removePeer();setPeerState('Google-bejelentkezés szükséges');msg('A Live működéséhez családi Google-bejelentkezés szükséges.');return}
  const u=who.data.user;
  const {data,error}=await api.from('hh_profile_access').select('profile_key').in('profile_key',['monika','zsolt']);
  if(error)throw error;
  if(token!==authGeneration)return;
  const profileKeys=(data||[]).map(x=>x.profile_key).filter(x=>x==='monika'||x==='zsolt');
  if(sharing&&user&&user.id!==u.id)stopSharing();
  user=u;access=profileKeys;
  if(!access.includes(self()))msg('Ezzel a fiókkal nincs hozzáférés a kiválasztott profilhoz.');
  else msg('Bejelentkezve. Élő megosztás csak a saját indítógomb megnyomása után.');
  resetPolling();
  await loadSettings();
  maybeAutoStart();
 }catch(e){if(sharing)stopSharing();user=null;access=[];msg('Hitelesítés/hálózat hiba: '+(e&&e.message||'kapcsolat'))}
 finally{authInFlight=false;updateUi();if(w.dispatchEvent&&w.CustomEvent)w.dispatchEvent(new w.CustomEvent('hh-guardian-auth-changed'))}
}
function startSharing(){
 const p=self();
 if(sharing||d.hidden)return;
 if(!user){msg('Előbb jelentkezz be a Google-fiókoddal.');return}
 if(!access.includes(p)){msg('Ez a Google-fiók nem jogosult a '+label(p)+' profilhoz.');return}
 const registered=bound();
 if(registered&&registered!==p){
  updateUi();
  msg('⚠️ Ez a telefon a '+label(registered)+' profilhoz van rögzítve. Ha valóban '+label(p)+' saját készüléke, használd a fenti telefon-hozzárendelés ellenőrzése gombot. Másik személy helyét nem másoljuk.');
  return;
 }
 if(!autoEnabled()){
  // The owner must explicitly grant the persistent preference on THIS device.
  const consent='Ez valóban '+label(p)+' saját telefonja?\n\nEGYSZERI ENGEDÉLY: a Family Guard megnyitásakor vagy előtérbe visszatérve automatikusan indulhat a SAJÁT GPS, a térképes követés és a családi élő helymegosztás.\n\nA böngésző háttérben és lezárt képernyőn NEM követ. A megosztást bármikor visszavonhatod a Leállítás gombbal. Engedélyezed?';
  if(!w.confirm||!w.confirm(consent)){msg('Az automatikus helymegosztás nincs engedélyezve ezen a telefonon.');return}
  try{
   w.localStorage.setItem(DEVICE_KEY,p);
   w.localStorage.setItem(AUTO_KEY,p);
  }catch(e){msg('A hozzájárulás tárolása sikertelen. A megosztás nem indult el.');return}
 }
 sharing=true;sharingProfile=p;lastUploaded=0;lastSeen=null;
 updateUi();msg('Automatikus előtéri megosztás bekapcsolva · GPS-jelre várunk…');
 const guardian=w.HH_GUARDIAN_V761;
 if(guardian&&typeof guardian.startFollowing==='function')guardian.startFollowing();
 else if(!guardian||!guardian.active){const start=$('guardianStart');if(start)start.click()}
}
function maybeAutoStart(){
 if(sharing||d.hidden||!user||!access.includes(self())||!autoEnabled())return;
 startSharing();
}
function userStopSharing(){
 removeAuto();
 stopSharing();
 const stop=$('guardianStop');if(stop&&!stop.disabled)stop.click();
 updateUi();
 msg('Megosztás és automatikus újraindítás kikapcsolva ezen a telefonon.');
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
  lastUploaded=0;resetPolling();syncSettings();msg('Élő frissítési cél: '+(interval/1000)+' mp. A GPS valós sebessége eltérhet.');
 })}
 const login=$('guardianLiveLogin');if(login)login.addEventListener('click',async()=>{
  if(!api){msg('Supabase-kapcsolat nem elérhető.');return}
  msg('Google bejelentkezés megnyitása…');
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)msg('Google-belépés nem indítható: '+error.message);
 });
 const logout=$('guardianLiveLogout');if(logout)logout.addEventListener('click',async()=>{await stopSharing();if(api)await api.auth.signOut();user=null;access=[];removePeer();resetPolling();updateUi();msg('Kijelentkezve.');if(w.dispatchEvent&&w.CustomEvent)w.dispatchEvent(new w.CustomEvent('hh-guardian-auth-changed'));});
 const start=$('guardianLiveStart');if(start)start.addEventListener('click',startSharing);
 const stop=$('guardianLiveStop');if(stop)stop.addEventListener('click',userStopSharing);
 const disable=$('guardianLiveDisableAuto');if(disable)disable.addEventListener('click',userStopSharing);
 const gpsStop=$('guardianStop');if(gpsStop)gpsStop.addEventListener('click',()=>{
  // Deliberate GPS Stop revokes the persistent choice; browser pagehide does not.
  if(autoEnabled()){removeAuto();updateUi();msg('A GPS és az automatikus helymegosztás leállítva.');}
 });
 const reset=$('guardianLiveResetDevice');if(reset)reset.addEventListener('click',resetDevice);
 const ownerFix=$('guardianLiveResolveOwner811');if(ownerFix)ownerFix.addEventListener('click',resetDevice);
 d.addEventListener('hh-guardian-location-settings-changed',syncSettings);
 const card=$('guardianOtherCard');if(card)card.addEventListener('click',()=>{if(map&&peerAvailable&&peerCoord)map.easeTo({center:peerCoord,zoom:Math.max(map.getZoom(),15.3),duration:750})});
 d.addEventListener('visibilitychange',()=>{if(d.hidden){onGpsPaused();if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}generation++;setPeerState('Háttérben nincs böngészős GPS · visszatéréskor frissítünk')}else{resetPolling();maybeAutoStart()}});
 w.addEventListener('pagehide',()=>{onGpsPaused();if(pollTimer!==null)w.clearInterval(pollTimer)});
 w.addEventListener('pageshow',()=>{if(!d.hidden)maybeAutoStart()});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')onProfileChanged()});
 updateUi();
 if(!api){msg('A Family Live hitelesített adatkapcsolata nem elérhető. A helyadat nem kerül továbbításra.');return}
 api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')w.setTimeout(refreshAuth,0)});
 refreshAuth();
}
w.HH_GUARDIAN_LIVE_V785=Object.freeze({onGpsFix,onGpsSignal,onGpsStopped,onGpsPaused,onProfileChanged,mountMap(m){map=m;resetPolling();},
 getClient(){return api},get familyAuthorized(){return !!user&&access.includes('zsolt')&&access.includes('monika')},
 get boundProfile(){return bound()},
 get sharing(){return sharing},get interval(){return interval},get authenticated(){return !!user}});
init();
})(window,document);
