/* Smart Arrival v793: separate real-position-only MapLibre layer.
 * These symbols are actual fresh GTFS-RT observations, NEVER static mid-route badges.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_LIVE_MAP_V793=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const ID='hh-bkk-live-v793';
 const COLORS={260:'#148ee0',17:'#e4ab00',19:'#e4ab00',1:'#e4ab00',41:'#e4ab00'};
 const EMPTY={type:'FeatureCollection',features:[]};
 function toFeatureCollection(vehicles){
  return {type:'FeatureCollection',features:vehicles.map(v=>({
   type:'Feature',properties:{route:v.routeId,routeKey:v.routeKey||'',mode:v.mode||'',label:v.routeId,vehicleId:v.id,observedAt:v.timestamp,headsign:v.headsign||''},
   geometry:{type:'Point',coordinates:[v.lng,v.lat]}
  }))};
 }
 // Browser DOM markers live ABOVE the WebGL canvas, including the 3D building layer.
 // Keep the source-backed positions, never fall back to a made-up vehicle location.
 const domMarkers=new Map();let domMap=null;
 function removeDom(){
  for(const marker of domMarkers.values())try{marker.remove()}catch(_){}
  domMarkers.clear();domMap=null;
 }
 // Official v800 set: the same small premium glass capsule for bus, tram and future HÉV.
 // Keep this DOM-only above MapLibre's 3D canvas. Labels are textContent, never feed HTML.
 const ICONS=Object.freeze({
  bus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="16" rx="3"/><path d="M4.5 11h15M8 7.5h8M7.5 19.5v2m9-2v2"/><circle cx="8" cy="15.6" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="15.6" r=".9" fill="currentColor" stroke="none"/></svg>',
  tram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 2 3 3 3-3M12 5v2M7 20l-2 2m12-2 2 2"/><rect x="5.5" y="7" width="13" height="12" rx="2.5"/><path d="M12 7v7M5.5 14h13"/><circle cx="8.5" cy="16.5" r=".8" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16.5" r=".8" fill="currentColor" stroke="none"/></svg>',
  hev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v3M8 5h8M7 21l-2 2m12-2 2 2"/><rect x="4.5" y="6" width="15" height="14" rx="3"/><path d="M12 6v8M4.5 14h15"/><circle cx="8.5" cy="17" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="17" r=".9" fill="currentColor" stroke="none"/></svg>'
 });
 function makeMarkerElement(doc,vehicle){
  const route=String(vehicle.routeId);
  const mode=['bus','tram','trolley','metro','hev','other'].includes(vehicle.mode)?vehicle.mode:route==='260'?'bus':/^H[0-9]/.test(route)?'hev':'tram';
  const wrapper=doc.createElement('div');
  wrapper.className='hh-bkk-live-vehicle-dom-v797 hh-bkk-glass-marker-v800 hh-bkk-glass--'+mode;
  // MapLibre writes transforms on the outer element; never override them.
  wrapper.style.cssText='z-index:50';
  wrapper.setAttribute('role','img');
  wrapper.setAttribute('aria-label','Élő '+route+' · '+({bus:'busz',tram:'villamos',trolley:'trolibusz',metro:'metró',hev:'HÉV',other:'járat'}[mode]||'BKK-járat')+' · friss BKK-pozíció');
  const stack=doc.createElement('div');
  stack.className='hh-bkk-glass-stack-v800';
  const badge=doc.createElement('div');
  badge.className='hh-bkk-glass-capsule-v800';
  const icon=doc.createElement('span');
  icon.className='hh-bkk-glass-icon-v800';
  // These icon strings are static application artwork, not external BKK content.
  icon.innerHTML=ICONS[mode]||ICONS.bus;
  const lamp=doc.createElement('span');
  lamp.className='hh-bkk-glass-live-v800';
  lamp.setAttribute('aria-hidden','true');
  const number=doc.createElement('span');
  number.className='hh-bkk-glass-number-v800';
  number.textContent=route;
  badge.append(icon,lamp,number);
  const pin=doc.createElement('span');
  pin.className='hh-bkk-glass-pin-v800';
  pin.setAttribute('aria-hidden','true');
  stack.append(badge,pin);
  wrapper.appendChild(stack);
  if(doc&&typeof wrapper.addEventListener==='function'&&root?.maplibregl?.Popup){
   wrapper.setAttribute('tabindex','0');wrapper.setAttribute('role','button');
   const details=()=>{
    const m=root.HH_GUARDIAN_V761?.map;
    if(!m||!Number.isFinite(vehicle.lng)||!Number.isFinite(vehicle.lat))return;
    try{
     const el=doc.createElement('div');el.className='hh-bkk-route-info-v912';
     const title=doc.createElement('strong');title.textContent=({bus:'Busz',tram:'Villamos',trolley:'Trolibusz',metro:'Metró',hev:'HÉV',other:'Járat'}[mode]||'BKK')+' '+route;
     const line=doc.createElement('div');line.textContent=vehicle.headsign?'Irány: '+vehicle.headsign:'Irány: nincs adat';
     const time=doc.createElement('small');
     const timeValue=Date.parse(vehicle.timestamp);
     time.textContent=Number.isFinite(timeValue)?'Utolsó hiteles BKK-járműpozíció: '+new Date(timeValue).toLocaleTimeString('hu-HU'):'Élő megfigyelés ideje nem ismert';
     el.append(title,line,time);
     new root.maplibregl.Popup({offset:14,closeButton:true,className:'hh-bkk-popup-v912'})
      .setLngLat([vehicle.lng,vehicle.lat]).setDOMContent(el).addTo(m);
    }catch(_){}
   };
   wrapper.addEventListener('click',e=>{if(e?.stopPropagation)e.stopPropagation();details()});
   wrapper.addEventListener('keydown',e=>{if(e?.key==='Enter'||e?.key===' '){if(e.preventDefault)e.preventDefault();details()}});
  }
  return wrapper;
 }
 // Optional DOM dependency injection supports deterministic tests without a browser.
 function renderDom(map,vehicles,dom){
  const Marker=(dom&&dom.Marker)||(root&&root.maplibregl&&root.maplibregl.Marker);
  const doc=(dom&&dom.document)||(root&&root.document);
  if(typeof Marker!=='function'||!doc||typeof doc.createElement!=='function')return null;
  if(domMap&&domMap!==map)removeDom();
  domMap=map;
  try{
   const present=new Set();
   for(const v of vehicles){
    if(!v||typeof v.id!=='string'||!v.id||!Number.isFinite(v.lat)||!Number.isFinite(v.lng)
     ||Math.abs(v.lat)>90||Math.abs(v.lng)>180||typeof v.routeId!=='string'||(!v.routeKey&&!['260','17','19','1','41'].includes(v.routeId)))continue;
    present.add(v.id);
    let marker=domMarkers.get(v.id);
    if(!marker){
     marker=new Marker({element:makeMarkerElement(doc,v),anchor:'bottom',offset:[0,-6],opacity:1,opacityWhenCovered:1});
     marker.setLngLat([v.lng,v.lat]).addTo(map);
     domMarkers.set(v.id,marker);
    }else marker.setLngLat([v.lng,v.lat]);
   }
   for(const [id,marker] of domMarkers)if(!present.has(id)){marker.remove();domMarkers.delete(id)}
   return true;
  }catch(_){removeDom();return false}
 }
 function clear(map){
  removeDom();
  const source=map&&map.getSource&&map.getSource(ID);
  if(source&&source.setData)source.setData(EMPTY);
 }
 function render(map,verified,dom){
  if(!map||!verified||verified.ok!==true||!Array.isArray(verified.vehicles)){
   clear(map);return false;
  }
  const domResult=renderDom(map,verified.vehicles,dom);
  if(domResult!==null){
   // A WebGL layer may remain from an older hot-loaded pilot. Clear it to avoid duplicates.
   const existing=map.getSource&&map.getSource(ID);
   if(existing&&existing.setData)existing.setData(EMPTY);
   return domResult;
  }
  if(!map.isStyleLoaded||!map.isStyleLoaded())return false;
  try{
   if(!map.getSource(ID))map.addSource(ID,{type:'geojson',data:EMPTY});
   if(!map.getLayer(ID+'-halo'))map.addLayer({
    id:ID+'-halo',type:'circle',source:ID,
    paint:{'circle-radius':31,'circle-color':'#00dff5','circle-opacity':.27,'circle-blur':.65}
   });
   if(!map.getLayer(ID+'-ring'))map.addLayer({
    id:ID+'-ring',type:'circle',source:ID,
    paint:{'circle-radius':24,'circle-color':'#123c58','circle-opacity':.9,
     'circle-stroke-color':'#3ff2ff','circle-stroke-width':3.4}
   });
   if(!map.getLayer(ID+'-disc'))map.addLayer({
    id:ID+'-disc',type:'circle',source:ID,
    paint:{'circle-radius':18,'circle-color':['match',['get','mode'],'tram','#e4ab00','hev','#279a71','trolley','#cf414d','metro','#2872bd','#148ee0'],
     'circle-stroke-color':'#fff','circle-stroke-width':2}
   });
   if(!map.getLayer(ID+'-number'))map.addLayer({
    id:ID+'-number',type:'symbol',source:ID,
    layout:{'text-field':['get','label'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
     'text-size':16,'text-allow-overlap':true,'text-ignore-placement':true},
    paint:{'text-color':'#fff','text-halo-color':'#09314c','text-halo-width':.6}
   });
   if(!map.getLayer(ID+'-live-label'))map.addLayer({
    id:ID+'-live-label',type:'symbol',source:ID,
    layout:{'text-field':'ÉLŐ','text-font':['Open Sans Bold','Arial Unicode MS Bold'],
     'text-size':12,'text-anchor':'bottom','text-offset':[0,-2.3],
     'text-allow-overlap':true,'text-ignore-placement':true},
    paint:{'text-color':'#fff','text-halo-color':'#063656','text-halo-width':2}
   });
   map.getSource(ID).setData(toFeatureCollection(verified.vehicles));
   return true;
  }catch(_){clear(map);return false}
 }
 // Explicit user-initiated focus only; never move the Guardian map on each update.
 function focus(map,vehicles){
  if(!map||!Array.isArray(vehicles)||!vehicles.length)return false;
  const valid=vehicles.filter(v=>v&&Number.isFinite(v.lat)&&Number.isFinite(v.lng)&&Math.abs(v.lat)<=90&&Math.abs(v.lng)<=180);
  if(!valid.length)return false;
  try{
   if(map.resize)map.resize();
   if(valid.length===1 || !map.fitBounds){
    if(!map.flyTo)return false;
    const v=valid[0];
    map.flyTo({center:[v.lng,v.lat],zoom:Math.max(15.8,typeof map.getZoom==='function'?map.getZoom():15.8),duration:700});
   }else{
    const lngs=valid.map(v=>v.lng),lats=valid.map(v=>v.lat);
    const bounds=[[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
    map.fitBounds(bounds,{padding:{top:75,bottom:75,left:48,right:48},maxZoom:15.8,duration:700});
   }
   return true;
  }catch(_){return false}
 }
 return {render,clear,focus,toFeatureCollection,sourceId:ID,makeMarkerElement};
});
