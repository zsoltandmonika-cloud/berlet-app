/* Family Guard v819 · Premium Glass Budapest map address search and full-screen view.
 * Reuses the existing official-looking MapLibre map and Smart Travel Photon geocoder.
 * No invented positions, GPS start, live ETA or cross-profile data access.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_MAP_SEARCH_V819=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const $=id=>w&&w.document&&w.document.getElementById(id);
 function budapestFirst(items){
  const local=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
   p.lat>=47.25&&p.lat<=47.75&&p.lng>=18.7&&p.lng<=19.6;
  return Array.isArray(items)?items.slice().sort((a,b)=>Number(local(b))-Number(local(a))):[];
 }
 // Match Hungarian and English shortcut words against saved names and addresses.
 function normalizeTerm(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLocaleLowerCase('hu-HU').replace(/\s+/g,' ').trim();
 }
 function matchSaved(items,query){
  const term=normalizeTerm(query);
  if(!Array.isArray(items))return [];
  const shortcuts={home:'otthon',work:'munkahely'};
  const mapped=shortcuts[term]||term;
  return items.filter(place=>{
   if(!place||typeof place.name!=='string'||!Number.isFinite(place.lat)||!Number.isFinite(place.lng)||
     Math.abs(place.lat)>90||Math.abs(place.lng)>180)return false;
   if(!term)return true;
   return [place.displayName,place.name,place.subtitle,place.kind]
    .some(v=>normalizeTerm(v).includes(mapped));
  }).slice(0,12);
 }
 function combineResults(saved,remote){
  const out=[],unique=new Set(),favoriteCoords=new Set();
  for(const entry of (Array.isArray(saved)?saved:[])){
   if(!entry||!Number.isFinite(entry.lat)||!Number.isFinite(entry.lng))continue;
   const coords=entry.lat.toFixed(5)+':'+entry.lng.toFixed(5);
   unique.add((entry.source||'saved')+':'+normalizeTerm(entry.displayName||entry.name)+':'+coords);
   favoriteCoords.add(coords);out.push(entry);
  }
  for(const entry of (Array.isArray(remote)?remote:[])){
   if(!entry||!Number.isFinite(entry.lat)||!Number.isFinite(entry.lng))continue;
   const coords=entry.lat.toFixed(5)+':'+entry.lng.toFixed(5);
   if(favoriteCoords.has(coords)||unique.has('osm:'+coords))continue;
   unique.add('osm:'+coords);out.push(entry);
  }
  return out.slice(0,12);
 }
 function init(){
  const d=w&&w.document;if(!d||!w.fetch)return;
  const box=$('guardianMapSearchV819'),input=$('guardianMapSearchInputV819');
  const suggestions=$('guardianMapSearchResultsV819'),message=$('guardianMapSearchStatusV819');
  const go=$('guardianMapSearchGoV819'),mic=$('guardianMapSearchMicV819');
  const exit=$('guardianMapSearchExitV819'),navigate=$('guardianMapSearchNavigateV819');
  const sizeButton=$('guardianMapSizeToggleV864'),sizeIcon=$('guardianMapSizeIconV864');
  const card=box&&box.closest('.map-card');
  if(!card||!input||!suggestions||!message||!go||!mic||!exit||!navigate)return;
  let current=null,results=[],seq=0,timer=null,abort=null,lastRequest=0;
  let expanded=false,ownMarker=null,recognition=null;
  const geocoder=()=>w.HH_SMART_HUB_FIELDS_V806;
  const readSaved=()=>{
   const g=geocoder(),live=w.HH_GUARDIAN_LIVE_V785;
   const personal=g&&typeof g.listFavoritePlaces==='function'?g.listFavoritePlaces(w.localStorage):[];
   // Common map pins become searchable only for an authenticated authorized family.
   let shared=[];
   if(live?.authenticated&&live?.familyAuthorized){
    const landmarks=w.HH_GUARDIAN_LANDMARKS_V776;
    const entries=landmarks&&landmarks.sharedEntries;
    if(Array.isArray(entries))shared=entries.map(p=>({
     name:p.name,displayName:p.name,subtitle:'☁ Közös térképes hely',
     lat:p.lat,lng:p.lng,kind:p.kind,source:'shared'
    }));
   }
   return personal.concat(shared);
  };
  const localMatches=query=>matchSaved(readSaved(),query);
  const map=()=>w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  const report=s=>{message.textContent=s};
  const resize=()=>{const m=map();if(m&&typeof m.resize==='function')try{m.resize()}catch(_){}};
  function cancel(){
   seq++;if(timer!==null){w.clearTimeout(timer);timer=null}
   if(abort){abort.abort();abort=null}
  }
  function hideResults(){results=[];suggestions.replaceChildren();suggestions.hidden=true;input.setAttribute('aria-expanded','false')}
  function setFullscreen(value){
   // The same MapLibre map expands in our own app layout. Chrome native
   // requestFullscreen causes an intrusive browser/system exit hint.
   // This CSS-only mode avoids it and keeps the existing controls usable.
   const next=!!value;
   if(expanded===next)return;
   expanded=next;d.body.classList.toggle('hh-map-full-v819',expanded);
   card.classList.toggle('hh-map-full-v819',expanded);
   exit.hidden=!expanded;navigate.hidden=!expanded||!current;
   if(sizeButton){
    sizeButton.setAttribute('aria-pressed',String(expanded));
    sizeButton.setAttribute('aria-label',expanded?
     'Térkép visszaállítása normál méretre':'Térkép teljes képernyőre nagyítása');
    sizeButton.title=expanded?'Normál térképméret':'Teljes képernyő';
   }
   if(sizeIcon)sizeIcon.textContent=expanded?'⤢':'⛶';
   // Same map instance and camera. No extra GPS watch, marker or permissions.
   w.setTimeout(resize,40);w.setTimeout(resize,300);
  }
  function openFullscreen(){
   if(expanded)return;
   setFullscreen(true);
  }
  function focusPlace(place){
   const m=map();if(!m||!place)return;
   resize();m.flyTo({center:[place.lng,place.lat],zoom:16.5,duration:700});
  }
  function addFallbackMarker(place){
   const m=map(),Marker=w.maplibregl&&w.maplibregl.Marker;
   if(!m||typeof Marker!=='function')return;
   if(ownMarker){ownMarker.remove();ownMarker=null}
   const element=d.createElement('div');element.className='hh-map-search-pin-v819';
   element.textContent='📍';element.setAttribute('aria-label','Úti cél: '+place.name);
   ownMarker=new Marker({element,anchor:'bottom'}).setLngLat([place.lng,place.lat]).addTo(m);
  }
  function select(place){
   const g=geocoder();if(!g||!g.validPlace(place))return false;
   // Ignore stale selections made just as a profile or sharing permission changes.
   if(place.source==='favorite'&&place.profile!==g.profileId(w.localStorage))return false;
   if(place.source==='shared'&&!(w.HH_GUARDIAN_LIVE_V785?.authenticated&&w.HH_GUARDIAN_LIVE_V785?.familyAuthorized))return false;
   cancel();hideResults();current=place;
   input.value=(place.displayName&&place.displayName!==place.name?place.displayName+' · ':'')+place.name+(place.subtitle?' · '+place.subtitle:'');
   input.blur();
   // Do not let an active GPS follow camera immediately overwrite the searched view.
   // This does NOT stop GPS collection, live uploads or consented sharing.
   w.HH_GUARDIAN_V761?.pauseCameraForMapSearch?.();
   const event=new w.CustomEvent('hh-guardian-map-destination-v819',{detail:place,cancelable:true});
   w.dispatchEvent(event);
   if(!event.defaultPrevented)addFallbackMarker(place);
   else if(ownMarker){ownMarker.remove();ownMarker=null}
   // The user explicitly selected a real result, not a predicted / guessed point.
   openFullscreen();navigate.hidden=false;
   report('📍 '+place.name+' · cím kiválasztva');
   w.setTimeout(()=>focusPlace(place),80);
   return true;
  }
  function showResults(items){
   hideResults();results=combineResults(items,[]);
   results.forEach(place=>{
    const saved=place.source==='favorite'||place.source==='shared';
    const row=d.createElement('button');row.type='button';
    row.className='hh-map-search-hit-v819'+(saved?' hh-map-search-hit-saved-v823':'');
    const symbol=d.createElement('span');symbol.className='hh-map-search-hit-icon-v823';
    symbol.textContent=place.source==='favorite'?'⭐':place.source==='shared'?'🏠':'📍';
    symbol.setAttribute('aria-hidden','true');
    const details=d.createElement('span');details.className='hh-map-search-hit-text-v819';
    const title=d.createElement('strong');title.textContent=place.displayName||place.name;
    const desc=d.createElement('small');
    const address=place.displayName&&place.displayName!==place.name?place.name+(place.subtitle?' · '+place.subtitle:''):
     place.subtitle||'OpenStreetMap · ellenőrzött találat';
    desc.textContent=address;
    const tag=d.createElement('span');tag.className='hh-map-search-hit-tag-v823';
    tag.textContent=place.source==='favorite'?'KEDVENC':place.source==='shared'?'KÖZÖS':'CÍM';
    details.append(title,desc);row.append(symbol,details,tag);
    row.addEventListener('click',()=>select(place));
    suggestions.append(row);
   });
   suggestions.hidden=!results.length;
   input.setAttribute('aria-expanded',String(!!results.length));
  }
  async function search(){
   const g=geocoder(),query=input.value,value=g&&g.queryText(query);
   cancel();
   const saved=localMatches(query);
   showResults(saved);current=null;navigate.hidden=true;
   if(!g||!value){
    report(saved.length?'Mentett címek · válassz egy találatot.':'Írj legalább 3 karaktert egy utcából vagy kedvenc névből.');
    return;
   }
   const own=seq,wait=Math.max(0,1450-(Date.now()-lastRequest));
   if(wait){timer=w.setTimeout(()=>{if(own===seq)search()},wait);return}
   lastRequest=Date.now();
   const controller=w.AbortController?new w.AbortController():null;abort=controller;
   report(saved.length?'Mentett címek megjelenítve · további címek keresése…':'🔎 Valós címek keresése…');
   try{
    const response=await w.fetch(g.searchUrl(value),{
     mode:'cors',cache:'no-store',signal:controller?controller.signal:undefined
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const found=g.normalizeResults(await response.json());
    if(own!==seq)return;
    showResults(combineResults(saved,found));
    report(saved.length||found.length?'Válassz egy mentett helyet vagy ellenőrzött címet.':
     'Nincs találat. Próbálj másik helynevet vagy címet.');
   }catch(e){
    if(own!==seq||e&&e.name==='AbortError')return;
    showResults(saved);
    report(saved.length?'A mentett helyek elérhetők, az online címkereső most nem működik.':
     'A címkereső most nem érhető el. Ellenőrizd az internetkapcsolatot.');
   }finally{if(abort===controller)abort=null}
  }
  function type(){
   cancel();current=null;navigate.hidden=true;
   const saved=localMatches(input.value);
   showResults(saved);
   const g=geocoder(),value=g&&g.queryText(input.value);
   if(!value){
    report(saved.length?'Mentett helyek · koppints egy címre.':'Kezdj el gépelni egy címet vagy mentett hely nevét.');
    return;
   }
   const own=seq;timer=w.setTimeout(()=>{if(own===seq)search()},650);
  }
  input.addEventListener('focus',()=>{
   if(!input.value.trim()){
    showResults(localMatches(''));
    if(results.length)report('Saját kedvencek · válassz egy mentett helyet.');
   }
  });
  input.addEventListener('input',type);
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'){
    e.preventDefault();
    if(results.length)select(results[0]);else search();
   }
   if(e.key==='Escape'){hideResults();if(expanded)setFullscreen(false);}
  });
  go.addEventListener('click',()=>{
   if(results.length)select(results[0]);
   else if(current){openFullscreen();focusPlace(current)}
   else search();
  });
  exit.addEventListener('click',()=>setFullscreen(false));
  sizeButton?.addEventListener('click',()=>setFullscreen(!expanded));
  navigate.addEventListener('click',()=>{
   if(!current)return;
   // Existing Smart Travel planner is the route planner. Never call this
   // turn-by-turn / real-time navigation before live timetable verification.
   const event=new w.CustomEvent('hh-guardian-map-destination-v819',{detail:current,cancelable:true});
   w.dispatchEvent(event);
   setFullscreen(false);
   const planner=$('hhSmartHubDestinationV802');
   if(planner&&planner.scrollIntoView)planner.scrollIntoView({behavior:'smooth',block:'start'});
   report('🧭 Hová: '+current.name+'. A Smart Travelben válassz indulási helyet az útvonaljavaslathoz.');
  });
  const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Speech){mic.disabled=true;mic.title='A böngészőben nincs hangfelismerés. A billentyűzet mikrofonja használható.'}
  else mic.addEventListener('click',()=>{
   if(recognition)return;
   try{
    recognition=new Speech();recognition.lang='hu-HU';recognition.maxAlternatives=1;
    recognition.interimResults=false;
    recognition.onresult=e=>{const spoken=e.results&&e.results[0]&&e.results[0][0]&&e.results[0][0].transcript;
     if(spoken){input.value=String(spoken).slice(0,120);search();}};
    recognition.onerror=()=>report('Hangfelismerés nem sikerült. Írd be a címet, vagy használd a billentyűzet mikrofonját.');
    recognition.onend=()=>{recognition=null;mic.classList.remove('listening')};
    mic.classList.add('listening');report('🎙️ Mondd be a címet…');
    recognition.start();
   }catch(_){recognition=null;mic.classList.remove('listening');report('A hangbevitel ezen a böngészőn nem érhető el.')}
  });
  d.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)setFullscreen(false)});
  // Dismiss old results on profile change; never retain another profile's favorites.
  function invalidateProfile(){
   cancel();hideResults();current=null;navigate.hidden=true;input.value='';
  }
  w.addEventListener('storage',e=>{if(e.key==='hh-profile')invalidateProfile()});
  const switcher=$('guardianProfileSwitch');
  if(switcher)switcher.addEventListener('click',()=>w.setTimeout(invalidateProfile,0));
  w.addEventListener('pagehide',()=>{cancel();if(ownMarker){ownMarker.remove();ownMarker=null}});
  report('Írj be vagy mondj egy budapesti címet.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {budapestFirst,normalizeTerm,matchSaved,combineResults,init,version:'819'};
});
