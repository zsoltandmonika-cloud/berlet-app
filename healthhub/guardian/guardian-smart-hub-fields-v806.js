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
  const pool=w&&w.HH_TRAVEL_FAVORITES_V972;
  if(pool?.favoritePlaces)return pool.favoritePlaces();
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
 function term(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLocaleLowerCase('hu-HU').replace(/\s+/g,' ').trim();
 }
 function favoriteSuggestions(storage,query,limit=40){
  const rows=listFavoritePlaces(storage),needle=term(query);
  return rows.filter(item=>!needle||[
   item.displayName,item.name,item.subtitle
  ].some(text=>term(text).includes(needle))).slice(0,limit);
 }
 function displayPlace(place){
  if(!place)return '';
  const label=String(place.displayName||'').trim();
  const name=String(place.name||'').trim();
  const address=String(place.subtitle||'').trim();
  // Cloud/source metadata is not a street address.
  // A favorite alias shows the actual saved place name first, not the
  // geocoder's generic district/city metadata.
  const isAddress=address&&!/közös térképes hely/i.test(address)&&address!==name;
  return label&&label!==name
   ?label+' ('+name+')'
   :name+(isAddress?' ('+address+')':'');
 }
 function enrichSharedWithFavorite(place,storage){
  if(!place||place.source!=='shared'||!validPlace(place))return place;
  const rows=listFavoritePlaces(storage);
  const same=rows.find(f=>{
   const lat=(f.lat-place.lat)*111000;
   const lng=(f.lng-place.lng)*111000*Math.cos(place.lat*Math.PI/180);
   return Math.hypot(lat,lng)<35;
  });
  if(!same)return place;
  return {...place,name:same.name,subtitle:same.subtitle,
   displayName:place.displayName||place.name};
 }
 // One-shot browser geolocation only. This does not start Guardian background tracking.
 function currentPositionPlace(position,now=Date.now()){
  const c=position&&position.coords;
  if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
    Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||
    !Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>300||
    !Number.isFinite(position.timestamp)||
    position.timestamp<now-60000||position.timestamp>now+60000)return null;
  return {name:'Jelenlegi pozícióm',subtitle:'',lat:c.latitude,lng:c.longitude,
    source:'device-gps',accuracyMeters:Math.round(c.accuracy)};
 }
 function init(){
  const d=w&&w.document;
  if(!d||!w.fetch)return;
  const inputs={origin:$('hhSmartHubFromV806'),destination:$('hhSmartHubToV806')};
  const results=$('hhSmartHubNativeResultsV803'),status=$('hhSmartHubDestinationStatusV802');
  const swapButton=$('hhSmartHubSwapV806'),planButton=$('hhSmartHubPlanV806');
  const locateButton=$('hhSmartHubCurrentPositionV860');
  const favorites=$('hhSmartHubFavoriteRowsV806'),profileText=$('hhSmartHubFavoriteProfileV806');
  if(!inputs.origin||!inputs.destination||!results||!status||!swapButton||!planButton||!favorites||!locateButton)return;
  let state={origin:null,destination:null},active='destination',timer=null,pending=null,requestId=0,lastRequest=0;
  let markers={origin:null,destination:null},storedProfile=profileId(w.localStorage),geoBusy=false;
  // Routine instructions no longer consume vertical space. Relevant search,
   // GPS, permission and persistence errors remain in the live status element.
   const routineHint=/^(?:Koppints\b|Válassz\b|Írj legalább\b|Hely rögzítve\b|Honnan és Hová ellenőrizve\b|Helyek felcserélve\b|(?:Zsolt|Mónika) profilja aktív\b)/;
   const message=text=>{status.textContent=routineHint.test(text)?'':text};
  const fields=()=>inputs;
  function stopRequest(){
   requestId++;if(timer!==null){w.clearTimeout(timer);timer=null}
   if(pending){try{pending.abort()}catch(_){}pending=null}
  }
  function clearResults(){results.replaceChildren()}
  function formatPlace(p){return displayPlace(p)}
  function updateStyles(){
   for(const key of modes){
    const wrapper=inputs[key].closest('.hh-smart-hub-field-v806');
    if(wrapper){wrapper.classList.toggle('hh-smart-hub-active-v806',active===key);
     wrapper.classList.toggle('hh-smart-hub-confirmed-v806',!!state[key]);}
   }
   planButton.disabled=!state.origin||!state.destination;
   planButton.textContent=planButton.disabled?'🧭 Útvonaltervezés · válassz két helyet':'🔄 Útvonalak frissítése';
    const planWrapper=planButton.closest('.hh-smart-hub-auto-v806');
    if(planWrapper)planWrapper.hidden=planButton.disabled;
  }
  function updateMap(place,kind){
   const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
   const Marker=w.maplibregl&&w.maplibregl.Marker;
   if(markers[kind]){try{markers[kind].remove()}catch(_){} markers[kind]=null}
   if(!place||!map||typeof Marker!=='function')return;
   try{
    const node=d.createElement('div');node.className='hh-smart-hub-map-pin-v803';
    if(kind==='origin')node.className+=' hh-smart-hub-origin-pin-v804';
    const title=d.createElement('span');title.className='hh-guardian-pin-label-v829';
    title.textContent=(kind==='origin'?'🚶 ':'📍 ')+place.name;
    node.appendChild(title);
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
   // The existing Smart Travel controller owns both confirmed endpoints.
   w.dispatchEvent(new w.CustomEvent('hh-guardian-map-route-state-v836',{
    detail:{origin:state.origin,destination:state.destination}
   }));
  }
  function selectPlace(place,kind=active){
   if(!validPlace(place)||!modes.includes(kind))return false;
   stopRequest();
   if(place.source==='favorite'&&place.profile!==storedProfile)return false;
   if(place.source==='shared'&&
    !(w.HH_GUARDIAN_LIVE_V785?.authenticated&&w.HH_GUARDIAN_LIVE_V785?.familyAuthorized))return false;
   const verified=enrichSharedWithFavorite(place,w.localStorage);
   const item={name:verified.name.slice(0,120),subtitle:String(verified.subtitle||'').slice(0,190),
    displayName:String(verified.displayName||'').slice(0,80),lat:verified.lat,lng:verified.lng};
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
   showSaved(kind,'',requestId);
   message('Válassz kedvencet, vagy kezdj címet írni.');
  }
  function searchResults(items){
   clearResults();
   for(const item of items){
    const button=d.createElement('button');button.type='button';
    button.className='hh-smart-hub-result-v803';
    const pin=d.createElement('span');pin.className='hh-smart-hub-result-icon-v803';pin.textContent='📍';
    pin.setAttribute('aria-hidden','true');
    const copy=d.createElement('span');copy.className='hh-smart-hub-result-copy-v803';
    const title=d.createElement('strong');title.textContent=item.displayName||item.name;
    const address=d.createElement('small');address.textContent=item.displayName&&item.displayName!==item.name
     ?item.name+(item.subtitle&&item.subtitle!==item.name?' · '+item.subtitle:''):
      item.subtitle||'OpenStreetMap · cím';
    copy.append(title,address);
    const tag=d.createElement('span');tag.className='hh-smart-hub-result-tag-v824';
    tag.textContent=item.source==='favorite'?'KEDVENC':item.source==='shared'?'KÖZÖS':'CÍM';
    tag.setAttribute('aria-hidden','true');
    button.append(pin,copy,tag);
    button.addEventListener('click',()=>selectPlace(item,active));
    results.append(button);
   }
  }
  function showSaved(kind,raw,requestToken,includeShared=true){
   if(requestToken!==requestId||active!==kind)return [];
   const saved=favoriteSuggestions(w.localStorage,raw,40);
   const permitted=!!(w.HH_GUARDIAN_LIVE_V785?.authenticated&&
    w.HH_GUARDIAN_LIVE_V785?.familyAuthorized);
   let shared=[];
   if(includeShared&&permitted){
    const entries=w.HH_GUARDIAN_LANDMARKS_V776?.sharedEntries;
    if(Array.isArray(entries))shared=entries.filter(item=>validPlace(item))
     .filter(item=>!raw||term(item.name).includes(term(raw)))
     .slice(0,7).map(item=>enrichSharedWithFavorite({
      name:item.name,displayName:item.name,subtitle:'Közös térképes hely',
      lat:item.lat,lng:item.lng,source:'shared'
     },w.localStorage));
   }
   const unique=new Set();
   const items=[...saved,...shared].filter(item=>{
    const key=item.lat.toFixed(6)+':'+item.lng.toFixed(6);
    if(unique.has(key))return false;
    unique.add(key);return true;
   }).slice(0,50);
   searchResults(items);return items;
  }
  async function search(kind=active){
   if(!modes.includes(kind))return;
   const raw=inputs[kind].value;
   const value=queryText(raw);
   stopRequest();
   clearResults();
   const myId=requestId;
   const local=showSaved(kind,raw,myId);
   if(!value){
    message(local.length?'Válassz kedvencet vagy közös helyet.':
     'Írj legalább 3 karaktert egy címhez, vagy válassz mentett helyet.');
    return;
   }
   const elapsed=Date.now()-lastRequest;
   if(elapsed<1400){
    timer=w.setTimeout(()=>{if(myId===requestId)search(kind)},1400-elapsed);
    return;
   }
   lastRequest=Date.now();
   const controller=w.AbortController?new w.AbortController():null;pending=controller;
   if(!local.length)message('Helykeresés…');
   try{
    const res=await w.fetch(searchUrl(value),{
     mode:'cors',cache:'no-store',signal:controller?controller.signal:undefined});
    if(!res.ok)throw Error('HTTP '+res.status);
    const remote=normalizeResults(await res.json());
    if(requestId!==myId||active!==kind||inputs[kind].value!==raw)return;
    const existing=new Set(local.map(item=>item.lat.toFixed(5)+':'+item.lng.toFixed(5)));
    const combined=local.concat(remote.filter(item=>{
     const key=item.lat.toFixed(5)+':'+item.lng.toFixed(5);
     if(existing.has(key))return false;existing.add(key);return true;
    })).slice(0,50);
    searchResults(combined);
    message(combined.length?'Válassz egy ellenőrzött helyet.':
     'Nincs helytalálat. Próbálj másik nevet vagy címet.');
   }catch(e){
    if(requestId!==myId||e?.name==='AbortError')return;
    message(local.length?'Mentett helyek elérhetők, az online címkeresés átmenetileg nem működik.':
     'Helykeresési hiba. Próbáld újra.');
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
    const key=requestId;
    const local=showSaved(kind,field.value,key);
    if(!queryText(field.value)){
     message(local.length?'Válassz mentett helyet.':'Írj legalább 3 karaktert a címkereséshez.');return;
    }
    timer=w.setTimeout(()=>{if(key===requestId)search(kind)},450);
   });
   field.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();search(kind)}
   });
  }
  function locateOrigin(){
   if(geoBusy)return;
   const geolocation=w.navigator&&w.navigator.geolocation;
   if(!geolocation||typeof geolocation.getCurrentPosition!=='function'){
    message('A jelenlegi pozíció nem érhető el ebben a böngészőben. Adj meg egy indulási címet.');
    return;
   }
   stopRequest();clearResults();
   const token=requestId,expectedProfile=storedProfile;
   geoBusy=true;locateButton.disabled=true;
   locateButton.setAttribute('aria-busy','true');
   message('Jelenlegi pozíció lekérése… Engedélyezd a helyhozzáférést, ha a telefon kéri.');
   const finish=()=>{
    geoBusy=false;locateButton.disabled=false;
    locateButton.setAttribute('aria-busy','false');
   };
   try{
    geolocation.getCurrentPosition(position=>{
     const validToken=token===requestId&&expectedProfile===storedProfile;
     finish();
     if(!validToken)return;
     const place=currentPositionPlace(position);
     if(!place){
      message('A GPS-pozíció nem elég friss vagy pontos (300 m feletti bizonytalanság). Próbáld szabad ég alatt, vagy adj meg címet.');
      return;
     }
     if(selectPlace(place,'origin')){
      const suffix=state.destination?' Az útvonalakat újraterveztem.':' Válaszd ki az úti célt.';
      message('Jelenlegi pozíció rögzítve indulási helyként (±'+place.accuracyMeters+' m).'+suffix);
     }
    },error=>{
     const validToken=token===requestId&&expectedProfile===storedProfile;
     finish();
     if(!validToken)return;
     const code=error&&error.code;
     message(code===1
      ?'A helymeghatározás nincs engedélyezve. Engedélyezd a telefon és a böngésző/HH One beállításaiban, vagy írj be címet.'
      :code===3?'A helymeghatározás időtúllépéssel megszakadt. Próbáld újra szabad ég alatt.'
      :'Nem sikerült meghatározni a jelenlegi pozíciót. Próbáld újra, vagy írj be címet.');
    },{enableHighAccuracy:true,maximumAge:15000,timeout:12000});
   }catch(_){
    finish();message('A helymeghatározás nem indítható ezen az eszközön. Használd a címkeresőt.');
   }
  }
  locateButton.addEventListener('click',locateOrigin);
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
  function loadSlots(){
   const pool=w.HH_TRAVEL_FAVORITES_V972;
   if(pool?.getSlots)return pool.getSlots();
   try{return normalizedSlots(JSON.parse(w.localStorage.getItem(STORE+storedProfile)||'null'))}
   catch(_){return blankSlots()}
  }
  function saveSlots(slots){
   const pool=w.HH_TRAVEL_FAVORITES_V972;
   if(pool?.setSlots)return pool.setSlots(slots);
   try{w.localStorage.setItem(STORE+storedProfile,JSON.stringify(normalizedSlots(slots)));return true}
   catch(_){message('A kedvenc címek tárolása ezen a böngészőn nem sikerült.');return false}
  }
  function renderFavorites(){
   const slots=loadSlots();favorites.replaceChildren();
   if(w.HH_TRAVEL_FAVORITES_V972){
    const refresh=d.createElement('button');refresh.type='button';
    refresh.className='hh-family-fav-refresh-v972';
    refresh.textContent='☁ Közös helyek frissítése';
    refresh.setAttribute('aria-label','40 családi kedvenc hely felhőszinkronjának frissítése');
    refresh.addEventListener('click',async()=>{
     refresh.disabled=true;refresh.textContent='☁ Frissítés…';
     const ok=await w.HH_TRAVEL_FAVORITES_V972.sync(true);
     refresh.disabled=false;refresh.textContent='☁ Közös helyek frissítése';
     message(ok?'A közös családi helyek frissültek.':'Helyi lista elérhető · felhőszinkronhoz családi belépés és internet szükséges.');
    });
    favorites.append(refresh);
   }
   if(profileText)profileText.textContent=w.HH_TRAVEL_FAVORITES_V972?
    '40 közös családi kedvenc hely · BKK / MÁV / Volán':
    (storedProfile==='m'?'Mónika':'Zsolt')+' · 10 saját kedvenc hely';
   slots.forEach((entry,index)=>{
    const row=d.createElement('div');row.className='hh-smart-hub-favorite-row-v806';
    const name=d.createElement('input');name.type='text';name.maxLength=34;
    name.value=entry.label;name.className='hh-smart-hub-favorite-name-v806';
    name.setAttribute('aria-label',(index+1)+'. kedvenc hely neve');
    const use=d.createElement('button');use.type='button';use.className='hh-smart-hub-favorite-use-v806';
    use.textContent=entry.place?'📍 '+entry.place.name:'Üres hely';
    use.disabled=!entry.place;
    use.title=entry.place?formatPlace(entry.place):'Még nincs mentett hely';
    use.addEventListener('click',()=>{if(entry.place)selectPlace({
     ...entry.place,displayName:entry.label,source:'favorite',profile:storedProfile
    },active)});
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
  // Preserve full route endpoints; clear only a redundant Smart Places locator pin.
  if(w.addEventListener)w.addEventListener('hh-smart-place-saved-v1069',e=>{
   const fix=e?.detail;
   if(!fix||!Number.isFinite(fix.lat)||!Number.isFinite(fix.lng)||
      state.origin&&state.destination)return;
   for(const kind of modes){
    const place=state[kind];if(!place||!markers[kind])continue;
    const metres=Math.hypot((place.lat-fix.lat)*111195,
     (place.lng-fix.lng)*111195*Math.cos(fix.lat*Math.PI/180));
    if(metres>30)continue;
    try{markers[kind].remove()}catch(_){}markers[kind]=null;
   }
  });
  // A verified map result fills the existing Hová field and triggers the single planner.
  if(w.addEventListener)w.addEventListener('hh-guardian-map-destination-v819',e=>{
   if(!e||!validPlace(e.detail))return;
   if(selectPlace(e.detail,'destination'))e.preventDefault();
  });
  // v836 fullscreen origin suggestions feed exactly this same BKK route planner.
  if(w.addEventListener)w.addEventListener('hh-guardian-map-origin-v836',e=>{
   if(!e||!validPlace(e.detail))return;
   if(e.detail.source==='favorite'&&e.detail.profile!==profileId(w.localStorage))return;
   if(e.detail.source==='shared'&&
      !(w.HH_GUARDIAN_LIVE_V785?.authenticated&&w.HH_GUARDIAN_LIVE_V785?.familyAuthorized))return;
   if(selectPlace(e.detail,'origin'))e.preventDefault();
  });
  if(w.addEventListener)w.addEventListener('hh-guardian-map-origin-clear-v836',()=>{
   stopRequest();clearResults();state.origin=null;
   inputs.origin.value='';updateMap(null,'origin');syncRoutes();
  });
  if(w.addEventListener)w.addEventListener('pagehide',()=>{
   stopRequest();for(const kind of modes){if(markers[kind])markers[kind].remove()}
  });
  w.addEventListener?.('hh-travel-favorites-changed',()=>{
   renderFavorites();
   if(d.activeElement===inputs[active])showSaved(active,inputs[active].value,requestId);
  });
  renderFavorites();updateStyles();
  message('Koppints a Honnan vagy Hová mezőre. Két kiválasztott cím után automatikusan tervezünk.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {queryText,searchUrl,normalizeResults,validPlace,swapState,slotLabel,
  blankSlots,normalizedSlots,profileId,listFavoritePlaces,favoriteSuggestions,displayPlace,enrichSharedWithFavorite,currentPositionPlace,init,version:'860'};
});
