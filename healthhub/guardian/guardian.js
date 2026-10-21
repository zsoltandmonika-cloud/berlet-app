/* HealthHub Family Guard v761: explicit foreground-only, memory-only GPS tracking. */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const neutral=[19.0467,47.5060]; // Budapest city-center discovery view, NOT a family or device coordinate.
let map=null,marker=null,watchId=null,active=false,hasFix=false,follow=true,threeD=true,path=[],distance=0,ready=false,last=null;
const status=$('guardianStatus'),dot=$('guardianLiveDot'),mapError=$('guardianMapMessage');
function name(){return w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt'}
function theme(){
 const monika=name()==='Mónika';
 d.documentElement.dataset.guardianProfile=monika?'m':'z';
 $('guardianProfile').textContent=name();
 const avatars=w.HH_GOLDEN_AVATARS_V529,avatar=$('guardianAvatar');
 if(avatars&&avatar)avatar.src=monika?avatars.m:avatars.z;
 const mine=$('guardianMePhoto'),other=$('guardianOtherPhoto');
 if(avatars){
  if(mine)mine.src=monika?avatars.m:avatars.z;
  if(other)other.src=monika?avatars.z:avatars.m;
 }
 $('guardianMeName').textContent=name()+' · saját telefon';
 $('guardianOtherName').textContent=monika?'Zsolt':'Mónika';
 if(marker&&marker.getElement){
  const img=marker.getElement().querySelector('img');
  if(img&&avatars)img.src=monika?avatars.m:avatars.z;
 }

}
function report(s){
 status.textContent=s;
 const own=$('guardianMeState'),card=$('guardianMeCard');
 if(own)own.textContent=hasFix&&active?'Élő GPS · ezen a telefonon':active?'GPS-jelre vár':'GPS kikapcsolva / utolsó ismert';
 if(card)card.classList.toggle('live',active&&hasFix);
}
function message(s){mapError.textContent=s;mapError.hidden=!s}
function renderButtons(){
 $('guardianStart').disabled=active;
 $('guardianStop').disabled=!active;
 dot.classList.toggle('live',active&&hasFix);
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
 const old=watchId;watchId=null;active=false;hasFix=false;
 if(old!==null&&w.navigator.geolocation)w.navigator.geolocation.clearWatch(old);
 renderButtons();report('GPS kikapcsolva');
 $('guardianMapLabel').textContent=marker?'UTOLSÓ MÉRT HELY · NEM ÉLŐ':(threeD?'3D':'SÍK')+' BUDAPEST · FELFEDEZŐ NÉZET';
}
function onPosition(pos){
 if(!active)return;
 const c=pos.coords||{},lat=Number(c.latitude),lng=Number(c.longitude),accuracy=Number(c.accuracy);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
 const coord=[lng,lat];
 hasFix=true;renderButtons();
 $('guardianMapLabel').textContent='SAJÁT GPS · '+name().toLocaleUpperCase('hu-HU');
 $('guardianAccuracy').textContent=Number.isFinite(accuracy)?Math.round(accuracy)+' m':'—';
 $('guardianUpdated').textContent=new Date(pos.timestamp||Date.now()).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
 if(map){
  if(!marker){
   const el=d.createElement('div');el.className='guardian-position';
   const avatars=w.HH_GOLDEN_AVATARS_V529;
   if(avatars){
    const img=d.createElement('img');img.alt='';img.src=name()==='Mónika'?avatars.m:avatars.z;el.appendChild(img);
   }
   marker=new w.maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(coord).addTo(map);
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
 active=true;hasFix=false;renderButtons();report('GPS-engedély kérése…');
 try{
  watchId=w.navigator.geolocation.watchPosition(onPosition,onGpsError,{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
 }catch(e){stop();report('A GPS nem indítható ezen a készüléken.')}
}
function toggle3D(){
 threeD=!threeD;renderButtons();
 if(!active&&!marker)$('guardianMapLabel').textContent=(threeD?'3D':'SÍK')+' BUDAPEST · FELFEDEZŐ NÉZET';
 if(map){
  map.easeTo({pitch:threeD?58:0,bearing:threeD?-21:0,duration:650});
  if(ready&&map.getLayer('guardian-buildings-3d'))map.setLayoutProperty('guardian-buildings-3d','visibility',threeD?'visible':'none');
 }
}
function enableFollow(){
 if(!marker&&!active){report('A saját helyzet követéséhez először indítsd el a GPS-t.');return}
 follow=!follow;renderButtons();
 if(follow&&marker&&map)map.easeTo({center:marker.getLngLat(),zoom:Math.max(map.getZoom(),15.3),duration:750});
}
function toggleFamily(){
 const panel=$('guardianFamilyPanel'),button=$('guardianFamilyButton');
 if(!panel||!button)return;
 panel.hidden=!panel.hidden;
 button.setAttribute('aria-expanded',String(!panel.hidden));
}
function mapColors(){
 const rose=name()==='Mónika';
 return {
  Background:rose?'#211e37':'#101f37',
  Residential:rose?'#302640':'#1a2c44',
  Water:rose?'#43335e':'#153d64',
  River:rose?'#654576':'#23608d',
  'Road network':rose?'#8a668f':'#527ba2',
  Grass:rose?'#273343':'#153b40',
  Wood:rose?'#233441':'#153939',
  'Road labels':rose?'#ffe1ed':'#d7ecff'
 };
}
function applyGoldenMapStyle(){
 if(!map||!ready)return;
 const colors=mapColors();
 const types={'Background':['background-color','background'],'Residential':['fill-color','fill'],
  'Water':['fill-color','fill'],'River':['line-color','line'],'Road network':['line-color','line'],
  Grass:['fill-color','fill'],Wood:['fill-color','fill'],'Road labels':['text-color','symbol']};
 Object.keys(types).forEach(function(id){
  const layer=map.getLayer(id);
  if(layer&&layer.type===types[id][1]){
   try{map.setPaintProperty(id,types[id][0],colors[id])}catch(e){}
  }
 });
 if(map.getLayer('guardian-buildings-3d')){
  const rose=name()==='Mónika';
  map.setPaintProperty('guardian-buildings-3d','fill-extrusion-color',
   ['interpolate',['linear'],['coalesce',['get','render_height'],0],
    0,rose?'#4b366c':'#234c77',55,rose?'#b56ab5':'#4d9cdb',180,rose?'#ffd0ee':'#bceeff']);
 }
 if(map.getLayer('guardian-route-glow'))map.setPaintProperty('guardian-route-glow','line-color',
  name()==='Mónika'?'#fc76c3':'#5cc7ff');
 if(map.getLayer('guardian-route-line'))map.setPaintProperty('guardian-route-line','line-color',
  name()==='Mónika'?'#ffabd9':'#79c5ff');
}
function initMap(){
 if(!w.maplibregl){message('A térképmotor nem töltődött be. Ellenőrizd az internetkapcsolatot.');return}
 try{
  map=new w.maplibregl.Map({
   container:'guardianMap',style:'https://tiles.openfreemap.org/styles/dark',
   center:neutral,zoom:15.3,pitch:58,bearing:-21,antialias:true,attributionControl:true
  });
  map.addControl(new w.maplibregl.NavigationControl({showCompass:true}),'bottom-right');
  map.on('load',function(){
   ready=true;message('');
   try{if(typeof map.setLight==='function')map.setLight({anchor:'viewport',color:'#bcdcff',intensity:0.43,position:[1.25,207,32]})}catch(e){}
   /* Real 3D building extrusion, with a separate public OSM vector source. */
   try{
    map.addSource('guardian-building-tiles',{type:'vector',url:'https://tiles.openfreemap.org/planet'});
    const layers=map.getStyle().layers||[];
    const firstLabel=layers.find(l=>l.type==='symbol'&&l.layout&&l.layout['text-field']);
    map.addLayer({
     id:'guardian-buildings-3d',type:'fill-extrusion',source:'guardian-building-tiles',
     'source-layer':'building',minzoom:14,layout:{visibility:threeD?'visible':'none'},
     filter:['!=',['get','hide_3d'],true],
     paint:{
      'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],0],0,name()==='Mónika'?'#4b366c':'#234c77',55,name()==='Mónika'?'#b56ab5':'#4d9cdb',180,name()==='Mónika'?'#ffd0ee':'#bceeff'],
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,16,['coalesce',['get','render_height'],0]],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
      'fill-extrusion-opacity':0.82
     }
    },firstLabel&&firstLabel.id);
   }catch(e){w.console&&w.console.warn('Guardian 3D buildings fallback',e)}
   map.addSource('guardian-route',{type:'geojson',data:pathJson()});
   map.addLayer({id:'guardian-route-glow',type:'line',source:'guardian-route',paint:{
    'line-color':name()==='Mónika'?'#fc76c3':'#5cc7ff','line-width':12,'line-opacity':0.22,'line-blur':5
   }});
   map.addLayer({id:'guardian-route-line',type:'line',source:'guardian-route',paint:{
    'line-color':name()==='Mónika'?'#ffabd9':'#79c5ff','line-width':5,'line-opacity':0.95
   }});
   applyGoldenMapStyle();
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
$('guardianFamilyButton').addEventListener('click',toggleFamily);
d.addEventListener('visibilitychange',function(){if(d.hidden&&active){stop();report('Háttérbe került a lap: GPS leállítva.')}});
w.addEventListener('pagehide',stop);
w.addEventListener('storage',function(e){if(e.key==='hh-profile'){
 stop();clear();if(marker){marker.remove();marker=null}hasFix=false;theme();$('guardianMapLabel').textContent='3D BUDAPEST · FELFEDEZŐ NÉZET';
 if(map&&ready)applyGoldenMapStyle();
}});
theme();renderButtons();initMap();
w.HH_GUARDIAN_V761=Object.freeze({version:'761',get active(){return active},get pointCount(){return path.length}});
})(window,document);
