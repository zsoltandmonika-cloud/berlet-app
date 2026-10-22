/* Smart Hub v803 · native HealthHub search on the existing MapLibre map.
 * Provider: Photon (OpenStreetMap geocoding), public demo pilot, rate-limited.
 * Search and results remain on HealthHub; no Google screen, no paid key, no GPS request.
 * Searches NEVER invent a destination, route, ETA, walking time or vehicle location.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_SMART_HUB_NATIVE_V803=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const API='https://photon.komoot.io/api/';
 const MIN_LENGTH=3,MAX_RESULTS=6,DEBOUNCE_MS=1000,MIN_GAP_MS=1400;
 function queryText(value){
  const s=String(value||'').trim().replace(/\s+/g,' ').slice(0,120);
  return s.length>=MIN_LENGTH&&!/[\u0000-\u001f\u007f]/.test(s)?s:null;
 }
 function searchUrl(query){
  const s=queryText(query);
  if(!s)return null;
  const u=new URL(API);
  u.searchParams.set('q',s);
  u.searchParams.set('limit',String(MAX_RESULTS));
  // Photon public endpoint returns HTTP 400 for lang=hu (only default,de,en,fr supported).
  // Omit lang: default OSM names already preserve Budapest's Hungarian place names.
  // Budapest proximity bias, never a user's private GPS coordinate.
  u.searchParams.set('lat','47.506');
  u.searchParams.set('lon','19.0467');
  return u.href;
 }
 function normalizeResults(raw){
  if(!raw||raw.type!=='FeatureCollection'||!Array.isArray(raw.features))return [];
  const out=[],seen=new Set();
  for(const f of raw.features.slice(0,25)){
   if(!f||f.geometry?.type!=='Point'||!Array.isArray(f.geometry.coordinates))continue;
   const [lng,lat]=f.geometry.coordinates;
   if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90)continue;
   const p=f.properties||{};
   if(p.countrycode&&String(p.countrycode).toUpperCase()!=='HU')continue;
   const name=String(p.name||p.street||p.city||'').trim().slice(0,130);
   if(!name)continue;
   const locality=[p.housenumber&&p.street?p.street+' '+p.housenumber:p.street,
    p.district,p.city||p.county].filter(Boolean).map(x=>String(x).slice(0,70));
   const subtitle=[...new Set(locality)].join(' · ')||'Helyszín · OpenStreetMap';
   const key=(p.osm_type||'')+':'+(p.osm_id||'')+':'+lng+':'+lat;
   if(seen.has(key))continue;
   seen.add(key);
   out.push({name,subtitle,lat,lng});
   if(out.length>=MAX_RESULTS)break;
  }
  return out;
 }
 function init(){
  const d=w&&w.document;
  if(!d||!w.fetch)return;
  const form=d.getElementById('hhSmartHubDestinationFormV802');
  const input=d.getElementById('hhSmartHubDestinationInputV802');
  const results=d.getElementById('hhSmartHubNativeResultsV803');
  const status=d.getElementById('hhSmartHubDestinationStatusV802');
  const example=d.getElementById('hhSmartHubExampleV802');
  const chosen=d.getElementById('hhSmartHubSelectedV803');
  const originChoice=d.getElementById('hhSmartHubOriginModeV804');
  const targetChoice=d.getElementById('hhSmartHubTargetModeV804');
  const chosenOrigin=d.getElementById('hhSmartHubOriginSelectedV804');
  if(!form||!input||!results||!status||!chosen)return;
  let timer=null,seq=0,lastCall=0,pending=null,marker=null,selection=null,mode='destination';
  let originMarker=null;
  const setStatus=t=>{status.textContent=t};
  function clearMarker(){
   if(marker){try{marker.remove()}catch(_){} marker=null}
  }
  function changeMode(next){
   if(next!=='origin'&&next!=='destination')return;
   cancel();mode=next;render([]);input.value='';
   input.placeholder=next==='origin'?'Pl. Óbudai rendelőintézet…':'Pl. Bécsi Corner…';
   if(originChoice)originChoice.setAttribute('aria-pressed',String(next==='origin'));
   if(targetChoice)targetChoice.setAttribute('aria-pressed',String(next==='destination'));
   setStatus(next==='origin'?'Keress egy indulási helyet.':'Keress egy úti célt.');
   input.focus();
  }
  function render(list){
   results.replaceChildren();
   for(const item of list){
    const btn=d.createElement('button');
    btn.type='button';btn.className='hh-smart-hub-result-v803';
    const pin=d.createElement('span');pin.className='hh-smart-hub-result-icon-v803';
    pin.textContent='⌖';pin.setAttribute('aria-hidden','true');
    const text=d.createElement('span');text.className='hh-smart-hub-result-copy-v803';
    const title=d.createElement('strong');title.textContent=item.name;
    const subtitle=d.createElement('small');subtitle.textContent=item.subtitle;
    text.append(title,subtitle);
    const arrow=d.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    btn.append(pin,text,arrow);
    btn.addEventListener('click',()=>pick(item));
    results.append(btn);
   }
  }
  function pick(item){
   const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
   const Marker=w.maplibregl&&w.maplibregl.Marker;
   if(!map||typeof Marker!=='function'){
    setStatus('A 3D térkép még nem áll készen. A kiválasztott helyhez töltsd újra az oldalt.');
    return false;
   }
   if(mode==='destination')clearMarker();
   try{
    const node=d.createElement('div');
    node.className='hh-smart-hub-map-pin-v803';
    node.textContent='📍 '+item.name;
    node.setAttribute('aria-label','Kiválasztott úti cél: '+item.name);
    if(mode==='origin'){
     if(originMarker)try{originMarker.remove()}catch(_){}
     node.className+=' hh-smart-hub-origin-pin-v804';
     originMarker=new Marker({element:node,anchor:'bottom',offset:[0,-5]});
     originMarker.setLngLat([item.lng,item.lat]).addTo(map);
    }else{
     marker=new Marker({element:node,anchor:'bottom',offset:[0,-5]});
     marker.setLngLat([item.lng,item.lat]).addTo(map);
    }
    map.flyTo({center:[item.lng,item.lat],zoom:16.5,duration:750});
   }catch(_){if(mode==='destination')clearMarker();setStatus('Nem sikerült megjeleníteni a helyet a térképen.');return false}
   selection=item;
   if(mode==='origin'){
    if(chosenOrigin){chosenOrigin.hidden=false;chosenOrigin.textContent='🚶 Indulás: '+item.name+' · '+item.subtitle}
   }else{
    chosen.hidden=false;
    chosen.textContent='📍 Úti cél: '+item.name+' · '+item.subtitle;
   }
   const router=w.HH_SMART_HUB_ROUTER_V804;
   if(router&&router.setPlace)router.setPlace(mode,item);
   render([]);
   setStatus('Hely kiválasztva. Ha az indulás és az úti cél is megvan, megjelennek a BKK-javaslatok.');
   const mapNode=d.getElementById('guardianMap');
   if(mapNode&&mapNode.scrollIntoView)mapNode.scrollIntoView({behavior:'smooth',block:'center'});
   return true;
  }
  function cancel(){
   seq++;
   if(timer!==null){w.clearTimeout(timer);timer=null}
   if(pending){try{pending.abort()}catch(_){}pending=null}
  }
  async function search(){
   const value=queryText(input.value);
   cancel();
   render([]);
   if(!value){setStatus('Írj legalább 3 karaktert egy helynévből vagy címből.');return}
   const current=seq;
   const gap=Math.max(0,MIN_GAP_MS-(Date.now()-lastCall));
   if(gap>0){timer=w.setTimeout(()=>{if(seq===current)search()},gap);return}
   lastCall=Date.now();
   const Controller=w.AbortController;
   const controller=Controller?new Controller():null;
   pending=controller;
   setStatus('Helyek keresése Budapest környékén…');
   try{
    const res=await w.fetch(searchUrl(value),{
     cache:'no-store',mode:'cors',signal:controller?controller.signal:undefined
    });
    if(!res.ok)throw Error('HTTP '+res.status);
    const matches=normalizeResults(await res.json());
    if(seq!==current)return;
    render(matches);
    setStatus(matches.length?matches.length+' ellenőrizhető helytalálat. Válaszd ki a megfelelő címet.':
     'Nem találtam egyezést. Írj pontosabb helynevet vagy címet.');
   }catch(err){
    if(seq!==current||err&&err.name==='AbortError')return;
    const reason=String(err&&err.message||'');
    setStatus(reason.startsWith('HTTP ')?'A helykereső HTTP '+reason.slice(5)+' választ küldött. Próbáld újra később.':'A helykereső hálózati hibába ütközött. Próbáld újra később.');
   }finally{if(pending===controller)pending=null}
  }
  form.addEventListener('submit',e=>{e.preventDefault();search()});
  input.addEventListener('input',()=>{
   cancel();render([]);selection=null;
   // Preserve confirmed origin/destination and map pins while typing another query.
   if(!queryText(input.value)){setStatus('Írj legalább 3 karaktert egy helynévből vagy címből.');return}
   const own=seq;
   timer=w.setTimeout(()=>{if(own===seq)search()},DEBOUNCE_MS);
  });
  if(originChoice)originChoice.addEventListener('click',()=>changeMode('origin'));
  if(targetChoice)targetChoice.addEventListener('click',()=>changeMode('destination'));
  if(example)example.addEventListener('click',()=>{
   input.value='Bécsi Corner';search();input.focus();
  });
  w.addEventListener&&w.addEventListener('pagehide',()=>{cancel();clearMarker();if(originMarker)originMarker.remove()});
  setStatus('Kezdd el írni az úti célt. A találatok a HealthHubon belül jelennek meg.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {queryText,searchUrl,normalizeResults,init,version:'803'};
});
