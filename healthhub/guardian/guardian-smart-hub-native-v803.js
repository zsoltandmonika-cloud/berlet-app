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
  u.searchParams.set('lang','hu');
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
  if(!form||!input||!results||!status||!chosen)return;
  let timer=null,seq=0,lastCall=0,pending=null,marker=null,selection=null;
  const setStatus=t=>{status.textContent=t};
  function clearMarker(){
   if(marker){try{marker.remove()}catch(_){} marker=null}
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
   clearMarker();
   try{
    const node=d.createElement('div');
    node.className='hh-smart-hub-map-pin-v803';
    node.textContent='📍 '+item.name;
    node.setAttribute('aria-label','Kiválasztott úti cél: '+item.name);
    marker=new Marker({element:node,anchor:'bottom',offset:[0,-5]});
    marker.setLngLat([item.lng,item.lat]).addTo(map);
    map.flyTo({center:[item.lng,item.lat],zoom:16.5,duration:750});
   }catch(_){clearMarker();setStatus('Nem sikerült megjeleníteni a helyet a térképen.');return false}
   selection=item;
   chosen.hidden=false;
   chosen.textContent='📍 Úti cél: '+item.name+' · '+item.subtitle;
   render([]);
   setStatus('A helyet megtaláltam a saját 3D térképünkön. BKK-útvonaltervezés ehhez a célhoz a következő fejlesztés.');
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
    setStatus('A helykereső most nem elérhető. Próbáld újra később. A térkép és a BKK-járatok ettől működnek.');
   }finally{if(pending===controller)pending=null}
  }
  form.addEventListener('submit',e=>{e.preventDefault();search()});
  input.addEventListener('input',()=>{
   cancel();render([]);chosen.hidden=true;selection=null;clearMarker();
   if(!queryText(input.value)){setStatus('Írj legalább 3 karaktert egy helynévből vagy címből.');return}
   const own=seq;
   timer=w.setTimeout(()=>{if(own===seq)search()},DEBOUNCE_MS);
  });
  if(example)example.addEventListener('click',()=>{
   input.value='Bécsi Corner';search();input.focus();
  });
  w.addEventListener&&w.addEventListener('pagehide',()=>{cancel();clearMarker()});
  setStatus('Kezdd el írni az úti célt. A találatok a HealthHubon belül jelennek meg.');
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {queryText,searchUrl,normalizeResults,init,version:'803'};
});
