/* Smart Arrival v793: separate real-position-only MapLibre layer.
 * These symbols are actual fresh GTFS-RT observations, NEVER static mid-route badges.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_LIVE_MAP_V793=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
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
 function clear(map){
  const source=map&&map.getSource&&map.getSource(ID);
  if(source&&source.setData)source.setData(EMPTY);
 }
 function render(map,verified){
  if(!map||!verified||verified.ok!==true||!Array.isArray(verified.vehicles)){
   clear(map);return false;
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
