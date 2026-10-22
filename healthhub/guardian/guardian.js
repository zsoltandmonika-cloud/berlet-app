/* HealthHub Family Guard v780: premium daylight controls; foreground-only, memory-only GPS. */
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
 // The decorative Hero monitor always uses the two verified original HH avatars.
 if(avatars){
  const hz=$('guardianHeroZsolt'),hm=$('guardianHeroMonika');
  if(hz)hz.src=avatars.z;
  if(hm)hm.src=avatars.m;
 }
 const switcher=$('guardianProfileSwitch');
 if(switcher){
  switcher.textContent=name()+' ⇄';
  const next=monika?'Zsolt':'Mónika';
  switcher.title='Profilváltás: '+next;
  switcher.setAttribute('aria-label','Egyérintéses profilváltás '+next+' profiljára');
 }
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
 $('guardianFollow').setAttribute('aria-label',!active?'Saját GPS indítása és automatikus követése':follow?'Automatikus térképkövetés kikapcsolása':'Automatikus térképkövetés bekapcsolása');
 $('guardian3D').setAttribute('aria-pressed',String(threeD));
}
function fmtLength(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(2).replace('.',',')+' km'}
function radians(x){return x*Math.PI/180}
function metres(a,b){
 const dLat=radians(b[1]-a[1]),dLon=radians(b[0]-a[0]);
 const h=Math.sin(dLat/2)**2+Math.cos(radians(a[1]))*Math.cos(radians(b[1]))*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function pathJson(){return {type:'FeatureCollection',features:path.length<2?[]:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path.slice()}}]}}
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
function applyView(){
 renderButtons();
 if(!active&&!marker)$('guardianMapLabel').textContent=(threeD?'3D':'SÍK')+' BUDAPEST · FELFEDEZŐ NÉZET';
 if(!map||!ready)return;
 if(map.getLayer('guardian-buildings-3d'))map.setLayoutProperty('guardian-buildings-3d','visibility',threeD?'visible':'none');
 map.easeTo({pitch:threeD?58:0,bearing:threeD?-21:0,duration:620});
}
function toggle3D(){
 threeD=!threeD;
 applyView();
}
function enableFollow(){
 // A deliberate tap on Follow also starts this device's GPS if currently stopped.
 // Permission is still requested by the browser; never start location on page load.
 if(!active){follow=true;renderButtons();start();return}
 follow=!follow;renderButtons();
 if(follow&&marker&&map)map.easeTo({center:marker.getLngLat(),zoom:Math.max(map.getZoom(),15.3),duration:750});
}
function toggleFamily(){
 const panel=$('guardianFamilyPanel'),button=$('guardianFamilyButton');
 if(!panel||!button)return;
 panel.hidden=!panel.hidden;
 button.setAttribute('aria-expanded',String(!panel.hidden));
}
function tapSound(){
 // Match the HH One canonical 900 Hz / 40 ms profile tap, never auto-play.
 try{
  if(w.localStorage&&w.localStorage.getItem('hh-nutrition-PREVIEW-sound')==='off')return;
  const Audio=w.AudioContext||w.webkitAudioContext;
  if(Audio){
   const audio=new Audio(),now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
   osc.type='sine';osc.frequency.value=900;
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(.012,now+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,now+.075);
   osc.connect(gain);gain.connect(audio.destination);
   osc.start(now);osc.stop(now+.085);
   osc.onended=()=>audio.close().catch(()=>{});
  }
 }catch(_){}
 try{if(w.navigator&&typeof w.navigator.vibrate==='function')w.navigator.vibrate(9)}catch(_){}
}
function switchProfile(){
 const current=name()==='Mónika'?'m':'z',next=current==='m'?'z':'m';
 // A previous owner's route and GPS marker must never be relabelled.
 stop();clear();
 if(marker){marker.remove();marker=null}
 follow=true;hasFix=false;
 try{w.localStorage.setItem('hh-profile',next)}catch(e){report('A profilváltás most nem menthető el.');return}
 tapSound();theme();renderButtons();applyGoldenMapStyle();
 $('guardianMapLabel').textContent=(threeD?'3D':'SÍK')+' BUDAPEST · FELFEDEZŐ NÉZET';
 if(map)map.easeTo({center:neutral,zoom:15.3,duration:650});
 report('GPS kikapcsolva · '+name()+' profil');
}
/* Family Guard v773: real daylight vector map, no static image replacing GPS. */
/* v781: one cartographic palette for both flat (2D) and extruded (3D) maps.
   The view toggle changes only camera geometry and extrusion visibility.
   Gender/profile affects only the route accent, not street or landscape colors. */
function mapColors(){
 const rose=name()==='Mónika';
 return {
  background:'#f1f0ed',
  water:'#9fc4f1',
  river:'#8db8eb',
  parks:'#cfe4b5',
  woods:'#bbd9a7',
  residential:'#ece9e3',
  roadLocal:'#fffdf8',
  roadSecondary:'#ffecc8',
  roadPrimary:'#f8d987',
  roadCasing:'#d0cbc0',
  rail:'#a4aeb9',
  buildingFootprint:'#bfc1c3',
  label:'#34485f',
  labelHalo:'#fffdf8',
  roofLow:'#c9cbcd',
  roofMid:'#b5b8bb',
  roofHigh:'#9fa4a9',
  track:rose?'#e63198':'#168bc9',
  glow:rose?'#ff7eca':'#64caff'
 };
}
function applyGoldenMapStyle(){
 if(!map||!ready)return;
 const colors=mapColors();
 const layers=(map.getStyle()&&map.getStyle().layers)||[];
 const paint=(id,key,value)=>{try{map.setPaintProperty(id,key,value)}catch(_){/* optional style layer */}};
 layers.forEach(function(layer){
  const id=(layer.id||'').toLowerCase();
  if(layer.type==='background')paint(layer.id,'background-color',colors.background);
  if(layer.type==='fill'){
   if(/water|lake|river/.test(id))paint(layer.id,'fill-color',colors.water);
   else if(/park|grass|garden|green/.test(id))paint(layer.id,'fill-color',colors.parks);
   else if(/wood|forest/.test(id))paint(layer.id,'fill-color',colors.woods);
   else if(/building/.test(id))paint(layer.id,'fill-color',colors.buildingFootprint);
   else if(/residential/.test(id))paint(layer.id,'fill-color',colors.residential);
  }
  if(layer.type==='line'){
   if(/waterway|river|stream|canal/.test(id))paint(layer.id,'line-color',colors.river);
   else if(/rail|tram|subway/.test(id))paint(layer.id,'line-color',colors.rail);
   else if(/road|street|highway|transportation/.test(id)){
    // OpenMapTiles transportation.class allows per-street coloring even where
    // Bright renders multiple classes in one layer; IDs provide a fallback.
    const casing=/casing|outline|border/.test(id);
    const arterial=/motorway|trunk|primary|major|expressway|highway/.test(id);
    const secondary=/secondary|tertiary|collector|medium/.test(id);
    const base=arterial?colors.roadPrimary:secondary?colors.roadSecondary:colors.roadLocal;
    const byClass=['match',['coalesce',['get','class'],''],
     ['motorway','trunk','primary'],colors.roadPrimary,
     ['secondary','tertiary'],colors.roadSecondary,
     ['minor','residential','service','living_street','unclassified'],colors.roadLocal,
     base];
    paint(layer.id,'line-color',casing?colors.roadCasing:byClass);
   }
  }
  if(layer.type==='symbol'&&layer.layout&&layer.layout['text-field']&&/road|street|highway|transportation/.test(id)){
   paint(layer.id,'text-color',colors.label);
   paint(layer.id,'text-halo-color',colors.labelHalo);
   paint(layer.id,'text-halo-width',1.3);
  }
 });
 if(map.getLayer('guardian-buildings-3d')){
  paint('guardian-buildings-3d','fill-extrusion-color',
   ['interpolate',['linear'],['coalesce',['get','render_height'],['get','height'],0],
    0,colors.roofLow,55,colors.roofMid,180,colors.roofHigh]);
 }
 if(map.getLayer('guardian-route-glow'))paint('guardian-route-glow','line-color',colors.glow);
 if(map.getLayer('guardian-route-line'))paint('guardian-route-line','line-color',colors.track);
}

function initMap(){
 if(!w.maplibregl){message('A térképmotor nem töltődött be. Ellenőrizd az internetkapcsolatot.');return}
 try{
  map=new w.maplibregl.Map({
   container:'guardianMap',style:'https://tiles.openfreemap.org/styles/bright',
   center:neutral,zoom:15.3,pitch:58,bearing:-21,antialias:true,attributionControl:false
  });
  map.addControl(new w.maplibregl.NavigationControl({showCompass:true}),'bottom-right');
  map.on('load',function(){
   ready=true;message('');
   // Mandatory map-data credits appear in the visible row immediately below the map.
   // Do not add MapLibre's small ⓘ overlay under zoom controls.
   try{if(typeof map.setLight==='function')map.setLight({anchor:'viewport',color:'#fff1d9',intensity:0.67,position:[1.2,210,45]})}catch(e){}
   /* Reuse the light style's own OSM building vector source when possible.
    * Loading a duplicate vector source wastes mobile bandwidth and memory.
    * A fallback TileJSON source is used only if the basemap lacks buildings. */
   try{
    const layers=map.getStyle().layers||[];
    const existing=layers.find(l=>l['source-layer']==='building'&&l.source&&map.getSource(l.source));
    const source=existing?existing.source:'guardian-building-tiles';
    if(!existing)map.addSource(source,{type:'vector',url:'https://tiles.openfreemap.org/planet'});
    const firstLabel=layers.find(l=>l.type==='symbol'&&l.layout&&l.layout['text-field']);
    map.addLayer({
     id:'guardian-buildings-3d',type:'fill-extrusion',source,
     'source-layer':'building',minzoom:14,layout:{visibility:threeD?'visible':'none'},
     filter:['!=',['get','hide_3d'],true],
     paint:{
      'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],['get','height'],0],0,'#c9cbcd',55,'#b5b8bb',180,'#9fa4a9'],
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,16,['coalesce',['get','render_height'],['get','height'],0]],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
      'fill-extrusion-opacity':0.88
     }
    },firstLabel&&firstLabel.id);
   }catch(e){w.console&&w.console.warn('Guardian 3D buildings fallback',e)}
   map.addSource('guardian-route',{type:'geojson',data:pathJson()});
   map.addLayer({id:'guardian-route-glow',type:'line',source:'guardian-route',paint:{
    'line-color':name()==='Mónika'?'#fc76c3':'#5cc7ff','line-width':13,'line-opacity':0.22,'line-blur':5
   }});
   map.addLayer({id:'guardian-route-casing',type:'line',source:'guardian-route',paint:{
    'line-color':'#ffffff','line-width':8,'line-opacity':0.86
   }});
   map.addLayer({id:'guardian-route-line',type:'line',source:'guardian-route',paint:{
    'line-color':name()==='Mónika'?'#ffabd9':'#79c5ff','line-width':5.5,'line-opacity':0.95
   }});
   applyGoldenMapStyle();
   applyView();
   // v776 optional, privacy-local bookmarks: map engine remains the same.
   if(w.HH_GUARDIAN_LANDMARKS_V776)w.HH_GUARDIAN_LANDMARKS_V776.init(map);
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
$('guardianProfileSwitch').addEventListener('click',switchProfile);
if(typeof d.querySelectorAll==='function'){
 const toast=$('guardianNavToast');
 let toastTimeout=null;
 d.querySelectorAll('[data-guardian-nav-info]').forEach(function(button){
  button.addEventListener('click',function(){
   toast.textContent=button.getAttribute('data-guardian-nav-info');
   toast.hidden=false;
   if(toastTimeout)w.clearTimeout(toastTimeout);
   toastTimeout=w.setTimeout(function(){toast.hidden=true},2600);
  });
 });
}
const nativeButton=$('guardianNativeGps');
if(nativeButton&&/Android/i.test(w.navigator.userAgent||'')){
 nativeButton.hidden=false;
 nativeButton.addEventListener('click',function(){
  // Only opens native permission controls; never turns GPS on without consent.
  w.location.href='healthhubconnect://guardian';
 });
}
d.addEventListener('visibilitychange',function(){if(d.hidden&&active){stop();report('Háttérbe került a lap: GPS leállítva.')}});
w.addEventListener('pagehide',stop);
w.addEventListener('storage',function(e){if(e.key==='hh-profile'){
 stop();clear();if(marker){marker.remove();marker=null}hasFix=false;theme();$('guardianMapLabel').textContent='3D BUDAPEST · FELFEDEZŐ NÉZET';
 if(map&&ready)applyGoldenMapStyle();
}});
theme();renderButtons();initMap();
w.HH_GUARDIAN_V761=Object.freeze({version:'761',get active(){return active},get pointCount(){return path.length}});
})(window,document);
