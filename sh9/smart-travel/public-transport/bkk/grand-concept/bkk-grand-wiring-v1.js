/* SH9 BKK Grand V3 wiring: native routing, local user-initiated saves, zero automatic network. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const BKK_ROOT='../',GUARDIAN='../../../../../healthhub/guardian/';
const HANDOFF='sh9-bkk-grand-planner-handoff-v1',STORE='sh9-bkk-grand-journeys-v1-';
const MAX_SAVED=40,MAX_AGE=10*60*1000;
const toast=message=>{const el=$('toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4200)};
function profile(){try{return localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}}
function current(){const pressed=document.querySelector('[data-mode].on');return{
 from:$('from').value.trim().slice(0,120),to:$('to').value.trim().slice(0,120),
 mode:pressed?.dataset.mode||'now',date:$('date').value,time:$('time').value
}}
function readJourneys(){try{const a=JSON.parse(localStorage.getItem(STORE+profile())||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.from==='string'&&typeof x.to==='string').slice(0,MAX_SAVED):[]}catch(_){return[]}}
function writeJourneys(j){try{localStorage.setItem(STORE+profile(),JSON.stringify(j.slice(0,MAX_SAVED)));return true}catch(_){toast('A helyi mentés nem engedélyezett.');return false}}
function showJourneys(){
 const panel=$('bkkGrandTrips'),list=$('bkkGrandTripList'),records=readJourneys();
 list.replaceChildren();panel.hidden=false;
 if(!records.length){const p=document.createElement('p');p.textContent='Még nincs mentett BKK-utazás ennél a profilnál.';list.appendChild(p)}
 for(const r of records){
  const item=document.createElement('article');item.className='bkk-grand-trip';
  const copy=document.createElement('div'),title=document.createElement('strong'),hint=document.createElement('small');
  title.textContent=r.from+' → '+r.to;
  hint.textContent=(r.mode==='arrive'?'Érkezés ekkor':r.mode==='depart'?'Indulás ekkor':'Indulás most')+' · '+r.date+' '+r.time+' · helyben mentve, nem foglalás';
  copy.append(title,hint);
  const open=document.createElement('button');open.type='button';open.textContent='Betöltés';open.addEventListener('click',()=>{
   window.SH9_BKK_GRAND_PREDICTIVE_V4?.clearSelections?.();
   $('from').value=r.from;$('to').value=r.to;$('date').value=r.date;$('time').value=r.time;
   document.querySelector('[data-mode="'+r.mode+'"]')?.click();
   panel.hidden=true;$('planner')?.scrollIntoView({behavior:'smooth',block:'start'});
   toast('Mentett BKK-útvonal betöltve.');
  });
  const remove=document.createElement('button');remove.type='button';remove.textContent='Törlés';remove.setAttribute('aria-label','Mentett utazás törlése: '+r.from+' – '+r.to);
  remove.addEventListener('click',()=>{if(writeJourneys(readJourneys().filter(x=>x.id!==r.id)))showJourneys()});
  item.append(copy,open,remove);list.append(item);
 }
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function saveJourney(){
 const r=current();if(!r.from||!r.to){toast('Az utazás mentéséhez add meg az indulást és az érkezést.');return}
 if(r.from.toLocaleLowerCase('hu-HU')===r.to.toLocaleLowerCase('hu-HU')){toast('Az indulási és érkezési hely nem lehet azonos.');return}
 const id='bkk-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 if(writeJourneys([{...r,id},...readJourneys()])){
 toast('BKK-utazás elmentve a '+(profile()==='m'?'Mónika':'Zsolt')+' profilban.');
 showJourneys();
 }
}
function openPlanner(){
 const p=current();
 if(!p.from||!p.to){
  toast('Add meg az indulási és érkezési helyet.');
  (!p.from?$('from'):$('to')).focus();return;
 }
 if(p.from.toLocaleLowerCase('hu-HU')===p.to.toLocaleLowerCase('hu-HU')){
  toast('Válassz két különböző helyet.');return;
 }
 // Text typed into a field is not verified. Only an explicitly selected
 // Photon/favorite result may become a route coordinate.
 const predictor=window.SH9_BKK_GRAND_PREDICTIVE_V4?.selection;
 const core=window.HH_SMART_HUB_FIELDS_V806;
 const valid=(key,visible)=>{
  const x=predictor?.[key];if(!core?.validPlace?.(x))return null;
  if(core.displayPlace(x).trim()!==visible.trim())return null;
  return {name:x.name,displayName:x.displayName||'',subtitle:x.subtitle||'',
   lat:x.lat,lng:x.lng};
 };
 const origin=valid('origin',p.from),destination=valid('destination',p.to);
 if(!origin||!destination){
  const missing=!origin?'from':'to';
  toast('Válaszd ki a '+(!origin?'Honnan':'Hová')+' címet a prediktív találatokból, majd indítsd a keresést.');
  $(missing).focus();return;
 }
 if(Math.hypot((origin.lat-destination.lat)*111000,(origin.lng-destination.lng)*74000)<25){
  toast('Az indulási és érkezési helynek különböznie kell.');return;
 }
 const draft={...p,verified:{origin,destination},
  created:Date.now(),source:'sh9-bkk-grand-v3'};
 try{sessionStorage.setItem(HANDOFF,JSON.stringify(draft))}
 catch(_){toast('A két kereső közötti címátadás nem sikerült. Próbáld újra.');return}
 window.location.assign(GUARDIAN+'#hhSmartHubDestinationV802');
}
const destinations=Object.freeze({
 'Menetrend':BKK_ROOT+'#allLines',
 'BKK menetrend':BKK_ROOT+'#allLines',
 'Összes találat':BKK_ROOT+'#allLines',
 'Kedvencek':BKK_ROOT+'#favorites',
 'Kedvenc vonalak':BKK_ROOT+'#favorites',
 'Élő járművek':GUARDIAN+'?sh9Transit=1',
 'Térkép':GUARDIAN+'?sh9Transit=1',
 'Megállói indulások':GUARDIAN+'?sh9Transit=1',
 'Megálló infó':GUARDIAN+'?sh9Transit=1',
 'Indulási tábla':GUARDIAN+'?sh9Transit=1',
 'Jegyek':'https://bkk.hu/jegyek-es-berletek/',
 'Jegyvásárlás':'https://bkk.hu/jegyek-es-berletek/',
 'Forgalmi információk':'https://bkk.hu/bkk-info/'
});
function go(target){
 const url=destinations[target];if(!url)return;
 if(url.startsWith('https://'))window.open(url,'_blank','noopener,noreferrer');else window.location.assign(url);
}
$('find')?.addEventListener('click',openPlanner);
for(const el of document.querySelectorAll('[data-concept]')){
 el.addEventListener('click',()=>{
  const key=el.dataset.concept;
  if(key==='Utazás mentése')saveJourney();
  else if(key==='Utazásaim')showJourneys();
  else if(key==='Kedvencek'&&window.HH_TRAVEL_FAVORITES_UI_V972)
   window.HH_TRAVEL_FAVORITES_UI_V972.open();
  else go(key);
 });
}
$('bkkGrandTripsClose')?.addEventListener('click',()=>{$('bkkGrandTrips').hidden=true});
$('profile')?.addEventListener('click',()=>{if(!$('bkkGrandTrips').hidden)showJourneys()});
window.addEventListener('pageshow',()=>{
 const panel=$('bkkGrandTrips');if(panel&&!panel.hidden)showJourneys();
});
window.SH9_BKK_GRAND_WIRING_V1=Object.freeze({current,openPlanner,saveJourney,showJourneys});
})();