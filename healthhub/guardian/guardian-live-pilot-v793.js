/* Smart Arrival v793: opt-in live BKK pilot. Enable only with ?hhLivePilot=v793.
 * Uses existing authenticated Family Live client and shared Guardian map.
 * The v794 route selectors and Buddy UI remain unchanged.
 */
(function(w,d){
'use strict';
if(new URLSearchParams(w.location.search).get('hhLivePilot')!=='v793')return;
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
p.textContent='🚍 v793 ÉLŐ BKK TESZT · Kapcsolat ellenőrzése…';
holder.prepend(p);
if(!validator||!renderer||!mapApi||!auth||!cfg||!cfg.supabaseUrl){
 p.textContent='⚠️ v793 ÉLŐ BKK TESZT · A szükséges modul még nem töltődött be. Frissítsd a lapot.';
 return;
}
let polling=null;
let inFlight=false;
function status(message){p.textContent='🚍 v793 ÉLŐ BKK TESZT · '+message}
function clear(){if(mapApi.map)renderer.clear(mapApi.map)}
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
  if(!renderer.render(mapApi.map,active)){status('a térképréteg betöltésére várunk');return}
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
