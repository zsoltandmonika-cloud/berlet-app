/* SHO Taxi map credits · immediate compact attribution v4.
 * Both OpenFreeMap/OSM credits remain accessible through the 26px information
 * icon in the bottom-right corner. Never show the expanded source banner on
 * initial map load. Users can still tap the info icon to read source details.
 */
(function(w){'use strict';
 function collapse(map){
  const attrib=map?.getContainer?.()?.querySelector?.('.maplibregl-ctrl-attrib');
  if(!attrib)return false;
  attrib.classList.add('maplibregl-compact');
  attrib.classList.remove('maplibregl-compact-show');
  return true;
 }
 function bind(map){
  if(!map||typeof map.on!=='function')return;
  // MapLibre usually adds the attribution control in the constructor.
  // Collapse it immediately, then do so again after any map/style load.
  collapse(map);
  map.on('load',()=>collapse(map));
  map.on('style.load',()=>collapse(map));
 }
 w.SHO_TAXI_COMPACT_ATTRIBUTION_V3=Object.freeze({bind});
})(window);
