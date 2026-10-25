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
 function init(){
  const d=w&&w.document;if(!d||!w.fetch)return;
  const box=$('guardianMapSearchV819'),input=$('guardianMapSearchInputV819');
  const suggestions=$('guardianMapSearchResultsV819'),message=$('guardianMapSearchStatusV819');
  const go=$('guardianMapSearchGoV819'),mic=$('guardianMapSearchMicV819');
  const exit=$('guardianMapSearchExitV819'),navigate=$('guardianMapSearchNavigateV819');
  const card=box&&box.closest('.map-card');
  if(!card||!input||!suggestions||!message||!go||!mic||!exit||!navigate)return;
  let current=null,results=[],seq=0,timer=null,abort=null,lastRequest=0;
  let expanded=false,ownMarker=null,recognition=null;
  const geocoder=()=>w.HH_SMART_HUB_FIELDS_V806;
  const map=()=>w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  const report=s=>{message.textContent=s};
  const resize=()=>{const m=map();if(m&&typeof m.resize==='function')try{m.resize()}catch(_){}};
  function cancel(){
   seq++;if(timer!==null){w.clearTimeout(timer);timer=null}
   if(abort){abort.abort();abort=null}
  }
  function hideResults(){results=[];suggestions.replaceChildren();suggestions.hidden=true;input.setAttribute('aria-expanded','false')}
  function setFullscreen(value,skipExit){
   expanded=!!value;d.body.classList.toggle('hh-map-full-v819',expanded);
   card.classList.toggle('hh-map-full-v819',expanded);
   exit.hidden=!expanded;navigate.hidden=!expanded||!current;
   if(!expanded&&!skipExit&&d.fullscreenElement===card&&d.exitFullscreen){
    try{const p=d.exitFullscreen();if(p&&p.catch)p.catch(()=>{})}catch(_){}
   }
   w.setTimeout(resize,40);w.setTimeout(resize,300);
  }
  function openFullscreen(){
   if(expanded)return;
   setFullscreen(true,true);
   // Must be called from the actual user click, and gracefully degrade to CSS
   // when Android Chrome blocks immersive fullscreen.
   if(typeof card.requestFullscreen==='function'){
    try{const p=card.requestFullscreen();if(p&&p.catch)p.catch(()=>{})}catch(_){}
   }
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
   cancel();hideResults();current=place;
   input.value=place.name+(place.subtitle?' · '+place.subtitle:'');
   input.blur();
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
   hideResults();results=budapestFirst(items);
   results.forEach(place=>{
    const row=d.createElement('button');row.type='button';row.className='hh-map-search-hit-v819';
    const symbol=d.createElement('span');symbol.textContent='📍';symbol.setAttribute('aria-hidden','true');
    const details=d.createElement('span');details.className='hh-map-search-hit-text-v819';
    const title=d.createElement('strong');title.textContent=place.name;
    const desc=d.createElement('small');desc.textContent=place.subtitle||'OpenStreetMap · ellenőrzött találat';
    const arrow=d.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    details.append(title,desc);row.append(symbol,details,arrow);
    row.addEventListener('click',()=>select(place));
    suggestions.append(row);
   });
   suggestions.hidden=!results.length;input.setAttribute('aria-expanded',String(!!results.length));
  }
  async function search(){
   const g=geocoder(),value=g&&g.queryText(input.value);
   cancel();hideResults();current=null;navigate.hidden=true;
   if(!g||!value){report('Adj meg legalább három karaktert egy budapesti címből.');return}
   const own=seq,wait=Math.max(0,1450-(Date.now()-lastRequest));
   if(wait){timer=w.setTimeout(()=>{if(own===seq)search()},wait);return}
   lastRequest=Date.now();
   const controller=w.AbortController?new w.AbortController():null;abort=controller;
   report('🔎 Valós címek keresése…');
   try{
    const response=await w.fetch(g.searchUrl(value),{mode:'cors',cache:'no-store',signal:controller?controller.signal:undefined});
    if(!response.ok)throw Error('HTTP '+response.status);
    const found=g.normalizeResults(await response.json());
    if(own!==seq)return;
    showResults(found);
    report(found.length?'Válaszd ki a megfelelő címet a találatok közül.':
     'Nincs ellenőrzött cím. Próbálj pontosabb utcanevet vagy házszámot.');
   }catch(e){
    if(own!==seq||e&&e.name==='AbortError')return;
    report('A címkereső most nem érhető el. Ellenőrizd az internetkapcsolatot.');
   }finally{if(abort===controller)abort=null}
  }
  function type(){
   cancel();hideResults();current=null;navigate.hidden=true;
   const g=geocoder(),value=g&&g.queryText(input.value);
   if(!value){report('Kezdj el gépelni egy címet vagy helyet.');return}
   const own=seq;timer=w.setTimeout(()=>{if(own===seq)search()},650);
  }
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
  d.addEventListener('fullscreenchange',()=>{
   if(!d.fullscreenElement&&expanded)setFullscreen(false,true);
   resize();
  });
  d.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)setFullscreen(false)});
  w.addEventListener('pagehide',()=>{cancel();if(ownMarker){ownMarker.remove();ownMarker=null}});
  report('Írj be vagy mondj egy budapesti címet.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {budapestFirst,init,version:'819'};
});
