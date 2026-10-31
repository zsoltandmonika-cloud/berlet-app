/* Family Guard Smart Places v1068 · one-tap verified profile fix → family travel sync.
 * Uses existing HH_TRAVEL_FAVORITES_V972 RLS-backed 40-slot collection.
 * No new GPS reads, DB schema, native APK, background trackers or remote push.
 */
(function(w,d){
 'use strict';
 const root=d.getElementById('guardianSmartPlaceDialogV1068');
 if(!root)return;
 const $=id=>d.getElementById(id);
 const name=$('guardianSmartPlaceNameV1068'),radius=$('guardianSmartPlaceRadiusV1068');
 const arrive=$('guardianSmartPlaceArrivalV1068'),leave=$('guardianSmartPlaceDepartureV1068');
 const save=$('guardianSmartPlaceSaveV1068'),remove=$('guardianSmartPlaceDeleteV1068');
 const close=$('guardianSmartPlaceCloseV1068'),feedback=$('guardianSmartPlaceStatusV1068');
 const enable=$('guardianSmartPlaceSoundV1068'),toast=$('guardianSmartPlaceToastV1068');
 const MARK='Smart Places',RADII=[100,150,200,300],SOUNDS=['chime','bell','digital','silent'];
 const LABELS={chime:'Lágy csengő',bell:'Dupla csilingelés',digital:'Digitális',silent:'Néma'};
 const KEY='hh-smart-places-alerts-v1068',MAX_MS=75000,MAX_ACCURACY=100;
 const pool=()=>w.HH_TRAVEL_FAVORITES_V972;
 const live=()=>w.HH_GUARDIAN_LIVE_V785;
 const own=p=>p==='monika'?'Mónika':'Zsolt';
 const validOwner=p=>p==='monika'||p==='zsolt';
 let last=null,marker=null,matched=null,previous=new Map(),audio=null,enabled=false,flashTimer=0;
 try{enabled=w.localStorage?.getItem(KEY)==='on'}catch(_){}
 enable.checked=enabled;
 function authorized(profile){
  const l=live();
  return validOwner(profile)&&l?.authenticated===true&&l?.familyAuthorized===true&&!!l?.getClient?.();
 }
 function fresh(fix){
  return !!fix&&validOwner(fix.profile)&&Number.isFinite(fix.lat)&&Number.isFinite(fix.lng)&&
   Math.abs(fix.lat)<=90&&Math.abs(fix.lng)<=180&&Number.isFinite(fix.accuracy)&&
   fix.accuracy>=0&&fix.accuracy<=MAX_ACCURACY&&Number.isFinite(fix.ts)&&
   fix.ts<=Date.now()+5000&&Date.now()-fix.ts>=0&&Date.now()-fix.ts<=MAX_MS;
 }
 function distance(a,b){
  return Math.hypot((a.lat-b.lat)*111195,(a.lng-b.lng)*111195*
   Math.cos(((a.lat+b.lat)/2)*Math.PI/180));
 }
 // The subtitle is human-readable, shared via the EXISTING family travel slot.
 // Encoding is deliberately versioned and bounded; all fields are allowlisted.
 function encode(profile,r,arrival,departure){
  return MARK+' • '+profile+' • '+r+' m • '+arrival+' • '+departure;
 }
 function decode(subtitle){
  const parts=String(subtitle||'').split(' • ');
  if(parts.length!==5||parts[0]!==MARK||!validOwner(parts[1]))return null;
  const r=Number(parts[2].replace(/ m$/,''));
  if(!RADII.includes(r)||!SOUNDS.includes(parts[3])||!SOUNDS.includes(parts[4]))return null;
  return {profile:parts[1],radius:r,arrival:parts[3],departure:parts[4]};
 }
 function places(profile){
  const slots=pool()?.getSlots?.()||[];
  return slots.flatMap((s,i)=>{
   const config=decode(s?.place?.subtitle);
   const p=s?.place;
   return config&&config.profile===profile&&p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
    Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&String(s.label||'').trim()?
    [{index:i,name:String(s.label).slice(0,40),lat:p.lat,lng:p.lng,...config}]:[];
  });
 }
 function nearest(fix){
  const list=places(fix.profile);
  let best=null,meters=Infinity;
  for(const p of list){const m=distance(fix,p);if(m<=p.radius&&m<meters){best=p;meters=m}}
  return best;
 }
 function message(s){feedback.textContent=s}
 function bubble(fix){
  if(!marker)return;
  let tag=marker.querySelector?.('.hh-smart-place-location-v1068');
  if(!tag){
   const parent=marker.querySelector?.('.guardian-position-label');
   if(!parent)return;
   tag=d.createElement('span');tag.className='hh-smart-place-location-v1068';
   parent.appendChild(tag);
  }
  const place=fresh(fix)?nearest(fix):null;
  tag.textContent=place?'📍 '+place.name:'';
  tag.hidden=!place;
  matched=place;
 }
 function tone(which){
  if(!enabled||which==='silent'||d.hidden)return;
  try{
   const C=w.AudioContext||w.webkitAudioContext;
   if(!C)return;
   if(!audio)audio=new C();
   if(audio.state!=='running')return;
   const t=audio.currentTime;
   const notes=which==='bell'?[880,1175]:which==='digital'?[660,780,990]:[784];
   notes.forEach((hz,i)=>{
    const o=audio.createOscillator(),g=audio.createGain(),start=t+i*.18;
    o.type=which==='digital'?'square':'sine';o.frequency.value=hz;
    g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(.065,start+.025);
    g.gain.exponentialRampToValueAtTime(.0001,start+.19);
    o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+.20);
   });
  }catch(_){}
 }
 function notify(place,type){
  if(!enabled||d.hidden)return;
  const text=own(place.profile)+(type==='arrival'?' megérkezett ide: ':' elindult innen: ')+place.name;
  toast.textContent='🔔 '+text;toast.hidden=false;
  w.clearTimeout?.(flashTimer);flashTimer=w.setTimeout?.(()=>{toast.hidden=true},6200);
  tone(type==='arrival'?place.arrival:place.departure);
  // Only when already granted by explicit user gesture. Never request permission silently.
  try{if(w.Notification?.permission==='granted')new w.Notification('SH9 Smart Places',{body:text,tag:'sh9-place-'+place.profile+'-'+place.index})}catch(_){}
 }
 function evaluate(fix){
  if(!fresh(fix))return; // neither leave nor arrive on stale/noisy GPS.
  for(const p of places(fix.profile)){
   const k=p.profile+':'+p.index,meters=distance(fix,p);
   const next=meters<=p.radius?'inside':meters>=p.radius+Math.max(40,fix.accuracy)?'outside':'border';
   if(next==='border')continue;
   const old=previous.get(k);
   // Require TWO distinct fixes separated by at least 8s before a state change.
   if(!old){previous.set(k,{stable:next,candidate:null,ts:fix.ts});continue}
   if(next===old.stable){old.candidate=null;old.ts=fix.ts;continue}
   if(old.candidate!==next){old.candidate=next;old.candidateAt=fix.ts;continue}
   if(fix.ts-old.candidateAt<8000)continue;
   const changed=old.stable;
   old.stable=next;old.candidate=null;old.ts=fix.ts;
   if(changed!==next)notify(p,next==='inside'?'arrival':'departure');
  }
 }
 function putFix(fix,node){
  if(!fresh(fix)||!authorized(fix.profile)){last=null;marker=node||null;matched=null;
   if(marker){const tag=marker.querySelector?.('.hh-smart-place-location-v1068');if(tag)tag.hidden=true}
   return;
  }
  last={...fix};marker=node||marker;
  if(!marker)return;
  if(!marker.querySelector?.('.hh-smart-place-save-v1068')){
   const button=d.createElement('button');button.type='button';button.className='hh-smart-place-save-v1068';
   button.textContent='📍 Rögzítés';button.title='Ezt a friss helyet mentsd Smart Places-ként';
   button.setAttribute('aria-label','Jelenlegi hely rögzítése a családi Smart Places-be');
   button.addEventListener('click',e=>{
    e.stopPropagation();e.preventDefault();
    void quickSave();
   });
   marker.appendChild(button);
  }
  bubble(fix);evaluate(fix);
 }
 function openEditor(){
  if(!last)return;
  const p=nearest(last);
  name.value=p?.name||own(last.profile)+' helye';
  radius.value=String(p?.radius||150);
  arrive.value=p?.arrival||'chime';leave.value=p?.departure||'bell';
  remove.hidden=!p;remove.disabled=!p;
  message(p?'Mentett hely szerkesztése.':'Az első mentéshez adj nevet a helynek.');
  if(root.showModal)root.showModal();else root.setAttribute('open','');
 }
 function defaultName(){
  const fmt=new Intl.DateTimeFormat('hu-HU',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'});
  return own(last.profile)+' · '+fmt.format(new Date(last.ts)).replace(/\s+/g,' ');
 }
 async function storePlace(existing,rawName,r,a,b){
  const p=pool();
  if(!p||!last||!fresh(last)||!authorized(last.profile))throw Error('Nincs friss, jóváhagyott GPS-adat vagy családi bejelentkezés.');
  const clean=String(rawName||'').trim().slice(0,40);
  if(!clean)throw Error('Adj nevet a helynek.');
  if(!RADII.includes(r)||!SOUNDS.includes(a)||!SOUNDS.includes(b))throw Error('Hibás értesítési beállítás.');
  const slots=p.getSlots();
  const i=existing?.index??slots.findIndex(x=>!x.place);
  if(i<0||i>=slots.length)throw Error('A 40 családi kedvenc hely betelt. Szabadíts fel egy helyet.');
  const place={name:clean,subtitle:encode(last.profile,r,a,b),lat:last.lat,lng:last.lng};
  slots[i]={label:clean,place};
  if(!p.setSlots(slots))throw Error('Nem sikerült menteni.');
  const synced=await p.sync(true);
  previous.delete(last.profile+':'+i);
  bubble(last);
  return {name:clean,synced};
 }
 async function quickSave(){
  if(!last||!fresh(last)||!authorized(last.profile))return;
  // Exactly one tap records a fresh, authorized position with a default label.
  const p=nearest(last);
  if(p){openEditor();return}
  try{
   const result=await storePlace(null,defaultName(),150,'chime','bell');
   openEditor();
   message(result.synced?'✓ Hely rögzítve és családi SYNC kész. Nevezd át, ha szeretnéd.':
    '✓ Hely rögzítve. ☁ Családi szinkronra vár. Nevezd át, ha szeretnéd.');
  }catch(e){openEditor();message('Nem menthető: '+(e?.message||'hiba'))}
 }
 save.addEventListener('click',async()=>{
  if(!last||!fresh(last))return message('A korábbi GPS-pozíció elavult. Kérj friss helyadatot.');
  save.disabled=true;
  try{
   const r=await storePlace(nearest(last),name.value,Number(radius.value),arrive.value,leave.value);
   message(r.synced?'✓ Hely mentve és szinkronizálva.':'✓ Hely mentve · a családi szinkron függőben.');
  }catch(e){message('Mentési hiba: '+(e?.message||'hiba'))}
  finally{save.disabled=false}
 });
 remove.addEventListener('click',async()=>{
  if(!last||!fresh(last)||!authorized(last.profile))return;
  const p=nearest(last),poolApi=pool();if(!p||!poolApi)return;
  if(typeof w.confirm==='function'&&!w.confirm('Töröljük a családi Smart Places helyet? '+p.name))return;
  const slots=poolApi.getSlots();slots[p.index].place=null;
  poolApi.setSlots(slots);previous.delete(p.profile+':'+p.index);
  const synced=await poolApi.sync(true);
  bubble(last);root.close?.();message(synced?'Hely törölve mindkét telefonról.':'Hely törlése sorban, családi szinkronra vár.');
 });
 close.addEventListener('click',()=>root.close?.());
 enable.addEventListener('change',()=>{
  enabled=enable.checked;
  try{w.localStorage?.setItem(KEY,enabled?'on':'off')}catch(_){}
  if(enabled){
   try{const C=w.AudioContext||w.webkitAudioContext;if(C){audio=audio||new C();void audio.resume?.()}}catch(_){}
   if(w.Notification?.permission==='default'&&typeof w.Notification.requestPermission==='function')
    void w.Notification.requestPermission(); // explicit opt-in gesture only
  }
  message(enabled?'🔔 Helyi hangok bekapcsolva ebben a böngészőben.':'🔕 Hangjelzések kikapcsolva.');
 });
 w.addEventListener?.('hh-travel-favorites-changed',()=>{previous.clear();if(last)bubble(last)});
 w.addEventListener?.('storage',e=>{if(e.key==='hh-family-favorite-places-v972'&&last){previous.clear();bubble(last)}});
 w.addEventListener?.('pagehide',()=>{previous.clear()});
 // A selected-portrait paint drives this module. No extra sensor or polling.
 w.HH_GUARDIAN_SMART_PLACES_V1068=Object.freeze({onFix:putFix,encode,decode,distance,places,
  get latest(){return last},openEditor});
})(window,document);
