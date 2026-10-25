/* Smart Arrival v806 · independent From / To, one-click verified suggestions,
 * automatic planning, reversible endpoints and ten per-profile local favourites.
 * Photon is a remote geocoder, never a pedestrian/transit ETA provider.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_SMART_HUB_FIELDS_V806=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const API='https://photon.komoot.io/api/';
 const DEFAULT_LABELS=['Otthon','Munkahely','Orvos','Kórház','Család','Barátok','Bolt','Ügyintézés','Szabadidő','Egyéb'];
 const STORE='hh-smart-arrival-favorite-places-v806-';
 const $=id=>w&&w.document&&w.document.getElementById(id);
 const modes=['origin','destination'];
 function queryText(value){
  const s=String(value||'').trim().replace(/\s+/g,' ').slice(0,120);
  return s.length>=3&&!/[\u0000-\u001f\u007f]/.test(s)?s:null;
 }
 function searchUrl(value){
  const s=queryText(value);if(!s)return null;
  const u=new URL(API);u.searchParams.set('q',s);u.searchParams.set('limit','6');
  // Public Photon does not support lang=hu: omitting it is intentional.
  u.searchParams.set('lat','47.506');u.searchParams.set('lon','19.0467');
  return u.href;
 }
 function validPlace(value){
  return !!value&&typeof value.name==='string'&&value.name.trim().length>0&&
   Number.isFinite(value.lat)&&Number.isFinite(value.lng)&&
   Math.abs(value.lat)<=90&&Math.abs(value.lng)<=180;
 }
 function normalizeResults(raw){
  if(!raw||raw.type!=='FeatureCollection'||!Array.isArray(raw.features))return [];
  const out=[],seen=new Set();
  for(const f of raw.features.slice(0,35)){
   if(!f||f.geometry?.type!=='Point'||!Array.isArray(f.geometry.coordinates))continue;
   const [lng,lat]=f.geometry.coordinates;
   const p=f.properties||{};
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)continue;
   if(p.countrycode&&String(p.countrycode).toUpperCase()!=='HU')continue;
   const name=String(p.name||p.street||p.city||'').trim().slice(0,120);
   if(!name)continue;
   const street=p.housenumber&&p.street?p.street+' '+p.housenumber:p.street;
   const subtitle=[street,p.district,p.city||p.county].filter(Boolean).map(x=>String(x).slice(0,70)).filter((x,i,a)=>a.indexOf(x)===i).join(' · ');
   const id=String(p.osm_type||'')+String(p.osm_id||'')+lng+lat;
   if(seen.has(id))continue;seen.add(id);
   out.push({name,subtitle,lat,lng});if(out.length===6)break;
  }
  return out;
 }
 function profileId(storage){
  try{return storage&&storage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}
 }
 function swapState(state){
  return {origin:state&&state.destination||null,destination:state&&state.origin||null};
 }
 function slotLabel(value,index){
  const s=String(value||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,34);
  return s||DEFAULT_LABELS[index]||'Kedvenc';
 }
 function blankSlots(){return DEFAULT_LABELS.map(label=>({label,place:null}))}
 function normalizedSlots(input){
  const out=blankSlots();
  if(!Array.isArray(input))return out;
  input.slice(0,10).forEach((entry,i)=>{
   if(!entry||typeof entry!=='object')return;
   out[i].label=slotLabel(entry.label,i);
   if(validPlace(entry.place))out[i].place={
    name:entry.place.name.slice(0,120),subtitle:String(entry.place.subtitle||'').slice(0,190),
    lat:entry.place.lat,lng:entry.place.lng
   };
  });
  return out;
 }
 // One read-only source for the existing ten per-profile Smart Travel destinations.
 // Empty slots are not search results. No new storage, syncing or GPS access.
 function listFavoritePlaces(storage){
  if(!storage||typeof storage.getItem!=='function')return [];
  const profile=profileId(storage),key=STORE+profile;
  try{
   const slots=normalizedSlots(JSON.parse(storage.getItem(key)||'null'));
   return slots.filter(slot=>!!slot.place).map(slot=>({
    displayName:slot.label,name:slot.place.name,
    subtitle:slot.place.subtitle||'',lat:slot.place.lat,lng:slot.place.lng,
    source:'favorite',profile
   }));
  }catch(_){return []}
 }
 function init(){
  const d=w&&w.document;
  if(!d||!w.fetch)return;
  const inputs={origin:$('hhSmartHubFromV806'),destination:$('hhSmartHubToV806')};
  const results=$('hhSmartHubNativeResultsV803'),status=$('hhSmartHubDestinationStatusV802');
  const swapButton=$('hhSmartHubSwapV806'),planButton=$('hhSmartHubPlanV806');
  const favorites=$('hhSmartHubFavoriteRowsV806'),profileText=$('hhSmartHubFavoriteProfileV806');
  if(!inputs.origin||!inputs.destination||!results||!status||!swapButton||!planButton||!favorites)return;
  let state={origin:null,destination:null},active='destination',timer=null,pending=null,requestId=0,lastRequest=0;
  let markers={origin:null,destination:null},storedProfile=profileId(w.localStorage);
  const message=text=>{status.textContent=text};
  const fields=()=>inputs;
  function stopRequest(){
   requestId++;if(timer!==null){w.clearTimeout(timer);timer=null}
   if(pending){try{pending.abort()}catch(_){}pending=null}
  }
  function clearResults(){results.replaceChildren()}
  function formatPlace(p){
   return p.name+(p.subtitle&&p.subtitle!==p.name?' · '+p.subtitle:'');
  }
  function updateStyles(){
   for(const key of modes){
    const wrapper=inputs[key].closest('.hh-smart-hub-field-v806');
    if(wrapper){wrapper.classList.toggle('hh-smart-hub-active-v806',active===key);
     wrapper.classList.toggle('hh-smart-hub-confirmed-v806',!!state[key]);}
   }
   planButton.disabled=!state.origin||!state.destination;
   planButton.textContent=planButton.disabled?'🧭 Útvonaltervezés · válassz két helyet':'🧭 Útvonalak újratervezése';
  }
  function updateMap(place,kind){
   const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
   const Marker=w.maplibregl&&w.maplibregl.Marker;
   if(markers[kind]){try{markers[kind].remove()}catch(_){} markers[kind]=null}
   if(!place||!map||typeof Marker!=='function')return;
   try{
    const node=d.createElement('div');node.className='hh-smart-hub-map-pin-v803';
    if(kind==='origin')node.className+=' hh-smart-hub-origin-pin-v804';
    node.textContent=(kind==='origin'?'🚶 ':'📍 ')+place.name;
    node.setAttribute('aria-label',(kind==='origin'?'Indulási hely: ':'Úti cél: ')+place.name);
    markers[kind]=new Marker({element:node,anchor:'bottom',offset:[0,-5]})
     .setLngLat([place.lng,place.lat]).addTo(map);
    map.flyTo({center:[place.lng,place.lat],zoom:15.5,duration:650});
   }catch(_){}
  }
  function syncRoutes(){
   const router=w.HH_SMART_HUB_ROUTER_V804;
   if(router&&typeof router.setJourney==='function')router.setJourney(state.origin,state.destination);
   else if(router&&router.setPlace){
    // Older router: only send completed journeys, never stale edits.
    if(state.origin&&state.destination){
     router.setPlace('origin',state.origin);router.setPlace('destination',state.destination);
    }
   }
   updateStyles();
  }
  function selectPlace(place,kind=active){
   if(!validPlace(place)||!modes.includes(kind))return false;
   stopRequest();
   const item={name:place.name.slice(0,120),subtitle:String(place.subtitle||'').slice(0,190),lat:place.lat,lng:place.lng};
   state[kind]=item;inputs[kind].value=formatPlace(item);
   active=kind;clearResults();updateMap(item,kind);syncRoutes();
   message(state.origin&&state.destination
    ?'Honnan és Hová ellenőrizve. Az útvonaltervezés automatikusan elindult.'
    :'Hely rögzítve. Válaszd ki a másik mezőben is az ellenőrzött címet.');
   return true;
  }
  function setActive(kind){
   if(!modes.includes(kind))return;
   active=kind;clearResults();stopRequest();updateStyles();
   message('Most a(z) '+(kind==='origin'?'Honnan':'Hová')+' mezőhöz keresel. Egy koppintás a találaton rögzíti a címet.');
  }
  function searchResults(items){
   clearResults();
   for(const item of items){
    const button=d.createElement('button');button.type='button';
    button.className='hh-smart-hub-result-v803';
    const pin=d.createElement('span');pin.className='hh-smart-hub-result-icon-v803';pin.textContent='⌖';
    const copy=d.createElement('span');copy.className='hh-smart-hub-result-copy-v803';
    const title=d.createElement('strong');title.textContent=item.name;
    const address=d.createElement('small');address.textContent=item.subtitle||'OSM helytalálat';
    copy.append(title,address);
    const arrow=d.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    button.append(pin,copy,arrow);
    button.addEventListener('click',()=>selectPlace(item,active));
    results.append(button);
   }
  }
  async function search(kind=active){
   if(!modes.includes(kind))return;
   const value=queryText(inputs[kind].value);
   stopRequest();clearResults();
   if(!value){message('Írj legalább 3 karaktert egy helynévből vagy címből.');return}
   const myId=requestId,elapsed=Date.now()-lastRequest;
   if(elapsed<1400){
    timer=w.setTimeout(()=>{if(myId===requestId)search(kind)},1400-elapsed);return;
   }
   lastRequest=Date.now();
   const controller=w.AbortController?new w.AbortController():null;pending=controller;
   message('Helykeresés a(z) '+(kind==='origin'?'Honnan':'Hová')+' mezőhöz…');
   try{
    const res=await w.fetch(searchUrl(value),{
     mode:'cors',cache:'no-store',signal:controller?controller.signal:undefined});
    if(!res.ok)throw Error('HTTP '+res.status);
    const matched=normalizeResults(await res.json());
    if(requestId!==myId||active!==kind)return;
    searchResults(matched);
    message(matched.length?matched.length+' helytalálat. Koppints a megfelelő címre, és rögtön bekerül a mezőbe.':
     'Nincs pontos találat. Próbálj másik helynevet vagy címet.');
   }catch(e){
    if(requestId!==myId||e&&e.name==='AbortError')return;
    message('Helykeresési hiba'+(String(e&&e.message||'').startsWith('HTTP ')?' ('+e.message+')':'')+'. Próbáld újra.');
   }finally{if(pending===controller)pending=null}
  }
  function clearUnconfirmed(kind){
   stopRequest();clearResults();
   state[kind]=null;updateMap(null,kind);syncRoutes();
  }
  for(const kind of modes){
   const field=inputs[kind];
   field.addEventListener('focus',()=>setActive(kind));
   field.addEventListener('input',()=>{
    if(active!==kind)active=kind;
    clearUnconfirmed(kind);
    if(!queryText(field.value)){message('Írj legalább 3 karaktert.');return}
    const key=requestId;
    timer=w.setTimeout(()=>{if(key===requestId)search(kind)},850);
   });
   field.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();search(kind)}
   });
  }
  function swap(){
   stopRequest();clearResults();
   state=swapState(state);
   for(const kind of modes){inputs[kind].value=state[kind]?formatPlace(state[kind]):'';updateMap(state[kind],kind)}
   syncRoutes();
   message(state.origin&&state.destination?'Helyek felcserélve. Útvonalak újratervezve.':'Helyek felcserélve. Válaszd ki a hiányzó címet.');
  }
  swapButton.addEventListener('click',swap);
  planButton.addEventListener('click',()=>{
   if(!state.origin||!state.destination)return;
   syncRoutes();
   const el=$('hhSmartHubTripPlansV804');
   if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  const example=$('hhSmartHubExampleV802');
  if(example)example.addEventListener('click',()=>{
   inputs[active].value='Bécsi Corner';clearUnconfirmed(active);search(active);
  });
  function loadSlots(){
   try{return normalizedSlots(JSON.parse(w.localStorage.getItem(STORE+storedProfile)||'null'))}
   catch(_){return blankSlots()}
  }
  function saveSlots(slots){
   try{w.localStorage.setItem(STORE+storedProfile,JSON.stringify(normalizedSlots(slots)));return true}
   catch(_){message('A kedvenc címek tárolása ezen a böngészőn nem sikerült.');return false}
  }
  function renderFavorites(){
   const slots=loadSlots();favorites.replaceChildren();
   if(profileText)profileText.textContent=(storedProfile==='m'?'Mónika':'Zsolt')+' · 10 saját kedvenc hely';
   slots.forEach((entry,index)=>{
    const row=d.createElement('div');row.className='hh-smart-hub-favorite-row-v806';
    const name=d.createElement('input');name.type='text';name.maxLength=34;
    name.value=entry.label;name.className='hh-smart-hub-favorite-name-v806';
    name.setAttribute('aria-label',(index+1)+'. kedvenc hely neve');
    const use=d.createElement('button');use.type='button';use.className='hh-smart-hub-favorite-use-v806';
    use.textContent=entry.place?'📍 '+entry.place.name:'Üres hely';
    use.disabled=!entry.place;
    use.title=entry.place?formatPlace(entry.place):'Még nincs mentett hely';
    use.addEventListener('click',()=>{if(entry.place)selectPlace(entry.place,active)});
    const save=d.createElement('button');save.type='button';save.textContent='Mentés';
    save.title='Aktív mező ellenőrzött helyének mentése ebbe a kedvencbe';
    save.addEventListener('click',()=>{
     slots[index]={label:slotLabel(name.value,index),place:state[active]};
     if(!state[active]){message('Mentéshez előbb válassz ellenőrzött helytalálatot az aktív mezőben.');return}
     if(saveSlots(slots)){renderFavorites();message('Kedvenc cím mentve '+(storedProfile==='m'?'Mónika':'Zsolt')+' profiljában.')}
    });
    name.addEventListener('change',()=>{
     slots[index].label=slotLabel(name.value,index);
     saveSlots(slots);name.value=slots[index].label;
    });
    const del=d.createElement('button');del.type='button';del.textContent='✕';
    del.className='hh-smart-hub-favorite-clear-v806';
    del.setAttribute('aria-label',entry.label+' kedvenc cím törlése');
    del.disabled=!entry.place;
    del.addEventListener('click',()=>{slots[index].place=null;if(saveSlots(slots))renderFavorites()});
    row.append(name,use,save,del);favorites.append(row);
   });
  }
  function refreshProfile(){
   const current=profileId(w.localStorage);
   if(storedProfile!==current){
    storedProfile=current;stopRequest();clearResults();
    state={origin:null,destination:null};
    for(const key of modes){inputs[key].value='';updateMap(null,key)}
    syncRoutes();renderFavorites();
    message((current==='m'?'Mónika':'Zsolt')+' profilja aktív. Válassz két helyet az új tervezéshez.');
   }
  }
  const profileSwitch=$('guardianProfileSwitch');
  if(profileSwitch)profileSwitch.addEventListener('click',()=>w.setTimeout(refreshProfile,0));
  if(w.addEventListener)w.addEventListener('storage',e=>{if(e.key==='hh-profile')refreshProfile()});
  // A verified map result fills the existing Hová field and triggers the single planner.
  if(w.addEventListener)w.addEventListener('hh-guardian-map-destination-v819',e=>{
   if(!e||!validPlace(e.detail))return;
   if(selectPlace(e.detail,'destination'))e.preventDefault();
  });
  if(w.addEventListener)w.addEventListener('pagehide',()=>{
   stopRequest();for(const kind of modes){if(markers[kind])markers[kind].remove()}
  });
  renderFavorites();updateStyles();
  message('Koppints a Honnan vagy Hová mezőre. Két kiválasztott cím után automatikusan tervezünk.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {queryText,searchUrl,normalizeResults,validPlace,swapState,slotLabel,
  blankSlots,normalizedSlots,profileId,listFavoritePlaces,init,version:'806'};
});
