/* Smart Arrival v799: original Family Guard URL includes live BKK by default.
 * Uses the authenticated Family Live session and verified BKK server snapshots.
 * The v794 route selectors, Buddy, and private GPS remain unchanged.
 */
(function(w,d){
'use strict';
if(new URLSearchParams(w.location.search).get('hhLivePilot')==='off')return;
const sh9AllMode=new URLSearchParams(w.location.search).get('sh9Transit')==='1';
const validator=w.HH_BKK_LIVE_V793;
const renderer=w.HH_BKK_LIVE_MAP_V793;
const mapApi=w.HH_GUARDIAN_V761;
const auth=w.HH_GUARDIAN_LIVE_V785;
const cfg=w.HH_CENTRAL_VAULT;
const holder=d.getElementById('hhTransitPanel');
if(!holder)return;
const p=d.createElement('p');
p.id='hhBkkLiveStatusV793';
p.setAttribute('role','status');
p.setAttribute('aria-live','polite');
p.style.cssText='font:700 14px/1.45 system-ui;color:#f1fbff;padding:12px 14px;margin:0 0 12px;border:1px solid #78c5f6;border-radius:12px;background:#114879;box-shadow:0 5px 18px #001b3655;';
p.textContent='🚍 BKK élő helyzet · Kapcsolat ellenőrzése…';
const bar=d.createElement('div');
bar.id='hhBkkLiveBarV796';
bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;padding:9px 10px;border:1px solid #78c5f6;border-radius:12px;background:#114879;';
p.style.cssText='flex:1 1 175px;font:700 13px/1.45 system-ui;color:#f1fbff;margin:0;padding:0;box-shadow:none;border:0;background:none;';
const focusButton=d.createElement('button');
focusButton.type='button';
focusButton.id='hhBkkFocusV796';
focusButton.hidden=true;
focusButton.textContent='Élő jármű mutatása ↗';
focusButton.style.cssText='min-height:44px;padding:8px 12px;border-radius:10px;border:1px solid #8ceaff;background:#1a81bd;color:white;font:750 13px system-ui;cursor:pointer;';
bar.append(p,focusButton);
holder.prepend(bar);
if(!validator||!renderer||!mapApi||!auth||!cfg||!cfg.supabaseUrl){
 p.textContent='⚠️ BKK élő helyzet · A szükséges modul még nem töltődött be. Frissítsd a lapot.';
 return;
}
let polling=null;
let inFlight=false;
let lastVehicles=[];
let lastVerified=null;
let lastSourceSnapshot=null; // validated, UNFILTERED BKK response; redraw never refetches
// Live map visibility is a presentation toggle, not a change to BKK polling.
let liveVisible=true;
function updateLiveButton(){
 if(sh9AllMode){focusButton.hidden=true;return;}
 focusButton.hidden=!lastVehicles.length;
 focusButton.textContent=liveVisible?'Ne mutasd élő járműveket':'Mutasd élő járműveket';
 focusButton.setAttribute('aria-pressed',String(liveVisible));
 focusButton.setAttribute('aria-label',focusButton.textContent);
}
// The editable BKK Watchlist is the visible source of truth. Legacy transit
// selections live in another browser storage key; after HH One WebView/Edge
// changes they can disagree and incorrectly hide valid live vehicle positions.
function favoriteKeys(){
 const catalog=w.HH_BKK_CATALOG_V801;
 if(catalog&&Array.isArray(catalog.favoriteIds))return catalog.favoriteIds.slice(0,150);
 return (w.HH_GUARDIAN_TRANSIT_V790?.selected||[]).filter(id=>['260','17','19'].includes(id))
  .map(id=>id==='260'?'bus:260':'tram:'+id);
}
function watchedLines(){
 const catalog=w.HH_BKK_CATALOG_V801;
 const profile=catalog&&catalog.activeProfile==='monika'?'monika':'zsolt';
 const filter=w.HH_BKK_LIVE_PER_LINE_V909;
 return favoriteKeys().filter(key=>!filter||filter.enabled(key,profile));
}
function routeKeyForVehicle(v){
 if(typeof v.routeKey==='string')return v.routeKey;
 return v.routeId==='260'?'bus:260':['17','19','1','41'].includes(v.routeId)?'tram:'+v.routeId:null;
}
function toggleLive(){
 if(!lastVehicles.length||!mapApi.map||!lastVerified)return;
 if(liveVisible){
  liveVisible=false;renderer.clear(mapApi.map);updateLiveButton();return;
 }
 if(!renderer.render(mapApi.map,lastVerified)){
  status('az élő járműréteg még nem áll készen');return;
 }
 liveVisible=true;updateLiveButton();
 renderer.focus(mapApi.map,lastVehicles);
 const mapElement=d.getElementById('guardianMap');
 if(mapElement&&mapElement.scrollIntoView)mapElement.scrollIntoView({behavior:'smooth',block:'center'});
}
focusButton.addEventListener('click',toggleLive);
function status(message){p.textContent='🚍 BKK élő helyzet · '+message}
function clear(){
 lastVehicles=[];lastVerified=null;lastSourceSnapshot=null;
 updateLiveButton();
 if(sh9AllMode){
  if(typeof w.CustomEvent==='function')w.dispatchEvent(new w.CustomEvent('hh-sh9-all-live-clear-v928'));
  return;
 }
 if(mapApi.map)renderer.clear(mapApi.map);
}
// Per-line button changes redraw the ALREADY VERIFIED response, not a new API request.
function renderLiveFromSnapshot(parsed){
 const wanted=new Set(watchedLines());
 const active={...parsed,vehicles:parsed.vehicles.filter(v=>wanted.has(routeKeyForVehicle(v)))};
 if(liveVisible&&!renderer.render(mapApi.map,active)){
  lastVehicles=[];lastVerified=null;updateLiveButton();
  status('a térképréteg betöltésére várunk');return;
 }
 if(!liveVisible&&mapApi.map)renderer.clear(mapApi.map);
 lastVehicles=active.vehicles;
 lastVerified=active;
 updateLiveButton();
 if(!wanted.size){
  status('Nincs kijelölt, élő járműveket mutató kedvenc járat.');
 }else if(!active.vehicles.length){
  status([...wanted].join(', ')+' · nincs friss, ellenőrzött járműpozíció. Az adatkapcsolat működik, de nem rajzolunk kitalált buszokat.');
 }else{
  status(active.vehicles.length+' friss, ellenőrzött jármű · '+new Date(parsed.generatedAt).toLocaleTimeString('hu-HU'));
 }
}
async function poll(){
 if(inFlight||d.hidden)return;
 inFlight=true;
 try{
  const client=auth.getClient&&auth.getClient();
  if(!client){status('a HealthHub bejelentkezés nem érhető el');clear();return}
  const {data:{session}}=await client.auth.getSession();
  if(!session||!session.access_token){
   status('Nincs aktív belépés. Jelentkezz be a Family Live részben az Edge-ben; a HH One belső böngészője külön munkamenet.');
   clear();return
  }
  const url=cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/hh-bkk-live-v793-preview?'+
   (sh9AllMode?'all=1':'routes='+encodeURIComponent(favoriteKeys().join(',')));
  const res=await w.fetch(url,{method:'GET',cache:'no-store',headers:{
   'Authorization':'Bearer '+session.access_token,'apikey':cfg.publishableKey,'Accept':'application/json'
  }});
  const data=await res.json().catch(()=>null);
  if(!res.ok){clear();status(res.status===503?'BKK-adat jelenleg nem elérhető':res.status===401?'Bejelentkezés szükséges':'Kapcsolati hiba ('+res.status+')');return}
  const parsed=sh9AllMode?validator.validate(data,Date.now(),3500):validator.validate(data);
  if(!parsed.ok){clear();status('az élő adat elavult vagy nem ellenőrizhető');return}
  if(sh9AllMode){
   // A dedicated clustered MapLibre source draws every verified BKK vehicle
   // using the SAME authenticated snapshot. Never change normal Watchlist markers.
   lastSourceSnapshot=parsed;
   if(!d.hidden&&typeof w.CustomEvent==='function')
    w.dispatchEvent(new w.CustomEvent('hh-sh9-all-live-v928',{
     detail:{generatedAt:parsed.generatedAt,vehicles:parsed.vehicles,truncated:data.truncated===true}
    }));
   status(parsed.vehicles.length+' hiteles, friss jármű · SH9 teljes térképréteg'+
    (data.truncated===true?' · korlátozott adatcsomag':'')+' · '+
    new Date(parsed.generatedAt).toLocaleTimeString('hu-HU'));
   return;
  }
  // Keep the verified BKK vehicle stream separate from profile GPS.
  // Buddy only sees validated snapshots already obtained via the
  // authenticated Family Live request. No additional network or location sharing.
  if(!d.hidden&&typeof w.CustomEvent==='function'){
   w.dispatchEvent(new w.CustomEvent('hh-bkk-live-verified-v815',{
    detail:{vehicles:parsed.vehicles,generatedAt:parsed.generatedAt}
   }));
  }
  lastSourceSnapshot=parsed;
  renderLiveFromSnapshot(parsed);
 }catch(_){clear();status('az adatkapcsolat pillanatnyilag nem elérhető')}
 finally{inFlight=false}
}
function start(){if(polling!==null)return;poll();polling=w.setInterval(poll,sh9AllMode?60000:15000)}
function stop(){if(polling!==null){w.clearInterval(polling);polling=null}clear()}
d.addEventListener('visibilitychange',()=>{if(d.hidden)stop();else start()});
// A Watchlist editor changes favorites, not the old hidden map checkboxes.
// Re-evaluate immediately instead of leaving stale vehicle markers visible.
w.addEventListener('hh-bkk-watchlist-v814-changed',()=>{
 if(sh9AllMode||d.hidden)return;
 clear();
 poll();
});
// Toggle ONE route's vehicles without requesting another BKK snapshot.
w.addEventListener('hh-bkk-live-per-line-v909-changed',()=>{
 if(sh9AllMode||d.hidden||!lastSourceSnapshot)return;
 renderLiveFromSnapshot(lastSourceSnapshot);
});
w.addEventListener('pagehide',stop);
start();
})(window,document);
