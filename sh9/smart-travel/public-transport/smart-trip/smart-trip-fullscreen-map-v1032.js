/* Smart Trip AI v1032 · One-tap full viewport MapLibre map.
 * Matches the existing Family Guard OpenFreeMap style.
 * Map scripts/styles/tiles load ONLY after tapping "Térkép".
 * No GPS, routing claims, automatic location access or polling.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const trigger=$('st22Map'),dialog=$('st22MapDialog');
 const canvas=$('st22MapCanvas'),dismiss=$('st22MapClose'),status=$('st22MapStatus');
 const locations=$('st22MapPlaces');
 if(!trigger||!dialog||!canvas||!dismiss||!status||!locations)return;
 const CENTER=[19.0467,47.506];
 const CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
 const JS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
 let instance=null,markers=[],loading=null,lastFocused=null;
 function valid(p){
  return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 }
 function point(input){
  const k=input==='from'?'origin':'destination';
  const typed=$(input==='from'?'st22From':'st22To');
  const selected=w.SH9_SMART_TRIP_AI_V1022?.selectedPlaces?.()?.[k];
  // Never show an old selection after its text was edited.
  if(!valid(selected)||!typed||typed.value.trim()!==String(selected.name||'').trim())return null;
  return selected;
 }
 function entries(){
  return [{id:'from',label:'Indulás',symbol:'A',klass:'origin'},
          {id:'to',label:'Érkezés',symbol:'B',klass:'destination'}]
   .map(v=>({...v,place:point(v.id)})).filter(v=>v.place);
 }
 function setInfo(pts){
  locations.replaceChildren();
  if(pts.length){
   for(const p of pts){
    const line=d.createElement('span');
    line.textContent=(p.klass==='origin'?'🔵 ':'🩷 ')+p.label+': '+p.place.name;
    locations.append(line);
   }
   status.textContent=pts.length===2
    ?'A két mentett hely megjelölve. A menetrendi útvonal a Phase 2-ben érkezik.'
    :'A kiválasztott hely megjelölve. Az útvonalat még nem számoljuk.';
  }else{
   status.textContent='Budapesti térkép. Válassz mentett indulási és célhelyet a jelölésükhöz.';
  }
 }
 function styles(){
  if(d.querySelector('link[data-st22-maplibre]'))return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const l=d.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.st22Maplibre='1';
   l.onload=resolve;l.onerror=()=>reject(new Error('A térképfelület stílusa nem töltődött be.'));
   d.head.append(l);
  });
 }
 function library(){
  if(w.maplibregl)return Promise.resolve();
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const s=d.createElement('script');s.src=JS;s.async=true;
   s.onload=()=>w.maplibregl?resolve():reject(new Error('Hiányzik a térképmotor.'));
   s.onerror=()=>reject(new Error('A térképmotor nem tölthető be. Ellenőrizd az internetkapcsolatot.'));
   d.head.append(s);
  }).catch(e=>{loading=null;throw e});
  return loading;
 }
 function pin(p){
  const el=d.createElement('div');el.className='st22-map-pin st22-map-pin-'+p.klass;
  const inner=d.createElement('span');inner.textContent=p.symbol;el.append(inner);
  const label=p.label+': '+p.place.name;el.title=label;el.setAttribute('aria-label',label);
  const marker=new w.maplibregl.Marker({element:el,anchor:'bottom'})
   .setLngLat([p.place.lng,p.place.lat]).addTo(instance);
  markers.push(marker);
 }
 function renderMarkers(pts){
  for(const m of markers)m.remove();markers=[];
  if(!instance)return;
  for(const p of pts)pin(p);
  if(pts.length===2){
   const [a,b]=pts.map(p=>[p.place.lng,p.place.lat]);
   const box=new w.maplibregl.LngLatBounds(a,b);
   instance.fitBounds(box,{padding:{top:Math.min(150,w.innerHeight*.20),bottom:Math.min(170,w.innerHeight*.23),left:45,right:45},maxZoom:16.5,duration:0});
  }else if(pts.length===1){
   const p=pts[0].place;instance.jumpTo({center:[p.lng,p.lat],zoom:14.5});
  }else instance.jumpTo({center:CENTER,zoom:12});
  instance.resize();
 }
 async function open(){
  if(dialog.open)return;
  lastFocused=d.activeElement;
  lastFocused?.blur?.();
  try{dialog.showModal()}catch(_){dialog.setAttribute('open','')}
  w.requestAnimationFrame?.(()=>instance?.resize());
  const pts=entries();
  setInfo(pts);
  if(instance){renderMarkers(pts);return}
  status.textContent='Térkép betöltése…';
  try{
   await Promise.all([styles(),library()]);
   if(!dialog.open)return;
   instance=new w.maplibregl.Map({
    container:canvas,
    style:'https://tiles.openfreemap.org/styles/bright',
    center:CENTER,zoom:12,attributionControl:true,
    pitch:0,bearing:0,antialias:false
   });
   instance.addControl(new w.maplibregl.NavigationControl({showCompass:true}),'bottom-right');
   instance.once('load',()=>{
    if(!dialog.open)return;
    setInfo(pts);renderMarkers(pts);
   });
   instance.on('error',e=>{
    if(!instance?.isStyleLoaded?.()&&dialog.open){
     status.textContent='A térképcsempék nem érhetők el. Ellenőrizd az internetkapcsolatot.';
    }
   });
   w.requestAnimationFrame?.(()=>instance?.resize());
  }catch(e){if(dialog.open)status.textContent=e?.message||'A térkép nem tölthető be.';}
 }
 function close(){
  if(dialog.open){try{dialog.close()}catch(_){dialog.removeAttribute('open')}}
 }
 trigger.addEventListener('click',open);
 dismiss.addEventListener('click',close);
 dialog.addEventListener('close',()=>{lastFocused?.focus?.({preventScroll:true});lastFocused=null});
 w.addEventListener('resize',()=>{if(dialog.open)instance?.resize()});
})(window,document);
