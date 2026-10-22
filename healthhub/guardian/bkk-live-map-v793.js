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
 const COLORS={260:'#148ee0',17:'#e4ab00',19:'#e4ab00'};
 const EMPTY={type:'FeatureCollection',features:[]};
 function toFeatureCollection(vehicles){
  return {type:'FeatureCollection',features:vehicles.map(v=>({
   type:'Feature',properties:{route:v.routeId,label:v.routeId,vehicleId:v.id,observedAt:v.timestamp,headsign:v.headsign||''},
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
 function makeMarkerElement(doc,vehicle){
  const bus=vehicle.routeId==='260',color=bus?'linear-gradient(145deg,#249ce4,#0963aa)':'linear-gradient(145deg,#ffe67a,#e8b522)';
  const wrapper=doc.createElement('div');
  wrapper.className='hh-bkk-live-vehicle-dom-v797';
  // Do NOT override MapLibre's position/transform on this outer marker node.
  wrapper.style.cssText='z-index:50;pointer-events:auto;filter:drop-shadow(0 3px 7px rgba(0,18,43,.5))';
  wrapper.setAttribute('role','img');
  wrapper.setAttribute('aria-label','Élő '+(bus?'260-as busz':vehicle.routeId+'-es villamos')+' · BKK-járműpozíció');
  const stack=doc.createElement('div');
  stack.style.cssText='display:flex;flex-direction:column;align-items:center;gap:0;white-space:nowrap';
  const live=doc.createElement('span');
  live.textContent='● ÉLŐ';
  live.style.cssText='font:850 9px/1.1 system-ui;color:#e8fbff;background:linear-gradient(135deg,#0a567b,#093757);border:1px solid #6de6ef;border-bottom:0;border-radius:9px 9px 0 0;padding:3px 8px 2px;letter-spacing:.6px;position:relative;top:1px';
  const badge=doc.createElement('span');
  badge.textContent=(bus?'🚌 ':'🚋 ')+vehicle.routeId;
  badge.style.cssText='display:flex;align-items:center;justify-content:center;min-width:53px;min-height:33px;padding:0 8px;border-radius:11px;border:2px solid rgba(255,255,255,.95);background:'+color+';color:'+(bus?'#fff':'#172a41')+';font:850 14px/1.1 system-ui;letter-spacing:.15px;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 0 0 2px rgba(47,232,255,.19)';
  const pin=doc.createElement('span');
  pin.style.cssText='width:7px;height:7px;border-radius:50%;background:#e9feff;border:1px solid #07365a;box-shadow:0 0 0 2px rgba(54,242,255,.8)';
  stack.append(live,badge,pin);wrapper.appendChild(stack);
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
     ||Math.abs(v.lat)>90||Math.abs(v.lng)>180||!['260','17','19'].includes(v.routeId))continue;
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
    paint:{'circle-radius':18,'circle-color':['match',['get','route'],'260',COLORS[260],COLORS[17]],
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
 return {render,clear,focus,toFeatureCollection,sourceId:ID};
});
