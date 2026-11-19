/* SHO Smart Taxi · route result preview v1 + Golden Standard TADÁÁ.
 * Fare remains calculated by the existing verified V7 service. This optional
 * display-only OSM route is requested separately AFTER a successful fare,
 * without touching tariffs, address selection or the Google Maps deep link.
 * Shares MapLibre/OpenFreeMap with the current-device location map.
 */
(function(w,d){'use strict';
const panel=d.getElementById('txRouteMapSection'),canvas=d.getElementById('txRouteMapCanvas');
const info=d.getElementById('txRouteMapStatus'),fare=d.getElementById('txCost');
if(!panel||!canvas||!info||!fare)return;
const MAP_LIB='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAP_CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const mapStyle=()=>w.SHO_TAXI_MAP_THEME_V1?.style?.()||'https://tiles.openfreemap.org/styles/dark';
let map=null,markers=[],pending=null,serial=0,context=null,lastCoords=null,drawnOnce=false;
const valid=x=>Array.isArray(x)&&x.length===2&&Number.isFinite(x[0])&&Number.isFinite(x[1])
 &&x[0]>=17&&x[0]<=21&&x[1]>=46&&x[1]<=49;
function setStatus(s,state){info.textContent=s;panel.dataset.state=state||'ready';}
function getLib(){
 if(w.maplibregl)return Promise.resolve();
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  let script=d.querySelector('script[data-taxi-maplibre],script[data-st22-maplibre],script[src="'+MAP_LIB+'"]');
  let timeout=0;
  const ok=()=>{
   clearTimeout(timeout);
   if(w.maplibregl)resolve();else reject(new Error('A térképmotor nem érhető el.'));
  };
  const bad=()=>{clearTimeout(timeout);reject(new Error('A térképmotor nem tölthető be.'));};
  if(script){script.addEventListener('load',ok,{once:true});script.addEventListener('error',bad,{once:true});}
  else{
   if(!d.querySelector('link[href="'+MAP_CSS+'"]')){
    const link=d.createElement('link');link.rel='stylesheet';link.href=MAP_CSS;d.head.append(link);
   }
   script=d.createElement('script');script.src=MAP_LIB;script.async=true;
   script.dataset.taxiRouteMaplibre='1';script.addEventListener('load',ok,{once:true});
   script.addEventListener('error',bad,{once:true});d.head.append(script);
  }
  timeout=setTimeout(()=>reject(new Error('A térképmotor betöltése megszakadt.')),11000);
 }).catch(e=>{pending=null;throw e;});
 return pending;
}
function clearMarkers(){for(const marker of markers)marker.remove();markers=[];}
function addMarker(coords,label,klass){
 const pin=d.createElement('div');pin.className='tx-route-pin tx-route-pin-'+klass;
 pin.textContent=label;pin.dataset.label=label;pin.title=klass==='origin'?'Indulás':'Érkezés';
 const marker=new w.maplibregl.Marker({element:pin,anchor:'bottom'})
  .setLngLat(coords).addTo(map);
 markers.push(marker);
}
function draw(coords,fit=true){
 if(!map)return;
 const geojson={type:'FeatureCollection',features:[{type:'Feature',properties:{},
  geometry:{type:'LineString',coordinates:coords}}]};
 const source=map.getSource('tx-route-line');
 if(source)source.setData(geojson);
 else{
  map.addSource('tx-route-line',{type:'geojson',data:geojson});
  map.addLayer({id:'tx-route-halo',type:'line',source:'tx-route-line',
   layout:{'line-join':'round','line-cap':'round'},
   paint:{'line-color':'#12244f','line-width':10,'line-opacity':.92}});
  map.addLayer({id:'tx-route-stroke',type:'line',source:'tx-route-line',
   layout:{'line-join':'round','line-cap':'round'},
   paint:{'line-color':'#04d2ef','line-width':5,'line-opacity':.96}});
 }
 clearMarkers();
 addMarker(coords[0],'A','origin');
 addMarker(coords[coords.length-1],'B','destination');
 const bounds=new w.maplibregl.LngLatBounds();
 for(const point of coords)bounds.extend(point);
 map.resize();
 if(fit)map.fitBounds(bounds,{padding:{top:35,right:32,bottom:44,left:32},maxZoom:16,duration:0});
}
async function render(coords,ticket){
 await getLib();
 if(ticket!==serial||panel.hidden)return;
 if(!map){
  map=new w.maplibregl.Map({
   container:canvas,style:mapStyle(),center:coords[0],zoom:11,
   pitch:0,bearing:0,attributionControl:true,antialias:false
  });
  map.on('style.load',()=>{
   // MapLibre drops custom GeoJSON layers on setStyle. Restore only the displayed
   // route, without recomputing the price or changing the user's map viewport.
   if(drawnOnce&&lastCoords&&!panel.hidden)draw(lastCoords,false);
  });
  await new Promise((resolve,reject)=>{
   map.once('load',resolve);
   map.on('error',e=>{
    if(!map.isStyleLoaded())reject(new Error('A térkép betöltése sikertelen.'));
   });
  });
 }
 if(ticket!==serial||panel.hidden)return;
 draw(coords);lastCoords=coords;drawnOnce=true;
 w.requestAnimationFrame?.(()=>map?.resize());
}
async function show(getRoute){
 const ticket=++serial;
 panel.hidden=false;
 setStatus('Útvonal kirajzolása…','loading');
 if(typeof getRoute!=='function'){setStatus('Az útvonal előnézete nem érhető el.','error');return;}
 try{
  const preview=await getRoute();
  if(ticket!==serial)return;
  const coords=preview?.route?.coordinates;
  if(preview?.route?.type!=='LineString'||!Array.isArray(coords)||coords.length<2||
    !coords.every(valid))throw new Error('Nem kaptunk használható közúti útvonalat.');
  setStatus('Tájékoztató útvonal · OpenStreetMap / OSRM','loading');
  await render(coords,ticket);
  if(ticket===serial)setStatus('Útvonal · OpenStreetMap (eltérhet a Google útvonalától)','ready');
 }catch(e){
  if(ticket===serial)setStatus('A térképes előnézet nem elérhető. A Google Maps link használható.','error');
 }
}
function cancel(){
 ++serial;panel.hidden=true;lastCoords=null;drawnOnce=false;
}
function unlock(){
 try{
  const Audio=w.AudioContext||w.webkitAudioContext;
  if(!Audio)return;
  context=context||new Audio();
  if(context.state==='suspended')context.resume().catch(()=>{});
 }catch(_){}
}
function tadaa(){
 if(!context||context.state!=='running')return;
 try{
  const now=context.currentTime;
  [659.25,830.61,1046.5].forEach((hz,i)=>{
   const start=now+i*.105,osc=context.createOscillator(),gain=context.createGain();
   osc.type='sine';osc.frequency.value=hz;
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.exponentialRampToValueAtTime(.075,start+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,start+.22);
   osc.connect(gain);gain.connect(context.destination);
   osc.start(start);osc.stop(start+.23);
  });
 }catch(_){}
}
// A theme change does not call the routing provider, change the price or move A/B.
w.SHO_TAXI_MAP_THEME_V1?.subscribe?.(()=>{
 if(map&&typeof map.setStyle==='function')map.setStyle(mapStyle());
});
// Unlock WebAudio during a direct tap: later async estimates may then play.
d.addEventListener('click',e=>{
 if(e.target?.closest?.('#txEstimate'))unlock();
},true);
w.addEventListener('resize',()=>{if(!panel.hidden)map?.resize();});
w.SHO_TAXI_RESULT_MAP_V1=Object.freeze({show,cancel,tadaa});
})(window,document);
