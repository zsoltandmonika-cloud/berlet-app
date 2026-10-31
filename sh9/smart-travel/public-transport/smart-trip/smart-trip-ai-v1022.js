/* SH9 Smart Trip AI v1022 · own-screen predictive entry and verified-results layer.
 * User initiated only; no MÁVPlusz iframe/UI/API, zero Supabase/GPS/polling.
 * Reuses existing Family Guard favorite/Photon normalization and the licensed,
 * private IndexedDB MÁV timetable core when actually present on THIS device.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const form=$('st22Form'),from=$('st22From'),to=$('st22To'),status=$('st22Status');
 if(!form||!from||!to||!status)return;
 const list=$('st22JourneyList'),source=$('st22Source'),date=$('st22Date'),time=$('st22Time'),priority=$('st22Priority');
 const results=$('st22Results'),resultRenderer=w.SH9_SMART_TRIP_RESULT_V1072;
 const resultView=resultRenderer?.mount?.(w,d);
 const geo=w.HH_SMART_HUB_FIELDS_V806,rail=w.SH9_MAV_GTFS_CORE_V1;
 const API='https://photon.komoot.io/api/';
 const sessionKey='sh9-bkk-grand-planner-handoff-v1';
 const local={origin:null,destination:null};
 const fields=[{input:from,key:'origin',box:$('st22FromList')},{input:to,key:'destination',box:$('st22ToList')}];
 const timers=new Map(),pending=new Map(),items=new Map();
 let lastOnline=0,lastSmartPlaceSync=0,railData=null,railNames=[],railLoading=null,mode='now';
 let tripCounter=0,searchCounter=0;
 function profile(){try{return w.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}}
 d.documentElement.dataset.st22Profile=profile();
 function fold(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').replace(/\s+/g,' ').trim()}
 function nowHU(){
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23'});
  const parts={};for(const x of fmt.formatToParts(new Date()))parts[x.type]=x.value;
  return {date:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
 }
 function say(s){status.textContent=s}
 function updateMode(next){
  if(!['now','depart','arrive'].includes(next))return;
  mode=next;
  d.querySelectorAll('[data-st22-mode]').forEach(b=>{
   const active=b.dataset.st22Mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
  });
  if(mode==='now'){const n=nowHU();date.value=n.date;time.value=n.time}
 }
 function abort(key){
  const t=timers.get(key);if(t)w.clearTimeout(t);timers.delete(key);
  const p=pending.get(key);if(p?.abort)p.abort();pending.delete(key);
 }
 function close(field){field.box.replaceChildren();field.box.hidden=true;field.input.setAttribute('aria-expanded','false');items.delete(field.key)}
 function clearAll(){fields.forEach(f=>{abort(f.key);close(f)})}
 function favoriteItems(q){
  try{
   const entries=geo?.favoriteSuggestions?.(w.localStorage,q,12)||[];
   return entries.filter(x=>x&&typeof x.name==='string'&&Number.isFinite(x.lat)&&Number.isFinite(x.lng))
    .map(x=>({name:String(x.displayName||x.name).slice(0,110),subtitle:[x.name,x.subtitle].filter(Boolean).join(' · ').slice(0,160),
     lat:x.lat,lng:x.lng,type:'kedvenc',actualName:x.name}));
  }catch(_){return[]}
 }
 function localStations(q){
  const txt=fold(q);
  if(txt.length<2||!railNames.length)return[];
  const exact=[],begins=[],inside=[];
  for(const name of railNames){
   const folded=fold(name);
   if(folded===txt)exact.push(name);
   else if(folded.startsWith(txt))begins.push(name);
   else if(folded.includes(txt))inside.push(name);
  }
  return exact.concat(begins,inside).slice(0,7).map(name=>({name,subtitle:'Helyi MÁV GTFS-állomás · menetrendi adat',type:'vasút'}));
 }
 function suggestions(q){const f=favoriteItems(q),s=localStations(q),seen=new Set();return [...f,...s].filter(item=>{const key=fold(item.name)+'|'+(item.lat||'');if(seen.has(key))return false;seen.add(key);return true}).slice(0,8)}
 function choose(field,item){
  abort(field.key);
  field.input.value=item.name;
  local[field.key]=item;
  field.input.dataset.st22Chosen=item.type;
  close(field);
  // Do not reopen the Samsung keyboard or predictions after a one-tap choice.
 }
 function render(field,array){
  const found=array.slice(0,8);field.box.replaceChildren();items.set(field.key,found);
  found.forEach((item,i)=>{
   const b=d.createElement('button');b.type='button';b.setAttribute('role','option');b.id='st22-'+field.key+'-'+i;
   const label=d.createElement('span'),strong=d.createElement('strong'),sub=d.createElement('small'),icon=d.createElement('em');
   strong.textContent=item.name;sub.textContent=item.subtitle||'Hely';label.append(strong,sub);
   icon.textContent=item.type==='kedvenc'?'★ KEDVENC':item.type==='vasút'?'🚆 VASÚT':'⌖ CÍM';
   b.append(label,icon);
   b.addEventListener('click',()=>choose(field,item));field.box.appendChild(b);
  });
  field.box.hidden=!found.length;field.input.setAttribute('aria-expanded',String(!!found.length));
 }
 function remoteUrl(q){
  const u=new URL(API);u.searchParams.set('q',q);u.searchParams.set('limit','6');
  u.searchParams.set('lat','47.506');u.searchParams.set('lon','19.0467');
  return u.href;
 }
 async function fetchRemote(field,query,token){
  if(!w.fetch||!geo?.normalizeResults)return;
  const remain=Math.max(0,1550-(Date.now()-lastOnline));
  if(remain){timers.set(field.key,w.setTimeout(()=>{if(field.input.value===query)void fetchRemote(field,query,token)},remain));return}
  lastOnline=Date.now();
  const ctl=w.AbortController?new w.AbortController():null;pending.set(field.key,ctl);
  try{
   const response=await w.fetch(remoteUrl(query),{mode:'cors',cache:'no-store',signal:ctl?.signal});
   if(!response.ok)throw Error('Photon search '+response.status);
   const records=geo.normalizeResults(await response.json()).map(x=>({
    name:x.name,subtitle:x.subtitle||'Magyarországi cím',lat:x.lat,lng:x.lng,type:'cím'
   }));
   if(field.input.value!==query||tripCounter!==token)return;
   const existing=suggestions(query);const seen=new Set(existing.filter(x=>Number.isFinite(x.lat)).map(x=>x.lat.toFixed(5)+':'+x.lng.toFixed(5)));
   const combined=existing.concat(records.filter(x=>{const key=x.lat.toFixed(5)+':'+x.lng.toFixed(5);if(seen.has(key))return false;seen.add(key);return true}));
   render(field,combined);
  }catch(e){
   if(e?.name!=='AbortError'&&field.input.value===query&&!suggestions(query).length){
    say('Az online címjavaslatok átmenetileg nem elérhetők. A helyi állomások és kedvencek tovább használhatók.');
   }
  }finally{if(pending.get(field.key)===ctl)pending.delete(field.key)}
 }
 function handleInput(field){
  abort(field.key);local[field.key]=null;delete field.input.dataset.st22Chosen;
  const q=field.input.value.trim();const id=++tripCounter;
  if(!q){close(field);return}
  const known=suggestions(q);
  render(field,known);
  // The existing favorite/rail station index is free and instant.
  // Contact Photon only when the local index cannot offer a useful match.
  if(q.length<3||known.length)return;
  timers.set(field.key,w.setTimeout(()=>{if(field.input.value.trim()===q)void fetchRemote(field,q,id)},470));
 }
 function wire(field){
  field.input.addEventListener('input',()=>handleInput(field));
  field.input.addEventListener('focus',()=>{
   // A newly recorded SH9 Smart Place is an existing family favorite.
   // One user-triggered, max once / 2 min cloud refresh avoids a stale
   // browser cache without per-keystroke Supabase calls or polling.
   const family=w.HH_TRAVEL_FAVORITES_V972;
   if(family?.sync&&Date.now()-lastSmartPlaceSync>2*60*1000){
    lastSmartPlaceSync=Date.now();void family.sync(true).catch(()=>{});
   }
   if(field.input.value.trim())render(field,suggestions(field.input.value.trim()));
   else{const fav=favoriteItems('');if(fav.length)render(field,fav.slice(0,6))}
   void loadRailData().then(()=>{if(d.activeElement===field.input&&field.input.value.trim())render(field,suggestions(field.input.value.trim()))});
  });
  field.input.addEventListener('keydown',e=>{
   if(e.key==='Escape'){close(field);return}
   const buttons=Array.from(field.box.querySelectorAll('button'));
   if(e.key==='ArrowDown'&&buttons.length){e.preventDefault();buttons[0].focus()}
  });
  field.box.addEventListener('keydown',e=>{
   if(e.key==='Escape'){close(field);field.input.focus();return}
   const buttons=Array.from(field.box.querySelectorAll('button')),pos=buttons.indexOf(d.activeElement);
   if(e.key==='ArrowDown'&&pos<buttons.length-1){e.preventDefault();buttons[pos+1].focus()}
   if(e.key==='ArrowUp'){e.preventDefault();if(pos>0)buttons[pos-1].focus();else field.input.focus()}
  });
 }
 function readDatabase(){
  if(!w.indexedDB)return Promise.resolve(null);
  // Avoid creating an empty private IndexedDB when this browser has none.
  const available=typeof w.indexedDB.databases==='function'?w.indexedDB.databases().then(rows=>rows.some(r=>r.name==='sh9-mav-private-gtfs-v2')).catch(()=>false):Promise.resolve(true);
  return available.then(yes=>new Promise(resolve=>{
   if(!yes){resolve(null);return}
   let done=false;const finish=x=>{if(done)return;done=true;resolve(x)};
   try{
    const req=w.indexedDB.open('sh9-mav-private-gtfs-v2',1);
    req.onerror=()=>finish(null);
    req.onsuccess=()=>{
     const db=req.result;
     if(!db.objectStoreNames.contains('datasets')){db.close();finish(null);return}
     const get=db.transaction('datasets','readonly').objectStore('datasets').get('household');
     get.onsuccess=()=>{db.close();finish(get.result||null)};
     get.onerror=()=>{db.close();finish(null)};
    };
   }catch(_){finish(null)}
  }));
 }
 function loadRailData(){
  if(railLoading)return railLoading;
  railLoading=readDatabase().then(raw=>{
   if(!rail?.validate||!raw||raw.rightsConfirmed!==false||raw.localOnly!==true||!rail.validate(raw,{allowPrivate:true}))return null;
   railData=raw;
   railNames=[...new Set(raw.stops.map(s=>s[1]))].slice(0,9000);
   return railData;
  }).catch(()=>null);
  return railLoading;
 }
 function whenInstant(query){
  const hh=Number(query.time.slice(0,2)),mm=Number(query.time.slice(3,5));
  const epoch=rail?.wallEpoch?.(query.date,hh*60+mm);
  return Number.isFinite(epoch)?new Date(epoch).toISOString():null;
 }
 function snapshot(){
  const now=nowHU();
  return {from:from.value.trim().replace(/\s+/g,' ').slice(0,120),to:to.value.trim().replace(/\s+/g,' ').slice(0,120),
   date:mode==='now'?now.date:date.value,time:mode==='now'?now.time:time.value,mode};
 }
 function waitSum(j,pivot){
  let total=0;
  if(!Array.isArray(j.legs)||!j.legs.length)return 0;
  for(let i=1;i<j.legs.length;i++){
   const t=Date.parse(j.legs[i].departure)-Date.parse(j.legs[i-1].arrival);
   if(Number.isFinite(t)&&t>0)total+=Math.round(t/60000);
  }
  if(Number.isFinite(pivot)){
   const x=j.legs[0],dep=Date.parse(x.departure),arr=Date.parse(j.arrival);
   const start=mode==='arrive'?pivot-arr:dep-pivot;
   if(Number.isFinite(start)&&start>0)total+=Math.round(start/60000);
  }
  return total;
 }
 function rank(journeys,query,when){
  const pivot=Date.parse(when),preference=priority.value;
  return [...journeys].sort((a,b)=>{
   function value(j){
    const waiting=waitSum(j,pivot),transfers=j.transfers||0,travel=j.durationMinutes||0,depart=Date.parse(j.departure);
    if(preference==='wait')return waiting+travel*.035+transfers*2;
    if(preference==='transfers')return transfers*250+travel*.5+waiting*.2;
    if(preference==='duration')return travel+transfers*8;
    if(preference==='departure')return Number.isFinite(depart)?depart/60000:Infinity;
    return travel+transfers*38+waiting*.5;
   }
   return value(a)-value(b)||a.transfers-b.transfers||Date.parse(a.arrival)-Date.parse(b.arrival);
  }).slice(0,8);
 }
 function stamp(iso){try{return new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}catch(_){return '—'}}
 function renderJourneys(journeys,query,when,verifiedFeed){
  // Verified local rail GTFS only. No invented door-to-door walking or BKK/Volan transfers.
  if(!verifiedFeed||!rail?.validate?.(verifiedFeed,{allowPrivate:true})){
   unavailable('A menetrendi adatforrás ellenőrzése sikertelen. Kitalált útvonalat nem mutatunk.');
   return;
  }
  const generation=Date.parse(verifiedFeed.generatedAt||'');
  if(!Number.isFinite(generation)||generation>Date.now()+60000||Date.now()-generation>90*86400000){
   unavailable('A helyi menetrendi adatállomány túl régi vagy hibás dátumú. Frissítsd az ellenőrzött menetrendet.');
   return;
  }
  const prepared=resultRenderer?.prepare?.(journeys,{
   verified:true,kind:'local-private-gtfs',coverage:'station-to-station',
   name:verifiedFeed.source||'Privát vasúti GTFS',generatedAt:verifiedFeed.generatedAt
  });
  if(!prepared?.items?.length){
   unavailable('Nincs megjeleníthető, ellenőrzött útiterv. Kitalált szakaszokat nem mutatunk.');
   return;
  }
  source.textContent=prepared.source.name+' · helyi menetrend · nem élő';
  if(resultView?.open?.(prepared)){if(results)results.hidden=true;return}
  unavailable('A teljes képernyős eredménynézet ezen a készüléken nem érhető el.');
 }
 function focusResults(){
  if(!results||results.hidden)return;
  (w.requestAnimationFrame||function(cb){cb()})(()=>{
   results.scrollIntoView?.({
    behavior:w.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
    block:'nearest'
   });
  });
 }
 function unavailable(message){
  if(results)results.hidden=false;
  list.replaceChildren();source.textContent='Adatforrás: ellenőrzés alatt';
  say(message);
  focusResults();
 }
 async function searchTrip(event){
  event.preventDefault();clearAll();resultView?.unlockSound?.();
  const searchId=++searchCounter;
  if(results)results.hidden=false;
  const query=snapshot();
  if(!query.from||!query.to){unavailable('Az útvonalhoz mindkét hely szükséges. Válassz indulási helyet és célt a prediktív listából.');return}
  if(fold(query.from)===fold(query.to)){unavailable('Az indulási és érkezési hely nem lehet azonos.');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(query.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(query.time)){
   unavailable('Kérlek, válassz érvényes dátumot és időpontot.');return}
  unavailable('Ellenőrzöm a saját, helyben elérhető menetrendi adatokat…');
  const available=await loadRailData();
  if(searchId!==searchCounter)return;
  if(!available){unavailable('A saját Smart Trip kereső működik, de ezen a készüléken nincs ellenőrzött, privát MÁV-menetrend. Az útvonalhoz BKK/Volán adatok bekötése is szükséges. Nem mutatunk kitalált járatot.');return}
  const instant=whenInstant(query);
  if(!instant){unavailable('A választott időpont nem értelmezhető a budapesti időzónában.');return}
  const result=rail.route(available,{from:query.from,to:query.to,mode:query.mode,when:instant},{limit:60,maxTransfers:1,localOnly:true,ranking:'recommended'});
  if(result.status!=='ok'||!result.journeys?.length){
   unavailable(result.status==='station-not-in-feed'
    ?'Az adott cím vagy megálló nem azonosítható egyértelműen a helyi MÁV-menetrendben. Válassz a prediktív vasútállomás-listából, vagy használd a Family Guard térképet.'
    :'A kiválasztott időben nincs ellenőrzött vasúti találat az elérhető helyi menetrendben.');return
  }
  renderJourneys(rank(result.journeys,query,instant),query,instant,available);
 }
 function profileChanged(clearFields){
  const p=profile();
  d.documentElement.dataset.st22Profile=p;
  const button=$('st22Profile');
  if(button){
   const name=p==='m'?'Mónika':'Zsolt';
   const photo=$('st22ProfilePhoto'),avatars=w.HH_GOLDEN_AVATARS_V529||{};
   if(photo){if(avatars[p])photo.src=avatars[p];photo.alt=name+' eredeti profilképe'}
   button.setAttribute('aria-label','Aktív profil: '+name+'. Váltás '+(p==='m'?'Zsoltra':'Mónikára')+'.');
   button.title=name+' · Profilváltás';
  }
  if(clearFields){searchCounter++;resultView?.close?.();clearAll();from.value='';to.value='';local.origin=null;local.destination=null;list.replaceChildren();if(results)results.hidden=true;say('Profilváltás kész. Válassz két új helyet a saját útvonaltervezéshez.')}
 }
 function showFamilyMap(){
  clearAll();
  const query=snapshot();
  const origin=local.origin,target=local.destination;
  function verified(x){return !!x&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&typeof x.name==='string'}
  const both=verified(origin)&&verified(target);
  const draft={...query,created:Date.now(),source:both?'sh9-bkk-grand-v3':'sh9-public-transport-smart-trip-v1'};
  if(both)draft.verified={
   origin:{name:origin.actualName||origin.name,displayName:origin.name,subtitle:origin.subtitle||'',lat:origin.lat,lng:origin.lng},
   destination:{name:target.actualName||target.name,displayName:target.name,subtitle:target.subtitle||'',lat:target.lat,lng:target.lng}
  };
  try{w.sessionStorage.setItem(sessionKey,JSON.stringify(draft))}
  catch(_){say('A Family Guard térképre történő átadás nem sikerült.');return}
  w.location.assign('../../../../healthhub/guardian/#hhSmartHubDestinationV802');
 }
 // v1029: a real full-tile hit button opens the native input picker.
 // No nested label synthetic click and no competing input-icon activation.
 [date,time].forEach(input=>{
  if(!input)return;
  const tile=input.closest('.st22-setting');
  const hit=tile?.querySelector('.st22-picker-hit');
  if(!hit)return;
  function openPicker(){
   try{if(typeof input.showPicker==='function'){input.showPicker();return}}catch(_){}
   input.focus({preventScroll:true});
   try{input.click()}catch(_){}
  }
  hit.addEventListener('click',openPicker);
  function syncAccessible(){
   const prefix=input.type==='date'?'Dátum':'Időpont';
   hit.setAttribute('aria-label',prefix+' kiválasztása'+(input.value?' · '+input.value:''));
  }
  input.addEventListener('change',syncAccessible);
  input.addEventListener('input',syncAccessible);
  syncAccessible();
 });
 fields.forEach(wire);
 // v1031: refresh an open suggestion list after the shared 40 places sync.
 w.addEventListener('hh-travel-favorites-changed',()=>{
  fields.forEach(field=>{
   if(d.activeElement!==field.input)return;
   const q=field.input.value.trim();
   const fav=q?suggestions(q):favoriteItems('');
   if(fav.length)render(field,fav.slice(0,8));
  });
 });
 d.querySelectorAll('[data-st22-mode]').forEach(btn=>btn.addEventListener('click',()=>updateMode(btn.dataset.st22Mode)));
 $('st22Swap')?.addEventListener('click',()=>{
  clearAll();const v=from.value;from.value=to.value;to.value=v;
  const t=local.origin;local.origin=local.destination;local.destination=t;
 });
 d.addEventListener('pointerdown',e=>{if(!e.target.closest('.st22-place'))fields.forEach(close)});
 form.addEventListener('submit',searchTrip);
 $('st22Favorites')?.addEventListener('click',()=>{
  const field=!from.value.trim()?from:!to.value.trim()?to:from;
  field.focus();field.scrollIntoView?.({behavior:'smooth',block:'center'});
 });
 // v1032: the Map button is owned by the full-screen MapLibre overlay.
 // The former handoff to the Family Guard card remains unused here.
 $('st22Notifier')?.addEventListener('click',()=>{
  const note=$('st22Notice');
  if(note)note.hidden=!note.hidden;
 });
 $('st22Profile')?.addEventListener('click',()=>{
  try{w.localStorage.setItem('hh-profile',profile()==='m'?'z':'m')}catch(_){say('A profilváltás nem menthető a böngészőben.');return}
  profileChanged(true);
 });
 w.addEventListener('pageshow',()=>profileChanged(false));
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')profileChanged(true)});
 profileChanged(false);
 updateMode('now');
 // Selected places stay local to this page; the map receives only validated
 // user-selected records, never a location inferred from free-text.
 function selectedPlaces(){
  function safe(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)
   ?{name:String(p.name||''),actualName:String(p.actualName||p.name||''),
      subtitle:String(p.subtitle||''),lat:p.lat,lng:p.lng}:null}
  return {origin:safe(local.origin),destination:safe(local.destination)};
 }
 w.SH9_SMART_TRIP_AI_V1022=Object.freeze({version:'1032',snapshot,loadRailData,rank,selectedPlaces});
})(window,document);
