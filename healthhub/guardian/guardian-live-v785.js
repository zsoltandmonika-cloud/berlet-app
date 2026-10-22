/* Family Guard v785 · user-consented, authenticated, foreground-only Family Live.
 * Each real phone uploads only its own explicitly selected profile's current GPS fix.
 * RLS controls readers/writers in hh_guardian_live_locations; never write a history.
 * No auto-start GPS, no background tracking, no synthetic family markers.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const cfg=w.HH_CENTRAL_VAULT;
const api=cfg&&cfg.enabled&&cfg.supabaseUrl&&cfg.publishableKey&&w.supabase&&w.supabase.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
 }):null;
const TABLE='hh_guardian_live_locations',AGE_MS=20000,ACCURACY_LIMIT=100;
const DEVICE_KEY='hh-guardian-own-phone-profile-v785',INTERVAL_KEY='hh-guardian-refresh-v785';
const validIntervals=[1000,3000,5000,10000,30000,60000];
let user=null,access=[],map=null,peerMarker=null,peerCoord=null,sharing=false,sharingProfile=null;
let interval=5000,pollTimer=null,polling=false,generation=0,lastUploaded=0,lastSeen=null;
let uploads=Promise.resolve(),authGeneration=0,authInFlight=false,peerAvailable=false;
function self(){return w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function other(){return self()==='monika'?'zsolt':'monika'}
function label(k){return k==='monika'?'Mónika':'Zsolt'}
function time(iso){return new Date(iso).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function msg(s){const el=$('guardianLiveStatus');if(el)el.textContent=s}
function set(elId,s){const el=$(elId);if(el)el.textContent=s}
function bound(){try{return w.localStorage.getItem(DEVICE_KEY)}catch(_){return null}}
function updateUi(){
 const me=self(),meReady=!!user&&access.includes(me);
 set('guardianLiveIdentity','Saját profil: '+label(me)+(bound()?' · telefonhoz rögzítve':' · még nincs hozzárendelve'));
 set('guardianLiveAuth',user?'Hitelesítve · családi hozzáférés ellenőrizve':'Google-bejelentkezés szükséges');
 const login=$('guardianLiveLogin'),logout=$('guardianLiveLogout');
 if(login)login.hidden=!!user;if(logout)logout.hidden=!user;
 const start=$('guardianLiveStart'),stop=$('guardianLiveStop');
 if(start){start.disabled=!meReady||sharing;start.hidden=sharing}
 if(stop){stop.disabled=!sharing;stop.hidden=!sharing}
 const reset=$('guardianLiveResetDevice');if(reset)reset.hidden=!bound();
 if(!user)set('guardianOtherState','Csak belépés után kérdezhető le');
 else if(!access.includes(other()))set('guardianOtherState','Nincs hozzáférés ehhez a profilhoz');
}
function removePeer(){
 peerAvailable=false;peerCoord=null;
 if(peerMarker){peerMarker.remove();peerMarker=null}
 const card=$('guardianOtherCard');if(card)card.classList.remove('live');
}
function setPeerState(s){set('guardianOtherState',s);set('guardianLivePeerStatus',s)}
function renderPeer(data){
 if(!map||!w.maplibregl||!w.maplibregl.Marker)return;
 const k=other(),av=w.HH_GOLDEN_AVATARS_V529||{};
 const el=d.createElement('div');el.className='guardian-position guardian-peer-position';
 el.setAttribute('data-guardian-person',k==='monika'?'m':'z');
 el.setAttribute('role','img');el.setAttribute('aria-label',label(k)+' · friss, engedélyezett GPS-adat');
 const photo=d.createElement('span');photo.className='guardian-position-photo';
 const img=d.createElement('img');img.alt='';img.src=k==='monika'?av.m:av.z;
 photo.appendChild(img);el.appendChild(photo);
 const name=d.createElement('span');name.className='guardian-position-label';name.textContent=label(k);el.appendChild(name);
 peerMarker=new w.maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([data.longitude,data.latitude]).addTo(map);
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
  const age=data?Date.now()-Date.parse(data.updated_at):Infinity;
  if(!data||!Number.isFinite(age)||age< -5000||age>AGE_MS||
   !Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)||data.accuracy_m>ACCURACY_LIMIT){
   removePeer();
   setPeerState('Nincs friss élő jel · 20 mp után eltűnik a jelölő');
   return;
  }
  const loc=[data.longitude,data.latitude];
  if(!peerMarker)renderPeer(data);
  else peerMarker.setLngLat(loc);
  peerCoord=loc;peerAvailable=true;
  const card=$('guardianOtherCard');if(card)card.classList.add('live');
  const speed=Number.isFinite(data.speed_kmh)?' · '+data.speed_kmh.toFixed(1).replace('.',',')+' km/h':'';
  setPeerState('ÉLŐ · '+time(data.updated_at)+' · ±'+Math.round(data.accuracy_m)+' m'+speed);
 }catch(e){
  if(token===generation){removePeer();setPeerState('Nem sikerült lekérdezni · '+(e&&e.message?e.message:'hálózati hiba'))}
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
 if(k&&uid)clearRow(k,uid);
 if(k)msg('Élő helymegosztás kikapcsolva ezen a telefonon.');
}
function onGpsStopped(){if(sharing)stopSharing()}
function onProfileChanged(){
 stopSharing();removePeer();
 setPeerState('Új profil · élő jel ellenőrzése');
 updateUi();resetPolling();
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
 }catch(e){if(sharing)stopSharing();user=null;access=[];msg('Hitelesítés/hálózat hiba: '+(e&&e.message||'kapcsolat'))}
 finally{authInFlight=false;updateUi()}
}
function startSharing(){
 const p=self();
 if(!user){msg('Előbb jelentkezz be a Google-fiókoddal.');return}
 if(!access.includes(p)){msg('Ez a Google-fiók nem jogosult a '+label(p)+' profilhoz.');return}
 const registered=bound();
 if(registered&&registered!==p){msg('Ez a telefon a '+label(registered)+' profilhoz van rögzítve. Előbb módosítsd a készülék-hozzárendelést.');return}
 if(!registered){
  if(w.confirm&&!w.confirm('Ez valóban '+label(p)+' saját telefonja?\n\nA Live indításával engedélyezed, hogy a telefon VALÓDI helyzete megjelenjen a családi térképen, kizárólag amíg a lap nyitva van.'))return;
  try{w.localStorage.setItem(DEVICE_KEY,p)}catch(e){msg('A telefonprofil rögzítése sikertelen.');return}
 }
 sharing=true;sharingProfile=p;lastUploaded=0;lastSeen=null;
 updateUi();msg('Megosztás engedélyezve. GPS-jelre várunk…');
 if(!w.HH_GUARDIAN_V761||!w.HH_GUARDIAN_V761.active){
  const start=$('guardianStart');if(start)start.click();
 }
}
function resetDevice(){
 if(sharing){msg('Előbb állítsd le az élő megosztást.');return}
 if(w.confirm&&!w.confirm('Megváltoztatod, hogy kihez tartozik ez a telefon? A korábbi személy GPS-adatait ez nem mozgatja át.'))return;
 try{w.localStorage.removeItem(DEVICE_KEY)}catch(_){}
 updateUi();msg('Telefon-hozzárendelés törölve. A következő engedélyezéskor újra meg kell erősítened.');
}
function init(){
 const select=$('guardianLiveInterval');
 try{const saved=Number(w.localStorage.getItem(INTERVAL_KEY));if(validIntervals.includes(saved))interval=saved}catch(_){}
 if(select){select.value=String(interval);select.addEventListener('change',()=>{
  const n=Number(select.value);
  if(!validIntervals.includes(n))return;
  interval=n;try{w.localStorage.setItem(INTERVAL_KEY,String(n))}catch(_){}
  lastUploaded=0;resetPolling();msg('Élő frissítési cél: '+(interval/1000)+' mp. A GPS valós sebessége eltérhet.');
 })}
 const login=$('guardianLiveLogin');if(login)login.addEventListener('click',async()=>{
  if(!api){msg('Supabase-kapcsolat nem elérhető.');return}
  msg('Google bejelentkezés megnyitása…');
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)msg('Google-belépés nem indítható: '+error.message);
 });
 const logout=$('guardianLiveLogout');if(logout)logout.addEventListener('click',async()=>{await stopSharing();if(api)await api.auth.signOut();user=null;access=[];removePeer();resetPolling();updateUi();msg('Kijelentkezve.');});
 const start=$('guardianLiveStart');if(start)start.addEventListener('click',startSharing);
 const stop=$('guardianLiveStop');if(stop)stop.addEventListener('click',stopSharing);
 const reset=$('guardianLiveResetDevice');if(reset)reset.addEventListener('click',resetDevice);
 const card=$('guardianOtherCard');if(card)card.addEventListener('click',()=>{if(map&&peerAvailable&&peerCoord)map.easeTo({center:peerCoord,zoom:Math.max(map.getZoom(),15.3),duration:750})});
 d.addEventListener('visibilitychange',()=>{if(d.hidden){onGpsStopped();if(pollTimer!==null){w.clearInterval(pollTimer);pollTimer=null}generation++;removePeer();setPeerState('Háttérben nincs élő helyzetkövetés')}else resetPolling()});
 w.addEventListener('pagehide',()=>{onGpsStopped();if(pollTimer!==null)w.clearInterval(pollTimer)});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')onProfileChanged()});
 updateUi();
 if(!api){msg('A Family Live hitelesített adatkapcsolata nem elérhető. A helyadat nem kerül továbbításra.');return}
 api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')w.setTimeout(refreshAuth,0)});
 refreshAuth();
}
w.HH_GUARDIAN_LIVE_V785=Object.freeze({onGpsFix,onGpsStopped,onProfileChanged,mountMap(m){map=m;resetPolling();},
 get sharing(){return sharing},get interval(){return interval},get authenticated(){return !!user}});
init();
})(window,document);
