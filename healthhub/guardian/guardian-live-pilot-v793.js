/* Smart Arrival v799: original Family Guard URL includes live BKK by default.
 * Uses the authenticated Family Live session and verified BKK server snapshots.
 * The v794 route selectors, Buddy, and private GPS remain unchanged.
 */
(function(w,d){
'use strict';
if(new URLSearchParams(w.location.search).get('hhLivePilot')==='off')return;
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
function showLive(){
 if(!lastVehicles.length||!mapApi.map)return;
 const focused=renderer.focus(mapApi.map,lastVehicles);
 if(!focused){status('a térképre közelítés nem sikerült');return}
 const mapElement=d.getElementById('guardianMap');
 if(mapElement&&mapElement.scrollIntoView)mapElement.scrollIntoView({behavior:'smooth',block:'center'});
}
focusButton.addEventListener('click',showLive);
function status(message){p.textContent='🚍 BKK élő helyzet · '+message}
function clear(){
 lastVehicles=[];
 focusButton.hidden=true;
 if(mapApi.map)renderer.clear(mapApi.map);
}
async function poll(){
 if(inFlight||d.hidden)return;
 inFlight=true;
 try{
  const client=auth.getClient&&auth.getClient();
  if(!client){status('a HealthHub bejelentkezés nem érhető el');clear();return}
  const {data:{session}}=await client.auth.getSession();
  if(!session||!session.access_token){status('Jelentkezz be a Family Live részben, majd frissítsd ezt az oldalt.');clear();return}
  const url=cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/hh-bkk-live-v793-preview';
  const res=await w.fetch(url,{method:'GET',cache:'no-store',headers:{
   'Authorization':'Bearer '+session.access_token,'apikey':cfg.publishableKey,'Accept':'application/json'
  }});
  const data=await res.json().catch(()=>null);
  if(!res.ok){clear();status(res.status===503?'BKK-adat jelenleg nem elérhető':res.status===401?'Bejelentkezés szükséges':'Kapcsolati hiba ('+res.status+')');return}
  const parsed=validator.validate(data);
  if(!parsed.ok){clear();status('az élő adat elavult vagy nem ellenőrizhető');return}
  const wanted=new Set(w.HH_GUARDIAN_TRANSIT_V790?.selected||[]);
  const active={...parsed,vehicles:parsed.vehicles.filter(v=>wanted.has(v.routeId))};
  if(!renderer.render(mapApi.map,active)){
   lastVehicles=[];focusButton.hidden=true;
   status('a térképréteg betöltésére várunk');return;
  }
  lastVehicles=active.vehicles;
  focusButton.hidden=lastVehicles.length===0;
  focusButton.textContent=lastVehicles.length===1
   ?(lastVehicles[0].routeId==='260'?'Élő 260-as busz mutatása ↗':'Élő '+lastVehicles[0].routeId+'-es villamos ↗')
   :'Élő járművek mutatása ↗';
  status(active.vehicles.length+' friss, ellenőrzött jármű · '+new Date(data.generatedAt).toLocaleTimeString('hu-HU'));
 }catch(_){clear();status('az adatkapcsolat pillanatnyilag nem elérhető')}
 finally{inFlight=false}
}
function start(){if(polling!==null)return;poll();polling=w.setInterval(poll,15000)}
function stop(){if(polling!==null){w.clearInterval(polling);polling=null}clear()}
d.addEventListener('visibilitychange',()=>{if(d.hidden)stop();else start()});
w.addEventListener('pagehide',stop);
start();
})(window,document);
