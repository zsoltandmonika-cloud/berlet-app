/* SH9 BKK Grand → Family Guard · v974 verified one-shot navigation.
 * Grand uses explicitly selected Photon/favorite coordinates. Never mistake
 * plain sample or typed text for a verified route. No background requests.
 */
(function(w,d){
'use strict';
if(w.location.hash!=='#hhSmartHubDestinationV802')return;
const KEY='sh9-bkk-grand-planner-handoff-v1';
let raw;
try{raw=w.sessionStorage.getItem(KEY);if(raw)w.sessionStorage.removeItem(KEY)}
catch(_){return}
if(!raw||raw.length>3500)return;
let draft;
try{draft=JSON.parse(raw)}catch(_){return}
if(!draft||!['sh9-bkk-grand-v3','sh9-public-transport-smart-trip-v1'].includes(draft.source)||
 typeof draft.from!=='string'||typeof draft.to!=='string'||
 !Number.isFinite(draft.created)||Date.now()-draft.created>600000||
 draft.created-Date.now()>60000)return;
const $=id=>d.getElementById(id);
function valid(p){
 return !!p&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=120&&
  typeof p.lat==='number'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&
  typeof p.lng==='number'&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
}
function safe(p){
 return {name:p.name.slice(0,120),displayName:String(p.displayName||'').slice(0,80),
  subtitle:String(p.subtitle||'').slice(0,190),lat:p.lat,lng:p.lng};
}
function focusRouteResults(){
 const plans=$('hhSmartHubTripPlansV804'),note=$('hhSmartHubTripStatusV804');
 if(!plans||!note)return;
 let finished=false;
 function move(){
  const destination=plans.querySelector('.hh-smart-trip-card-v804')?plans:note;
  try{destination.scrollIntoView({behavior:'smooth',block:'start'})}
  catch(_){destination.scrollIntoView()}
 }
 // Scroll first to the route status even if GTFS is still loading.
 const schedule=w.requestAnimationFrame?
  cb=>w.requestAnimationFrame(()=>w.requestAnimationFrame(cb)):cb=>w.setTimeout(cb,100);
 schedule(move);
 if(plans.querySelector('.hh-smart-trip-card-v804'))return;
 if(!w.MutationObserver)return;
 const observer=new w.MutationObserver(()=>{
  if(finished||!plans.querySelector('.hh-smart-trip-card-v804'))return;
  finished=true;observer.disconnect();move();
 });
 observer.observe(plans,{childList:true,subtree:true});
 w.setTimeout(()=>{finished=true;observer.disconnect()},20000);
}
function install(){
 const from=$('hhSmartHubFromV806'),to=$('hhSmartHubToV806');
 if(!from||!to)return;
 from.value=draft.from.slice(0,120);to.value=draft.to.slice(0,120);
 const mode=['now','depart','arrive'].includes(draft.mode)?draft.mode:'now';
 const modeId={now:'hhPlannerNowV939',depart:'hhPlannerDepartV939',arrive:'hhPlannerArriveV939'}[mode];
 $(modeId)?.click();
 if(mode!=='now'&&/^\d{4}-\d\d-\d\d$/.test(draft.date)&&/^\d\d:\d\d$/.test(draft.time)){
  const date=$('hhPlannerDateV939');
  if(date){date.value=draft.date+'T'+draft.time;date.dispatchEvent(new Event('change',{bubbles:true}))}
 }
 const status=$('hhSmartHubDestinationStatusV802');
 const origin=draft.verified?.origin,target=draft.verified?.destination;
 if(draft.source==='sh9-bkk-grand-v3'&&valid(origin)&&valid(target)){
  // Use the exact two existing Family Guard verified selection handlers,
  // which update both the visible inputs and actual GTFS journey state.
  w.dispatchEvent(new CustomEvent('hh-guardian-map-origin-v836',{detail:safe(origin)}));
  w.dispatchEvent(new CustomEvent('hh-guardian-map-destination-v819',{detail:safe(target)}));
  const chosen=w.HH_SMART_HUB_ROUTER_V804?.selection;
  if(chosen?.start&&chosen?.target){
   if(status)status.textContent='✓ Két ellenőrzött cím átvéve. Görgetés a BKK útvonaljavaslatokhoz.';
   focusRouteResults();
  }else if(status)status.textContent='A címek átvéve, de az útvonaltervezés még nem indult el. Ellenőrizd a keresőt.';
 }else if(status)status.textContent=
  draft.source==='sh9-public-transport-smart-trip-v1'?
  '✓ Smart Trip átvéve. Válaszd ki külön a két címet a prediktív találatokból az útvonaltervezéshez.':
  '✓ BKK útvonal szövege átvéve. A Honnan/Hová címeket a prediktív találatokból kell kiválasztani.';
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window,document);
