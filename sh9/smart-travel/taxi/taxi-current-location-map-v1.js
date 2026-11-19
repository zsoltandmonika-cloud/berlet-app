/* SHO Smart Taxi · Golden current-device GPS map v1.
 * Only the GPS of the phone/browser displaying this page is used.
 * No fixed 'home' fallback, other family member's GPS, persistent location,
 * tracking while backgrounded, or polling. The user can refresh on demand.
 * MapLibre/OpenFreeMap match the existing Smart Trip map stack.
 */
(function(w,d){
 'use strict';
 const section=d.getElementById('taxiCurrentMap');
 const canvas=d.getElementById('taxiCurrentMapCanvas');
 const message=d.getElementById('taxiCurrentMapStatus');
 const retry=d.getElementById('taxiCurrentMapRefresh');
 const centerBtn=d.getElementById('taxiCurrentMapCenter');
 if(!section||!canvas||!message||!retry||!centerBtn)return;
 const LIB_JS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
 const LIB_CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
 const MAP_STYLE='https://tiles.openfreemap.org/styles/bright';
 let map=null,marker=null,last=null,loadPromise=null,busy=false,locationCall=0;
 const valid=p=>!!p&&Number.isFinite(p.coords?.latitude)&&Number.isFinite(p.coords?.longitude)&&
  Math.abs(p.coords.latitude)<=90&&Math.abs(p.coords.longitude)<=180;
 function say(t,kind){
  message.textContent=t;
  section.dataset.state=kind||'ready';
 }
 function loadMapLibre(){
  if(w.maplibregl)return Promise.resolve();
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
   const css=d.createElement('link');
   css.rel='stylesheet';css.href=LIB_CSS;css.dataset.taxiMaplibre='v1';
   css.onerror=()=>reject(new Error('A térkép stílusa nem érhető el.'));
   d.head.append(css);
   const s=d.createElement('script');
   s.src=LIB_JS;s.async=true;s.dataset.taxiMaplibre='v1';
   s.onload=()=>w.maplibregl?resolve():reject(new Error('A térképmotor nem indult el.'));
   s.onerror=()=>reject(new Error('A térképmotor nem tölthető be.'));
   d.head.append(s);
  }).catch(err=>{loadPromise=null;throw err;});
  return loadPromise;
 }
 function drawPin(pos){
  if(!map)return;
  const lng=pos.coords.longitude,lat=pos.coords.latitude;
  if(!marker){
   const outer=d.createElement('div');outer.className='taxi-current-marker';
   outer.title='Az aktuális telefon GPS-helyzete';
   outer.setAttribute('aria-label','Az aktuális telefon GPS-helyzete');
   const pin=d.createElement('span');pin.className='taxi-current-pin';
   outer.append(pin);
   marker=new w.maplibregl.Marker({element:outer,anchor:'bottom'})
    .setLngLat([lng,lat]).addTo(map);
  }else marker.setLngLat([lng,lat]);
  map.jumpTo({center:[lng,lat],zoom:16,pitch:0,bearing:0});
  map.resize();
 }
 async function showPosition(pos){
  if(!valid(pos)){say('A telefon hibás GPS-adatot adott. Próbáld újra.','error');return;}
  last=pos;
  const acc=Number(pos.coords.accuracy);
  say('Saját telefon GPS'+(Number.isFinite(acc)&&acc>0?' · ±'+Math.round(acc)+' m':''),'ready');
  try{
   await loadMapLibre();
   if(!map){
    map=new w.maplibregl.Map({
     container:canvas,style:MAP_STYLE,
     center:[pos.coords.longitude,pos.coords.latitude],zoom:16,
     pitch:0,bearing:0,attributionControl:true,antialias:false
    });
    map.once('load',()=>{
     if(last)drawPin(last);
    });
    map.on('error',()=>{
     if(map&&!map.isStyleLoaded())say('A térképcsempék nem érhetők el. A GPS-adat megvan.','error');
    });
   }
   if(map&&map.loaded())drawPin(pos);
   w.requestAnimationFrame?.(()=>map?.resize());
  }catch(e){
   say('A térkép nem tölthető be. A GPS-adat megvan.','error');
  }
 }
 function locate(){
  if(busy)return;
  if(!w.isSecureContext||!w.navigator?.geolocation){
   say('A térképhez HTTPS és a telefon helymeghatározása szükséges.','error');
   return;
  }
  busy=true;retry.disabled=true;
  const ticket=++locationCall;
  say('📍 Telefon GPS-pozíciójának lekérése…','loading');
  w.navigator.geolocation.getCurrentPosition(
   pos=>{
    if(ticket!==locationCall)return;
    busy=false;retry.disabled=false;
    showPosition(pos);
   },
   e=>{
    if(ticket!==locationCall)return;
    busy=false;retry.disabled=false;
    const denied=e?.code===1;
    say(denied?'A GPS-engedély nincs megadva. Engedélyezd a helyhozzáférést, majd frissíts.':
       'Nem sikerült GPS-helyzetet kérni. Próbáld újra.','error');
   },
   {enableHighAccuracy:true,maximumAge:15000,timeout:14000}
  );
 }
 retry.addEventListener('click',locate);
 centerBtn.addEventListener('click',()=>{
  if(last&&map){drawPin(last);return;}
  locate();
 });
 d.addEventListener('visibilitychange',()=>{
  if(d.visibilityState==='visible'){
   w.requestAnimationFrame?.(()=>map?.resize());
   // Refresh only when the tab becomes visible, never track in the background.
   locate();
  }
 });
 w.addEventListener('resize',()=>w.requestAnimationFrame?.(()=>map?.resize()));
 // This module is explicitly a current-location map: request this device's GPS on entry.
 if(d.visibilityState!=='hidden')locate();
})(window,document);
