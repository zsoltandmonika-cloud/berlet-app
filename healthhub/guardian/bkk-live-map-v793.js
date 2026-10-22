/* Smart Arrival v793 MapLibre live-vehicle overlay.
 * Isolated component, never modifies v792 route layers.
 * Receives ONLY sanitized, validated snapshots. No fake/demo vehicles.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_LIVE_MAP_V793=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID='hh-bkk-live-v793';
 const COLORS={260:'#1c83d1',17:'#e0a800',19:'#e0a800'};
 function toFeatureCollection(vehicles){
  return {type:'FeatureCollection',features:vehicles.map(v=>({
   type:'Feature',properties:{route:v.routeId,label:v.routeId,vehicleId:v.id,observedAt:v.timestamp,headsign:v.headsign||''},
   geometry:{type:'Point',coordinates:[v.lng,v.lat]}
  }))};
 }
 function clear(map){
  const source=map&&map.getSource&&map.getSource(ID);
  if(source&&source.setData)source.setData(toFeatureCollection([]));
 }
 function render(map,verified){
  if(!map||!verified||verified.ok!==true||!Array.isArray(verified.vehicles)){
   clear(map);return false;
  }
  if(!map.isStyleLoaded||!map.isStyleLoaded())return false;
  try{
   if(!map.getSource(ID))map.addSource(ID,{type:'geojson',data:toFeatureCollection([])});
   if(!map.getLayer(ID+'-disc'))map.addLayer({id:ID+'-disc',type:'circle',source:ID,
    paint:{'circle-radius':15,'circle-color':['match',['get','route'],'260',COLORS[260],COLORS[17]],
     'circle-stroke-color':'#fff','circle-stroke-width':3}});
   if(!map.getLayer(ID+'-number'))map.addLayer({id:ID+'-number',type:'symbol',source:ID,
    layout:{'text-field':['get','label'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
     'text-size':14,'text-allow-overlap':true},
    paint:{'text-color':'#fff'}});
   map.getSource(ID).setData(toFeatureCollection(verified.vehicles));
   return true;
  }catch(_){clear(map);return false;}
 }
 return {render,clear,toFeatureCollection,sourceId:ID};
});
