/* Family Guard v912 · BKK favorite static stop-pattern overlay on the ORIGINAL map.
 * Official GTFS stop locations + ORDER, not roadway/rail track geometry.
 * Load 1 existing shared v806 BKK network snapshot only if user taps Mutasd.
 * Never touch family GPS, profile map controls, realtime feed, or existing 5 accurate shapes.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_EXTRA_ROUTE_V912=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const SOURCE='BKK Zrt., CC BY 4.0',KEY=/^(?:bus|tram|trolley|metro|hev|other):[A-Za-z0-9_-]{1,16}$/;
 const MODE={bus:'Busz',tram:'Villamos',trolley:'Trolibusz',metro:'Metró',hev:'HÉV',other:'Járat'};
 const MAX_OPEN=12,STORE={zsolt:new Set(),monika:new Set()},activeLayer=new Set();
 let currentMap=null,profiles='zsolt',routes=null,loading=null;
 const boundClicks=new Map();
 const profile=()=>w?.document?.getElementById('hhTransitProfileV791')?.value==='monika'?'monika':'zsolt';
 const validCoord=x=>Array.isArray(x)&&x.length===4&&typeof x[0]==='string'&&typeof x[1]==='string'&&Number.isFinite(x[2])&&Number.isFinite(x[3])&&x[2]>=45&&x[2]<=49&&x[3]>=16&&x[3]<=23;
 function parse(doc,now=Date.now()){
  if(!doc||doc.schemaVersion!==1||doc.source!==SOURCE||!Array.isArray(doc.routes)||doc.routes.length<100||doc.routes.length>8000)return null;
  const time=Date.parse(doc.generatedAt);
  if(!Number.isFinite(time)||time>now+60000||now-time>21*86400000)return null;
  const result=new Map();
  for(const r of doc.routes){
   const key=r?.mode+':'+r?.id;
   if(!KEY.test(key)||!Array.isArray(r.stops)||r.stops.length<2||r.stops.length>350||!r.stops.every(validCoord))continue;
   if(!result.has(key))result.set(key,[]);
   const variants=result.get(key);
   if(variants.length<6)variants.push({headsign:String(r.headsign||'').slice(0,100),
    direction:String(r.direction||'').slice(0,8),
    stops:r.stops.map(s=>({id:s[0],name:s[1].slice(0,90),lat:s[2],lng:s[3]}))});
  }
  return result.size>100?result:null;
 }
 const mapApi=()=>w?.HH_GUARDIAN_V761?.map||null;
 function notify(){
  if(w?.dispatchEvent&&typeof w.CustomEvent==='function')
   w.dispatchEvent(new w.CustomEvent('hh-bkk-extra-route-v912-changed',{detail:{profile:profiles}}));
 }
 function status(msg){const el=w?.document?.getElementById('hhTransitStatus');if(el)el.textContent='BKK · '+msg}
 async function load(){
  if(routes)return routes;
  if(loading)return loading;
  loading=(async()=>{
   const urls=[new URL('./bkk-network-v806.json',w.location.href).href,
    'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-network-v806.json'];
   for(const url of urls){
    try{
     const res=await w.fetch(url,{cache:'no-cache'});
     if(!res.ok)continue;
     const parsed=parse(await res.json());
     if(parsed){routes=parsed;return routes}
    }catch(_){}
   }
   throw Error('A hivatalos BKK megállósorrend jelenleg nem érhető el.');
  })();
  try{return await loading}finally{loading=null}
 }
 function layerId(key){return 'hh-bkk-extra-v912-'+key.replace(':','-')}
 function features(key){
  const rs=routes?.get(key)||[];
  const line=[],stops=[],mode=key.split(':')[0],id=key.split(':')[1];
  for(let n=0;n<rs.length;n++){
   const v=rs[n],coords=v.stops.map(s=>[s.lng,s.lat]);
   line.push({type:'Feature',properties:{key,route:id,mode,headsign:v.headsign,variant:n},
    geometry:{type:'LineString',coordinates:coords}});
   for(const s of v.stops)stops.push({type:'Feature',
    properties:{key,route:id,mode,stop:s.name,headsign:v.headsign},
    geometry:{type:'Point',coordinates:[s.lng,s.lat]}});
  }
  return {line:{type:'FeatureCollection',features:line},stops:{type:'FeatureCollection',features:stops}};
 }
 function validMap(m){return !!(m&&m.addSource&&m.getSource&&m.addLayer&&m.getLayer&&m.setLayoutProperty);}
 function remove(key){
  const m=currentMap;if(!validMap(m))return;
  const id=layerId(key);
  const handlers=boundClicks.get(key);
  if(handlers&&typeof m.off==='function'){
   try{m.off('click',id+'-line',handlers.line);m.off('click',id+'-stops',handlers.stops)}catch(_){}
  }
  boundClicks.delete(key);
  for(const suffix of ['-stops','-line']){
   try{if(m.getLayer(id+suffix)&&m.removeLayer)m.removeLayer(id+suffix)}catch(_){}
  }
  for(const suffix of ['-stops','-line']){
   try{if(m.getSource(id+suffix)&&m.removeSource)m.removeSource(id+suffix)}catch(_){}
  }
  activeLayer.delete(key);
 }
 function popup(key,coord,stop){
  const m=currentMap,Popup=w?.maplibregl?.Popup,doc=w?.document,rs=routes?.get(key);
  if(!m||!Popup||!doc||!rs?.length||!coord)return;
  try{
   const [mode,id]=key.split(':'),root=doc.createElement('div');
   root.className='hh-bkk-route-info-v912';
   const title=doc.createElement('strong');title.textContent=(MODE[mode]||'BKK')+' '+id;root.append(title);
   const directions=[...new Set(rs.map(r=>r.headsign).filter(Boolean))].slice(0,3);
   const subtitle=doc.createElement('div');subtitle.textContent=(stop?'Megálló: '+stop+' · ':'')+'Irány: '+(directions.join(' / ')||'nincs adat');root.append(subtitle);
   const count=doc.createElement('div');
   count.textContent=rs.length+' hivatalos menetrendi útvonalváltozat · '+Math.max(...rs.map(v=>v.stops.length))+' megállóig';root.append(count);
   const note=doc.createElement('small');
   note.textContent='BKK GTFS megállósorrend; a megállókat összekötő szaggatott vonal sematikus, nem pontos nyomvonal vagy élő jármű.';
   root.append(note);
   const windowPop=new Popup({closeButton:true,offset:14,className:'hh-bkk-popup-v912'});
   windowPop.setLngLat(coord).setDOMContent(root).addTo(m);
  }catch(_){}
 }
 function draw(key){
  const m=mapApi();if(!validMap(m)||!routes?.has(key)||m.isStyleLoaded&&!m.isStyleLoaded())return false;
  if(currentMap&&currentMap!==m){activeLayer.clear()}
  currentMap=m;
  const id=layerId(key),geo=features(key),mode=key.split(':')[0];
  const color={bus:'#148ee0',tram:'#e4ab00',trolley:'#d95078',metro:'#4f8ede',hev:'#28b381',other:'#a2bfd8'}[mode]||'#a2bfd8';
  try{
   if(!m.getSource(id+'-line'))m.addSource(id+'-line',{type:'geojson',data:geo.line});
   if(!m.getSource(id+'-stops'))m.addSource(id+'-stops',{type:'geojson',data:geo.stops});
   if(!m.getLayer(id+'-line')){
    m.addLayer({id:id+'-line',type:'line',source:id+'-line',
     layout:{visibility:'visible','line-cap':'round','line-join':'round'},
     paint:{'line-color':color,'line-opacity':.9,'line-width':3.2,'line-dasharray':[2,2]}});
    if(m.on){
     const fn=e=>{if(STORE[profile()].has(key))status(key+' · menetrendi vonal, nem élő jármű');};
     m.on('click',id+'-line',fn);
     boundClicks.set(key,{...(boundClicks.get(key)||{}),line:fn});
    }
   }
   if(!m.getLayer(id+'-stops')){
    m.addLayer({id:id+'-stops',type:'circle',source:id+'-stops',minzoom:12,
     layout:{visibility:'visible'},paint:{'circle-color':'#fff','circle-radius':4,
     'circle-stroke-color':color,'circle-stroke-width':2}});
    if(m.on){
     const fn=e=>{
      const f=e?.features?.[0],c=f?.geometry?.coordinates;
      if(STORE[profile()].has(key)&&Array.isArray(c))status(key+' · '+String(f?.properties?.stop||'megálló')+' · menetrendi megálló');
     };
     m.on('click',id+'-stops',fn);
     boundClicks.set(key,{...(boundClicks.get(key)||{}),stops:fn});
    }
   }
   for(const suf of ['-line','-stops'])m.setLayoutProperty(id+suf,'visibility',STORE[profile()].has(key)?'visible':'none');
   activeLayer.add(key);return true;
  }catch(_){status(key+' megállósorrend-térképe átmenetileg nem rajzolható');return false}
 }
 function refresh(){
  if(!routes)return;
  profiles=profile();
  for(const key of [...activeLayer]){
   if(!STORE[profiles].has(key))remove(key);
  }
  for(const key of STORE[profiles])draw(key);
 }
 async function setLineVisible(key,enabled){
  if(!KEY.test(key))return false;
  profiles=profile();
  if(!enabled){STORE[profiles].delete(key);remove(key);notify();return true}
  if(!STORE[profiles].has(key)&&STORE[profiles].size>=MAX_OPEN){
   status('Legfeljebb '+MAX_OPEN+' további sematikus járat mutatható egyszerre.');return false;
  }
  try{await load()}catch(e){status(e.message);return false}
  if(!routes.has(key)){status(key+' · nincs ellenőrizhető megállósorrend');return false}
  if(!validMap(mapApi())){status('A Family Guard térkép még betöltődik');return false}
  STORE[profiles].add(key);
  if(!draw(key)){STORE[profiles].delete(key);return false}
  notify();return true;
 }
 async function showLine(key){
  const ok=await setLineVisible(key,true);if(!ok)return false;
  const rs=routes.get(key),coords=rs.flatMap(v=>v.stops.map(s=>[s.lng,s.lat])),m=mapApi();
  const lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
  if(m?.fitBounds)try{m.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],
    {padding:{top:80,bottom:75,left:38,right:38},maxZoom:15.2,duration:650});}catch(_){}
  // Show the selected route on the map, without a large static data card.
  // Vehicle information opens only from an authenticated GTFS-RT vehicle marker.
  status(key+' · hivatalos BKK megállósorrend · sematikus összekötés (nem pontos útpálya)');
  return true;
 }
 if(w?.addEventListener){
  w.addEventListener('hh-bkk-watchlist-v814-changed',refresh);
  w.addEventListener('pagehide',()=>{for(const key of [...activeLayer])remove(key)});
 }
 return {parse,features,load,setLineVisible,showLine,isLineVisible:key=>KEY.test(key)&&STORE[profile()].has(key),
  hasMapRoute:key=>KEY.test(key)&&!!routes?.has(key),get loaded(){return !!routes},version:'912'};
});
