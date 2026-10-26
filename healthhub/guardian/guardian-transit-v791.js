/* HealthHub Family Guard Transit v790 · official BKK GTFS static map layer.
 * No fabricated coordinates, no live vehicle positions, no geolocation or private route data.
 * Source: BKK Zrt., CC BY 4.0. Selection is saved only on THIS browser.
 */
(function(w,d){
'use strict';
const IDS=['260','17','19','1','41'];
const REQUIRED_IDS=new Set(['260','17','19']);
const STORAGE='hh-guardian-transit-selected-v790';
const PREF_KEY='hh-guardian-transit-direction-v791';
const PROFILE_ROUTES='hh-guardian-transit-selected-profiles-v801';
let selectionByProfile={zsolt:['260'],monika:['260']};
let prefs={zsolt:{},monika:{}};let profile='zsolt';
const SOURCE='BKK Zrt., CC BY 4.0';
const $=id=>d.getElementById(id);
let selected=new Set(['260']),routes=null,map=null,mounted=false,retry=0;
// Map overlays are transient, per-profile display choices independent of favorites.
const visibleByProfile={zsolt:new Set(),monika:new Set()};
function isLineVisible(id){return IDS.includes(id)&&visibleByProfile[profile].has(id)}
function visibilityChanged(id){
 if(w.dispatchEvent&&typeof w.CustomEvent==='function')
  w.dispatchEvent(new w.CustomEvent('hh-bkk-line-visibility-v855',{detail:{id,profile,visible:isLineVisible(id)}}));
}
function setLineVisible(id,visible){
 if(!IDS.includes(id)||!info(id))return false;
 if(visible)visibleByProfile[profile].add(id);
 else visibleByProfile[profile].delete(id);
 showSelected();visibilityChanged(id);
 status(id+' · '+(visible?'térképes útvonal megjelenítve':'térképes útvonal elrejtve')+'.');
 return true;
}
function setFavoriteTracked(id,enabled){
 if(!IDS.includes(id))return false;
 if(enabled)selected.add(id);else {selected.delete(id);visibleByProfile[profile].delete(id)}
 save();updateControls();showSelected();visibilityChanged(id);
 return true;
}
const info=id=>routes&&routes[id];
function status(s){const x=$('hhTransitStatus');if(x)x.textContent=s}
function checked(id){return selected.has(id)}
function validCoord(x){return Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&Math.abs(x[0])<=180&&Math.abs(x[1])<=90}
function validate(doc){
 if(!doc||!doc.routes||doc.schemaVersion!==1||doc.source!==SOURCE)return null;
 const clean={};
 for(const id of IDS){
  const raw=doc.routes[id];
  // Old signed snapshots contain only 260/17/19; accept them without
  // inventing coordinates for the new 1/41 layers.
  if(!raw){if(REQUIRED_IDS.has(id))return null;continue;}
  if(raw.name!==id||!Array.isArray(raw.variants)||!raw.variants.length)return null;
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
 let legacy=['260'];
 try{
  const saved=JSON.parse(w.localStorage.getItem(STORAGE)||'null');
  if(Array.isArray(saved))legacy=saved.filter(x=>IDS.includes(x));
 }catch(_){}
 let hasProfileData=false;
 try{
  const saved=JSON.parse(w.localStorage.getItem(PROFILE_ROUTES)||'null');
  if(saved&&typeof saved==='object'){
   hasProfileData=true;
   for(const p of ['zsolt','monika']){
    if(Array.isArray(saved[p]))selectionByProfile[p]=saved[p].filter(x=>IDS.includes(x));
   }
  }
 }catch(_){}
 if(!hasProfileData)selectionByProfile[profile]=legacy;
 selected=new Set(selectionByProfile[profile]);
}
function save(){
 selectionByProfile[profile]=[...selected];
 try{
  w.localStorage.setItem(PROFILE_ROUTES,JSON.stringify(selectionByProfile));
  // Legacy key is maintained for older pages and stores only the active profile.
  w.localStorage.setItem(STORAGE,JSON.stringify([...selected]));
 }catch(_){status('A járatkijelölést ezen a böngészőn nem sikerült menteni.')}
}
function activeVariants(id){const r=info(id);if(!r)return [];const chosen=prefs[profile][id];return r.variants.filter((v,i)=>!Array.isArray(chosen)||chosen.includes(i));}
function routeFeatures(id){
 const r=info(id);if(!r)return {type:'FeatureCollection',features:[]};
 return {type:'FeatureCollection',features:activeVariants(id).map((v,i)=>({
  type:'Feature',properties:{route:id,headsign:v.headsign,direction:v.direction,variant:i},
  geometry:{type:'LineString',coordinates:v.shape}
 }))};
}
function stopsFeatures(id){
 const r=info(id);if(!r)return {type:'FeatureCollection',features:[]};
 const unique=new Map();
 for(const v of activeVariants(id))for(const p of v.stops){
  const key=(p.id||'')+'@'+p.lng+','+p.lat;
  if(!unique.has(key))unique.set(key,{
    type:'Feature',properties:{name:p.name,route:id},
    geometry:{type:'Point',coordinates:[p.lng,p.lat]}
  });
 }
 return {type:'FeatureCollection',features:[...unique.values()]};
}
function badgeFeatures(id){
 const features=[];
 for(const v of activeVariants(id)){
  const coordinates=v.shape;
  if(!coordinates||coordinates.length<2)continue;
  // A representative point ON the official route. Not a vehicle location.
  const point=coordinates[Math.floor((coordinates.length-1)/2)];
  features.push({type:'Feature',properties:{route:id,headsign:v.headsign||'',
   kind:id==='260'?'bus':'tram',label:id},geometry:{type:'Point',coordinates:point}});
 }
 return {type:'FeatureCollection',features};
}
function refreshData(){if(!map||!routes)return;for(const id of IDS){let s=map.getSource('hh-bkk-route-'+id);if(s&&s.setData)s.setData(routeFeatures(id));s=map.getSource('hh-bkk-stops-'+id);if(s&&s.setData)s.setData(stopsFeatures(id));s=map.getSource('hh-bkk-badges-'+id);if(s&&s.setData)s.setData(badgeFeatures(id));}}
function attach(){
 if(!map||!routes||!(map.isStyleLoaded&&map.isStyleLoaded()))return;
 for(const id of IDS){
  const r=info(id);
  if(!r)continue;
  const line='hh-bkk-route-'+id,stops='hh-bkk-stops-'+id;
  const visible=isLineVisible(id)?'visible':'none';
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
   const badges='hh-bkk-badges-'+id;
   if(!map.getSource(badges))map.addSource(badges,{type:'geojson',data:badgeFeatures(id)});
   if(!map.getLayer(badges+'-glow'))map.addLayer({
    id:badges+'-glow',type:'circle',source:badges,minzoom:11.8,
    layout:{visibility:visible},
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],11.8,20,15,28],
     'circle-color':id==='260'?'#45a8f7':'#ffe17c','circle-opacity':.21,'circle-blur':.7}
   });
   if(!map.getLayer(badges+'-disc'))map.addLayer({
    id:badges+'-disc',type:'circle',source:badges,minzoom:11.8,
    layout:{visibility:visible},
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],11.8,14,15,20],
     'circle-color':id==='260'?'#1764a8':'#e6ba26',
     'circle-stroke-color':'#f5faff','circle-stroke-width':2.5,'circle-opacity':.92}
   });
   if(!map.getLayer(badges+'-text'))map.addLayer({
    id:badges+'-text',type:'symbol',source:badges,minzoom:10.5,
    layout:{visibility:visible,'text-field':['get','label'],'text-size':id==='260'?17:18,
     'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
     'text-allow-overlap':false,'text-ignore-placement':false,'text-anchor':'center'},
    paint:{'text-color':id==='260'?'#ffffff':'#172b42','text-halo-color':id==='260'?'#16416b':'#ffe798','text-halo-width':.5}
   });
   // Only one large route badge per official GTFS variant; individual stops stay compact.
  }catch(e){status('BKK-térképréteg hiba: '+(e&&e.message||'ismeretlen hiba'))}
 }
}
function showSelected(){
 if(!map||!routes)return;
 attach();refreshData();
 for(const id of IDS){
  const show=isLineVisible(id)?'visible':'none';
  for(const layer of ['hh-bkk-route-'+id+'-outline','hh-bkk-route-'+id+'-main','hh-bkk-stops-'+id+'-circle','hh-bkk-stops-'+id+'-number','hh-bkk-badges-'+id+'-glow','hh-bkk-badges-'+id+'-disc','hh-bkk-badges-'+id+'-text']){
   try{if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility',show)}catch(_){}
  }
 }
}
function renderCards(){
 const host=$('hhTransitCardsV791');if(!host)return;
 host.replaceChildren();
 for(const id of IDS){
  if(!checked(id))continue;
  const r=info(id),item=d.createElement('article');item.className='hh-transit-card '+(id==='260'?'bus':'tram');
  const number=d.createElement('b');number.className='hh-transit-card-number';number.textContent=id;
  const content=d.createElement('div');content.className='hh-transit-card-body';
  const name=d.createElement('strong');name.textContent=id==='260'?'Busz':'Villamos';
  const dest=d.createElement('span');dest.textContent=!r?'BKK adatok betöltése…':activeVariants(id).map(v=>v.headsign).filter(Boolean).join(' / ')||'Nincs kijelölt irány';
  const note=d.createElement('small');note.textContent='Menetrendi útvonal, nem élő helyzet';
  content.append(name,dest,note);
  const btn=d.createElement('button');btn.type='button';btn.textContent='Mutasd';btn.disabled=!r||!activeVariants(id).length;
  btn.addEventListener('click',()=>showRoute(id));
  item.append(number,content,btn);host.append(item);
 }
}
function updateControls(){
 for(const id of IDS){
  const cb=$('hhTransitRoute'+id),show=$('hhTransitShow'+id);
  if(cb)cb.checked=checked(id);
  if(show)show.disabled=!routes||!info(id);
 }
 const counter=$('hhTransitCount');if(counter)counter.textContent=String(selected.size);
 renderCards();
}
function showRoute(id){
 const r=info(id);
 if(!r){status('A '+id+'-es BKK-útvonal adatai még töltődnek.');return;}
 if(!map){status('A térkép még nem áll készen. Frissítsd az oldalt, ha nem tölt be.');return;}
 showSelected();
 if(!(map.getLayer&&map.getLayer('hh-bkk-route-'+id+'-main'))){status('Az útvonal térképrétege még töltődik. Próbáld újra egy pillanat múlva.');return;}
 const lngs=[],lats=[];
 for(const v of activeVariants(id))for(const point of v.shape){lngs.push(point[0]);lats.push(point[1])}
 if(!lngs.length)return;
 const bounds=[[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
 try{map.fitBounds(bounds,{padding:{top:75,bottom:70,left:35,right:35},maxZoom:15.3,duration:650})}
 catch(_){status('Nem sikerült az útvonalra közelíteni.')}
 const summary=r.variants.map(v=>v.headsign).filter(Boolean);
 status(id+' · BKK menetrendi útvonal, '+r.variants.length+' változat'+(summary.length?' · '+summary.join(' / '):'')+'. Nem élő járműkövetés.');
}
function onToggle(id,value){
 if(!IDS.includes(id))return;
 if(value){selected.add(id);visibleByProfile[profile].add(id)}
 else {selected.delete(id);visibleByProfile[profile].delete(id)}
 save();updateControls();showSelected();visibilityChanged(id);
 const catalog=w.HH_BKK_CATALOG_V801;
 if(catalog&&catalog.onTrackedChange)catalog.onTrackedChange(id,value);
 const count=selected.size;
 status(count?count+' kijelölt járat a térképen · statikus BKK GTFS':'Nincs kijelölt járat. Jelölj be egyet a térképes megjelenítéshez.');
}
function connectMap(m){
 if(mounted||!m)return;
 map=m;mounted=true;
 if(map.on){
  map.on('style.load',showSelected);
  map.on('load',showSelected);
  // MapLibre may complete style initialization after Guardian's load callback.
  // Retry when rendering becomes idle, without creating a second map.
  map.on('idle',function(){
   if(routes&&map.getLayer&&!map.getLayer('hh-bkk-route-260-main'))showSelected();
  });
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
  // GitHub-token-driven data commits do not always trigger Pages rebuilds.
  // Public GitHub RAW JSON is an authenticated-build-produced, no-key fallback.
  const urls=[
   new URL('./bkk-routes-v790.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-routes-v790.json'
  ];
  let doc=null,clean=null,problem='';
  for(const url of urls){
   try{
    const res=await w.fetch(url,{cache:'no-cache'});
    if(!res.ok)throw Error('HTTP '+res.status);
    const result=await res.json(),validated=validate(result);
    if(!validated)throw Error('Érvénytelen GTFS-pillanatkép');
    doc=result;clean=validated;break;
   }catch(e){problem=(e&&e.message)||'adatkapcsolat'}
  }
  if(!clean)throw Error('A hivatalos BKK GTFS-pillanatkép még nem érhető el ('+problem+').');
  routes=clean;retry=0;updateControls();showSelected();renderDirections();renderCards();
  // Watchlist enables newly supported buttons only AFTER verified shapes load.
  if(w.dispatchEvent&&typeof w.CustomEvent==='function')
   w.dispatchEvent(new w.CustomEvent('hh-bkk-static-map-ready-v817'));
  const refreshed=Date.parse(doc.generatedAt||'');
  const age=Number.isFinite(refreshed)?Math.round((Date.now()-refreshed)/86400000):NaN;
  const stale=Number.isFinite(age)&&age>7;
  status('BKK · statikus GTFS-útvonalak betöltve ('+doc.generatedAt.slice(0,10)+'). '+selected.size+' kijelölt járat.'+(stale?' ⚠️ 7 napnál régebbi adat.':''));
 }catch(e){
  status('BKK járatadat frissítésre vár · '+(e&&e.message||'adatkapcsolati hiba'));
  if(++retry<=3)w.setTimeout(download,40000);
 }
}
function loadPrefs(){try{const x=JSON.parse(w.localStorage.getItem(PREF_KEY)||'{}');for(const p of ['zsolt','monika'])if(x[p]&&typeof x[p]==='object')prefs[p]=x[p]}catch(_){} }
function savePrefs(){try{w.localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(_){}}
function setProfile(p){
 if(!['zsolt','monika'].includes(p))return;
 if(p!==profile){
  selectionByProfile[profile]=[...selected];
  profile=p;selected=new Set(selectionByProfile[profile]);
 }
 const field=$('hhTransitProfileV791');if(field)field.value=profile;
 const card=d.querySelector?.('.hh-transit-v791');if(card)card.setAttribute('data-bkk-profile',profile);
 const panel=$('hhTransitPanel');if(panel)panel.setAttribute('data-bkk-profile',profile);
 updateControls();renderDirections();showSelected();renderCards();
 const catalog=w.HH_BKK_CATALOG_V801;
 if(catalog&&catalog.setProfile)catalog.setProfile(profile);
}
function toggleVariant(id,index,enabled){if(!info(id))return;const all=info(id).variants.map((_,i)=>i);const old=Array.isArray(prefs[profile][id])?prefs[profile][id]:all;const next=new Set(old);if(enabled)next.add(index);else next.delete(index);prefs[profile][id]=[...next].sort((a,b)=>a-b);savePrefs();showSelected();renderDirections();renderCards()}
function renderDirections(){const host=$('hhTransitDirectionsV791');if(!host)return;host.replaceChildren();const title=d.createElement('p');title.textContent='Irányok külön, a BKK tényleges végállomásneveivel · menetrendi útvonal';host.append(title);for(const id of IDS){const r=info(id);if(!r)continue;const header=d.createElement('strong');header.textContent=(r.mode==='bus'?'🚌 ':'🚋 ')+id;host.append(header);r.variants.forEach((v,i)=>{const label=d.createElement('label'),cb=d.createElement('input'),span=d.createElement('span');label.className='hh-transit-dir hh-transit-dir--'+(r.mode==='bus'?'bus':r.mode==='tram'?'tram':r.mode==='hev'?'hev':'other');cb.type='checkbox';const sel=prefs[profile][id];cb.checked=!Array.isArray(sel)||sel.includes(i);cb.addEventListener('change',()=>toggleVariant(id,i,cb.checked));span.textContent=v.headsign||('Változat '+(i+1));label.append(cb,span);host.append(label)})}}
function init(){
 if(!$('hhTransitPanel'))return;
 profile=w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
 restore();loadPrefs();updateControls();
 const card=d.querySelector?.('.hh-transit-v791');if(card)card.setAttribute('data-bkk-profile',profile);
 const panel=$('hhTransitPanel');if(panel)panel.setAttribute('data-bkk-profile',profile);
 for(const id of IDS){
  const cb=$('hhTransitRoute'+id),show=$('hhTransitShow'+id);
  if(cb)cb.addEventListener('change',()=>onToggle(id,cb.checked));
  if(show)show.addEventListener('click',()=>{
   setLineVisible(id,true);
   showRoute(id);
  });
 }
 const guardian=w.HH_GUARDIAN_V761;
 if(guardian&&guardian.map)connectMap(guardian.map);
 const s=$('hhTransitProfileV791');if(s){s.value=profile;s.addEventListener('change',()=>setProfile(s.value))}
 download();
}
w.HH_GUARDIAN_TRANSIT_V790=Object.freeze({init,mountMap:connectMap,get selected(){return [...selected]},setProfile,
 toggleLine(id,enabled){if(!IDS.includes(id))return false;onToggle(id,!!enabled);return true;},
 hasMapRoute(id){return IDS.includes(id)&&!!info(id);},
 isLineVisible,
 setLineVisible,
 toggleLineVisible(id){return setLineVisible(id,!isLineVisible(id))},
 setFavoriteTracked,
 showLine(id){
  if(!IDS.includes(id)||!info(id))return false;
  setLineVisible(id,true);
  showRoute(id);
  return true;
 },version:'817'});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
// v799 default: live BKK on the original Family Guard URL, using authenticated snapshots.
// A private diagnostic ?hhLivePilot=off remains available as a fail-closed fallback.
if(new URLSearchParams(w.location.search).get('hhLivePilot')!=='off'){
 const dir=new URL('./',d.currentScript?.src||w.location.href);
 for(const file of ['bkk-live-v793.js','bkk-live-map-v793.js','guardian-live-pilot-v793.js']){
  const script=d.createElement('script');
  script.async=false;
  const url=new URL(file,dir);url.searchParams.set('v','856-live-vehicle-toggle');
  script.src=url.href;
  script.onerror=function(){
   const holder=d.getElementById('hhTransitPanel');
   if(!holder)return;
   let label=d.getElementById('hhBkkLiveStatusV793');
   if(!label){label=d.createElement('p');label.id='hhBkkLiveStatusV793';holder.prepend(label)}
   label.setAttribute('role','status');
   label.textContent='⚠️ BKK élő helyzet · Egy szükséges fájl nem töltődött be. Frissítsd az oldalt.';
  };
  d.head.appendChild(script);
 }
}
})(window,document);
