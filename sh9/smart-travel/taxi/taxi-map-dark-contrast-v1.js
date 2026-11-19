/* SHO Smart Taxi · Golden Standard Dark Map Clarity v1.
 * Lightens actual street strokes, road-name labels and a few building details
 * in OpenFreeMap Dark ONLY. Keeps land/background dark, cyan route line, pins,
 * map credit control and Light style entirely unchanged.
 * Each map re-applies this when MapLibre reloads a style after the theme toggle.
 */
(function(w){'use strict';
 const roadColors={
  highway_path:{'line-color':'#485467'},
  highway_minor:{'line-color':'#4b586d'},
  highway_major_casing:{'line-color':'#323d51'},
  highway_major_inner:{'line-color':'#61718a'},
  highway_major_subtle:{'line-color':'#5b6981'},
  highway_motorway_casing:{'line-color':'#354257'},
  highway_motorway_inner:{'line-color':'#6a7d98'},
  highway_motorway_subtle:{'line-color':'#5c6d87'},
  highway_name_other:{'text-color':'#d4dceb','text-halo-color':'#161d2b','text-halo-width':1.25},
  highway_name_motorway:{'text-color':'#d5dded','text-halo-color':'#141b29','text-halo-width':1.2},
  building:{'fill-color':'#242b36','fill-outline-color':'#3b4657'},
  place_other:{'text-color':'#aebdd2'},
  place_suburb:{'text-color':'#aebdd2'},
  place_village:{'text-color':'#aebdd2'},
  place_town:{'text-color':'#b7c5da'},
  place_city:{'text-color':'#c1cfe2'},
  place_city_large:{'text-color':'#c5d3e7'}
 };
 function apply(map){
  if(!map||w.SHO_TAXI_MAP_THEME_V1?.getTheme?.()!=='dark')return 0;
  if(typeof map.getLayer!=='function'||typeof map.setPaintProperty!=='function')return 0;
  let changed=0;
  for(const [id,paint] of Object.entries(roadColors)){
   if(!map.getLayer(id))continue;
   for(const [key,value] of Object.entries(paint)){
    try{map.setPaintProperty(id,key,value);changed++;}
    catch(e){console.warn('SHO Taxi: map layer contrast skipped',id,key);}
   }
  }
  return changed;
 }
 function bind(map){
  if(!map||typeof map.on!=='function')return;
  map.on('style.load',()=>apply(map));
  if(map.isStyleLoaded?.())apply(map);
 }
 w.SHO_TAXI_DARK_CONTRAST_V1=Object.freeze({apply,bind});
})(window);
