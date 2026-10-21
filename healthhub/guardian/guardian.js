/* HealthHub Family Guard v761: explicit foreground-only, memory-only GPS tracking. */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const neutral=[19.0402,47.4979]; // Generic Budapest map center, never a residence.
let map=null,marker=null,watchId=null,active=false,follow=true,threeD=true,path=[],distance=0,ready=false,last=null;
const status=$('guardianStatus'),dot=$('guardianLiveDot'),mapError=$('guardianMapMessage');
function name(){return w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt'}
function theme(){
 const monika=name()==='Mónika';
 d.documentElement.dataset.guardianProfile=monika?'m':'z';
 $('guardianProfile').textContent=name();
 const avatars=w.HH_GOLDEN_AVATARS_V529,avatar=$('guardianAvatar');
 if(avatars&&avatar)avatar.src=monika?avatars.m:avatars.z;
}
function report(s){status.textContent=s}
function message(s){mapError.textContent=s;mapError.hidden=!s}
function renderButtons(){
 $('guardianStart').disabled=active;
 $('guardianStop').disabled=!active;
 dot.classList.toggle('live',active);
 $('guardianFollow').setAttribute('aria-pressed',String(follow));
 $('guardian3D').setAttribute('aria-pressed',String(threeD));
}
function fmtLength(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2).replace('.',',')+' km'}
function radians(x){return x*Math.PI/180}
function metres(a,b){
 const dLat=radians(b[1]-a[1]),dLon=radians(b[0]-a[0]);
 const h=Math.sin(dLat/2)**2+Math.cos(radians(a[1]))*Math.cos(radians(b[1]))*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function pathJson(){return {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path.slice()}}]}}
function draw(){
 if(!map||!ready)return;
 const src=map.getSource('guardian-route');
 if(src)src.setData(pathJson());
}
function clear(){
 path=[];distance=0;last=null;
 $('guardianDistance').textContent='0 m';draw();
}
function stop(){
 const old=watchId;watchId=null;active=false;
 if(old!==null&&w.navigator.geolocation)w.navigator.geolocation.clearWatch(old);
 renderButtons();report('GPS kikapcsolva');
}
function onPosition(pos){
 if(!active)return;
 const c=pos.coords||{},lat=Number(c.latitude),lng=Number(c.longitude),accuracy=Number(c.accuracy);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
 const coord=[lng,lat];
 $('guardianAccuracy').textContent=Number.isFinite(accuracy)?Math.round(accuracy)+' m':'—';
 $('guardianUpdated').textContent=new Date(pos.timestamp||Date.now()).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
 if(map){
  if(!marker){
   const el=d.createElement('div');el.className='guardian-position';
   marker=new w.maplibregl.Marker({element:el}).setLngLat(coord).addTo(map);
  }else marker.setLngLat(coord);
  if(follow)map.easeTo({center:coord,zoom:Math.max(map.getZoom(),15),duration:850});
 }
 if(Number.isFinite(accuracy)&&accuracy>100){report('GPS aktív · pontatlan jel, nyomvonal szünetel');return}
 report('GPS aktív · élő pozíció');
 if(!last){path.push(coord);last=coord;draw();return}
 const delta=metres(last,coord);
 if(delta>=18&&delta<1000){
  distance+=delta;last=coord;path.push(coord);
  if(path.length>2000)path.shift();
  $('guardianDistance').textContent=fmtLength(distance);draw();
 }
}
function onGpsError(err){
 const text=err&&err.code===1?'Helyhozzáférés megtagadva. A telefon beállításaiban engedélyezheted.'
  :err&&err.code===2?'Nem érkezik GPS-jel. Próbáld meg szabadtéren.'
  :'A GPS-jel nem érkezett meg időben. Indítsd újra a követést.';
 stop();report(text);
}
function start(){
 if(active)return;
 if(!w.isSecureContext||!w.navigator.geolocation){report('Ehhez HTTPS és GPS-hozzáférés szükséges.');return}
 active=true;renderButtons();report('GPS-engedély kérése…');
 try{
  watchId=w.navigator.geolocation.watchPosition(onPosition,onGpsError,{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
 }catch(e){stop();report('A GPS nem indítható ezen a készüléken.')}
}
function toggle3D(){
 threeD=!threeD;renderButtons();
 if(map)map.easeTo({pitch:threeD?54:0,bearing:threeD?-17:0,duration:700});
}
function enableFollow(){
 follow=!follow;renderButtons();
 if(follow&&marker&&map)map.easeTo({center:marker.getLngLat(),duration:750});
}
function initMap(){
 if(!w.maplibregl){message('A térképmotor nem töltődött be. Ellenőrizd az internetkapcsolatot.');return}
 try{
  map=new w.maplibregl.Map({
   container:'guardianMap',style:'https://tiles.openfreemap.org/styles/dark',
   center:neutral,zoom:13.6,pitch:54,bearing:-17,antialias:true,attributionControl:true
  });
  map.addControl(new w.maplibregl.NavigationControl({showCompass:true}),'bottom-right');
  map.on('load',function(){
   ready=true;message('');
   /* Real 3D building extrusion, with a separate public OSM vector source. */
   try{
    map.addSource('guardian-building-tiles',{type:'vector',url:'https://tiles.openfreemap.org/planet'});
    const layers=map.getStyle().layers||[];
    const firstLabel=layers.find(l=>l.type==='symbol'&&l.layout&&l.layout['text-field']);
    map.addLayer({
     id:'guardian-buildings-3d',type:'fill-extrusion',source:'guardian-building-tiles',
     'source-layer':'building',minzoom:14,
     filter:['!=',['get','hide_3d'],true],
     paint:{
      'fill-extrusion-color':name()==='Mónika'?'#bb76ad':'#4583c4',
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,16,['coalesce',['get','render_height'],0]],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
      'fill-extrusion-opacity':0.82
     }
    },firstLabel&&firstLabel.id);
   }catch(e){w.console&&w.console.warn('Guardian 3D buildings fallback',e)}
   map.addSource('guardian-route',{type:'geojson',data:pathJson()});
   map.addLayer({id:'guardian-route-line',type:'line',source:'guardian-route',paint:{
    'line-color':name()==='Mónika'?'#ffabd9':'#79c5ff','line-width':5,'line-opacity':0.95
   }});
  });
  map.on('error',function(e){if(!ready)message('Nem sikerült letölteni a térképet. GPS engedély nélkül is próbálkozhatsz később.')});
  map.on('dragstart',function(){follow=false;renderButtons()});
 }catch(e){message('A térkép megjelenítése nem támogatott ezen az eszközön.')}
}
$('guardianStart').addEventListener('click',start);
$('guardianStop').addEventListener('click',stop);
$('guardianClear').addEventListener('click',clear);
$('guardianFollow').addEventListener('click',enableFollow);
$('guardian3D').addEventListener('click',toggle3D);
d.addEventListener('visibilitychange',function(){if(d.hidden&&active){stop();report('Háttérbe került a lap: GPS leállítva.')}});
w.addEventListener('pagehide',stop);
w.addEventListener('storage',function(e){if(e.key==='hh-profile'){
 stop();clear();if(marker){marker.remove();marker=null}theme();
 if(map&&ready){
  if(map.getLayer('guardian-route-line'))map.setPaintProperty('guardian-route-line','line-color',name()==='Mónika'?'#ffabd9':'#79c5ff');
  if(map.getLayer('guardian-buildings-3d'))map.setPaintProperty('guardian-buildings-3d','fill-extrusion-color',name()==='Mónika'?'#bb76ad':'#4583c4');
 }
}});
theme();renderButtons();initMap();
w.HH_GUARDIAN_V761=Object.freeze({version:'761',get active(){return active},get pointCount(){return path.length}});
})(window,document);
