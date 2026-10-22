/* HealthHub Family Guard Transit v790 · official BKK GTFS static map layer.
 * No fabricated coordinates, no live vehicle positions, no geolocation or private route data.
 * Source: BKK Zrt., CC BY 4.0. Selection is saved only on THIS browser.
 */
(function(w,d){
'use strict';
const IDS=['260','17','19'];
const STORAGE='hh-guardian-transit-selected-v790';
const SOURCE='BKK Zrt., CC BY 4.0';
const $=id=>d.getElementById(id);
let selected=new Set(['260']),routes=null,map=null,mounted=false,retry=0;
const info=id=>routes&&routes[id];
function status(s){const x=$('hhTransitStatus');if(x)x.textContent=s}
function checked(id){return selected.has(id)}
function validCoord(x){return Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&Math.abs(x[0])<=180&&Math.abs(x[1])<=90}
function validate(doc){
 if(!doc||!doc.routes||doc.schemaVersion!==1||doc.source!==SOURCE)return null;
 const clean={};
 for(const id of IDS){
  const raw=doc.routes[id];
  if(!raw||raw.name!==id||!Array.isArray(raw.variants)||!raw.variants.length)return null;
  const variants=[];
  for(const v of raw.variants.slice(0,5)){
   if(!Array.isArray(v.shape)||v.shape.length<2||!v.shape.every(validCoord))return null;
   if(!Array.isArray(v.stops)||!v.stops.length)return null;
   const stops=v.stops.filter(p=>p&&validCoord([p.lng,p.lat])&&typeof p.name==='string');
   if(!stops.length)return null;
   variants.push({direction:String(v.direction||'0'),headsign:String(v.headsign||''),
    shape:v.shape,stops});
  }
  const color=/^#[A-Fa-f0-9]{6}$/.test(raw.color)?raw.color:(id==='260'?'#2476c5':'#cf9200');
  clean[id]={id,mode:id==='260'?'bus':'tram',color,variants};
 }
 return clean;
}
function restore(){
 try{
  const saved=JSON.parse(w.localStorage.getItem(STORAGE)||'null');
  if(Array.isArray(saved))selected=new Set(saved.filter(x=>IDS.includes(x)));
 }catch(_){selected=new Set(['260'])}
}
function save(){
 try{w.localStorage.setItem(STORAGE,JSON.stringify([...selected]))}
 catch(_){status('A járatkijelölést ezen a böngészőn nem sikerült menteni.')}
}
function routeFeatures(id){
 const r=info(id);if(!r)return {type:'FeatureCollection',features:[]};
 return {type:'FeatureCollection',features:r.variants.map((v,i)=>({
  type:'Feature',properties:{route:id,headsign:v.headsign,direction:v.direction,variant:i},
  geometry:{type:'LineString',coordinates:v.shape}
 }))};
}
function stopsFeatures(id){
 const r=info(id);if(!r)return {type:'FeatureCollection',features:[]};
 const unique=new Map();
 for(const v of r.variants)for(const p of v.stops){
  const key=(p.id||'')+'@'+p.lng+','+p.lat;
  if(!unique.has(key))unique.set(key,{
    type:'Feature',properties:{name:p.name,route:id},
    geometry:{type:'Point',coordinates:[p.lng,p.lat]}
  });
 }
 return {type:'FeatureCollection',features:[...unique.values()]};
}
function attach(){
 if(!map||!routes||!(map.isStyleLoaded&&map.isStyleLoaded()))return;
 for(const id of IDS){
  const r=info(id),line='hh-bkk-route-'+id,stops='hh-bkk-stops-'+id;
  const visible=checked(id)?'visible':'none';
  try{
   if(!map.getSource(line))map.addSource(line,{type:'geojson',data:routeFeatures(id)});
   if(!map.getSource(stops))map.addSource(stops,{type:'geojson',data:stopsFeatures(id)});
   if(!map.getLayer(line+'-outline'))map.addLayer({
    id:line+'-outline',type:'line',source:line,layout:{visibility:visible,'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,4,15,10],
     'line-opacity':.85}
   });
   if(!map.getLayer(line+'-main'))map.addLayer({
    id:line+'-main',type:'line',source:line,layout:{visibility:visible,'line-cap':'round','line-join':'round'},
    paint:{'line-color':r.color,'line-width':['interpolate',['linear'],['zoom'],10,2.4,15,6.2],
     'line-opacity':.92}
   });
   if(!map.getLayer(stops+'-circle'))map.addLayer({
    id:stops+'-circle',type:'circle',source:stops,minzoom:12.5,
    layout:{visibility:visible},paint:{'circle-radius':['interpolate',['linear'],['zoom'],12.5,3,16,6],
     'circle-color':'#ffffff','circle-stroke-color':r.color,'circle-stroke-width':2.3}
   });
  }catch(e){status('BKK-térképréteg hiba: '+(e&&e.message||'ismeretlen hiba'))}
 }
}
function showSelected(){
 if(!map||!routes)return;
 attach();
 for(const id of IDS){
  const show=checked(id)?'visible':'none';
  for(const layer of ['hh-bkk-route-'+id+'-outline','hh-bkk-route-'+id+'-main','hh-bkk-stops-'+id+'-circle']){
   try{if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility',show)}catch(_){}
  }
 }
}
function updateControls(){
 for(const id of IDS){
  const cb=$('hhTransitRoute'+id),show=$('hhTransitShow'+id);
  if(cb)cb.checked=checked(id);
  if(show)show.disabled=!routes||!info(id);
 }
 const counter=$('hhTransitCount');if(counter)counter.textContent=String(selected.size);
}
function showRoute(id){
 const r=info(id);
 if(!map||!r)return;
 const lngs=[],lats=[];
 for(const v of r.variants)for(const point of v.shape){lngs.push(point[0]);lats.push(point[1])}
 if(!lngs.length)return;
 const bounds=[[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
 try{map.fitBounds(bounds,{padding:{top:75,bottom:70,left:35,right:35},maxZoom:15.3,duration:650})}
 catch(_){status('Nem sikerült az útvonalra közelíteni.')}
 const summary=r.variants.map(v=>v.headsign).filter(Boolean);
 status(id+' · BKK menetrendi útvonal, '+r.variants.length+' változat'+(summary.length?' · '+summary.join(' / '):'')+'. Nem élő járműkövetés.');
}
function onToggle(id,value){
 if(value)selected.add(id);else selected.delete(id);
 save();updateControls();showSelected();
 const count=selected.size;
 status(count?count+' kijelölt járat a térképen · statikus BKK GTFS':'Nincs kijelölt járat. Jelölj be egyet a térképes megjelenítéshez.');
}
function connectMap(m){
 if(mounted||!m)return;
 map=m;mounted=true;
 if(map.on){
  map.on('style.load',showSelected);
  if(map.isStyleLoaded&&map.isStyleLoaded())showSelected();
  for(const id of IDS)map.on('click','hh-bkk-stops-'+id+'-circle',function(e){
   const feature=e&&e.features&&e.features[0];if(!feature)return;
   const p=feature.properties||{};
   status(id+' · '+String(p.name||'megálló')+' · menetrendi megálló, nem élő adat');
   if(w.maplibregl&&w.maplibregl.Popup){
    try{new w.maplibregl.Popup({closeButton:true,offset:12})
     .setLngLat(feature.geometry.coordinates).setText(id+' · '+String(p.name||'Megálló')).addTo(map)}catch(_){}
   }
  });
 }
}
async function download(){
 if(!w.fetch){status('A BKK statikus adatbetöltés nem támogatott ezen a böngészőn.');return}
 try{
  const url=new URL('./bkk-routes-v790.json',w.location.href);
  const res=await w.fetch(url.href,{cache:'no-cache'});
  if(!res.ok)throw Error('A GTFS-pillanatkép még nem készült el (HTTP '+res.status+').');
  const doc=await res.json(),clean=validate(doc);
  if(!clean)throw Error('A BKK-route adatfájl ellenőrzése sikertelen.');
  routes=clean;retry=0;updateControls();showSelected();
  const refreshed=Date.parse(doc.generatedAt||'');
  const age=Number.isFinite(refreshed)?Math.round((Date.now()-refreshed)/86400000):NaN;
  const stale=Number.isFinite(age)&&age>7;
  status('BKK · statikus GTFS-útvonalak betöltve ('+doc.generatedAt.slice(0,10)+'). '+selected.size+' kijelölt járat.'+(stale?' ⚠️ 7 napnál régebbi adat.':''));
 }catch(e){
  status('BKK járatadat frissítésre vár · '+(e&&e.message||'adatkapcsolati hiba'));
  if(++retry<=3)w.setTimeout(download,40000);
 }
}
function init(){
 if(!$('hhTransitPanel'))return;
 restore();updateControls();
 for(const id of IDS){
  const cb=$('hhTransitRoute'+id),show=$('hhTransitShow'+id);
  if(cb)cb.addEventListener('change',()=>onToggle(id,cb.checked));
  if(show)show.addEventListener('click',()=>{
   if(!checked(id))onToggle(id,true);
   showRoute(id);
  });
 }
 const guardian=w.HH_GUARDIAN_V761;
 if(guardian&&guardian.map)connectMap(guardian.map);
 download();
}
w.HH_GUARDIAN_TRANSIT_V790=Object.freeze({init,mountMap:connectMap,get selected(){return [...selected]},version:'790'});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
