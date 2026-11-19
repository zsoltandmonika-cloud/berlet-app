/* SHO Taxi map credits · MapLibre compact attribution v3.
 * Legal OSM/OpenFreeMap credit stays readable for 5 seconds after the map
 * appears, then minimizes to a small accessible ⓘ in the map corner.
 * Tapping the icon expands all actual provider/licence links.
 * Compatible with the MapLibre v4.7.1 native attribution control.
 */
(function(w){'use strict';
 const timers=new WeakMap();
 function compact(map){
  if(!map?.getContainer)return false;
  const holder=map.getContainer();
  const attrib=holder?.querySelector?.('.maplibregl-ctrl-attrib');
  if(!attrib)return false;
  attrib.classList.add('maplibregl-compact');
  attrib.classList.remove('maplibregl-compact-show');
  attrib.removeAttribute('open');
  return true;
 }
 function schedule(map){
  if(!map)return;
  const old=timers.get(map);
  if(old)w.clearTimeout(old);
  const timer=w.setTimeout(()=>{
   timers.delete(map);
   compact(map);
  },5200);
  timers.set(map,timer);
 }
 function bind(map){
  if(!map||typeof map.on!=='function')return;
  map.on('load',()=>schedule(map));
  map.on('style.load',()=>schedule(map));
  if(map.loaded?.())schedule(map);
 }
 w.SHO_TAXI_COMPACT_ATTRIBUTION_V3=Object.freeze({bind});
})(window);
