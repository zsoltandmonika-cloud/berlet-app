/* Léna Smart Trip v2: identical Golden Shell planner, local profile journeys, one-shot Guardian handoff. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const trigger=$('smartTripOpen'),panel=$('smartTripPanel'),form=$('smartTripForm'),from=$('smartTripFrom'),to=$('smartTripDestination');
if(!trigger||!panel||!form||!from||!to)return;
const date=$('smartTripDate'),time=$('smartTripTime'),status=$('smartTripStatus'),saved=$('smartTripJourneysPanel'),list=$('smartTripJourneyList');
const storePrefix='sh9-smart-trip-journeys-v2-',handoffKey='sh9-bkk-grand-planner-handoff-v1';
let selected='now';
function profile(){try{return localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}}
function budapestNow(){
 const fields=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const parts={};for(const p of fields)parts[p.type]=p.value;
 return {date:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
}
function feedback(message){status.textContent=message}
function setMode(value){
 if(!['now','depart','arrive'].includes(value))return;
 selected=value;
 for(const button of panel.querySelectorAll('[data-trip-mode]')){
 const on=button.dataset.tripMode===value;
 button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));
 }
 date.title=value==='arrive'?'Érkezés napja':value==='depart'?'Indulás napja':'Mai dátum';
 time.title=value==='arrive'?'Érkezés időpontja':value==='depart'?'Indulás időpontja':'Jelenlegi idő';
}
function snapshot(){
 const now=budapestNow();
 return {
 from:from.value.trim().replace(/\s+/g,' ').slice(0,120),
 to:to.value.trim().replace(/\s+/g,' ').slice(0,120),
 mode:selected,date:selected==='now'?now.date:date.value,
 time:selected==='now'?now.time:time.value
 };
}
function show(visible){
 panel.hidden=!visible;trigger.setAttribute('aria-expanded',String(visible));
 if(visible){
 if(!date.value||!time.value){const now=budapestNow();date.value=now.date;time.value=now.time}
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 // Deliberately no .focus() on input: avoid immediate S24 Ultra keyboard.
 }else trigger.focus();
}
function read(){
 try{
 const records=JSON.parse(localStorage.getItem(storePrefix+profile())||'[]');
 return Array.isArray(records)?records.filter(x=>x&&typeof x.from==='string'&&typeof x.to==='string'&&['now','depart','arrive'].includes(x.mode)).slice(0,35):[];
 }catch(_){return[]}
}
function persist(records){
 try{localStorage.setItem(storePrefix+profile(),JSON.stringify(records.slice(0,35)));return true}
 catch(_){feedback('A helyi mentés nem sikerült. Ellenőrizd a böngésző tárhelyengedélyeit.');return false}
}
function renderJourneys(){
 saved.hidden=false;list.replaceChildren();
 const records=read();
 if(!records.length){const empty=document.createElement('p');empty.className='trip-empty';empty.textContent='Még nincs mentett Smart Trip utazás ennél a profilnál.';list.appendChild(empty)}
 for(const item of records){
 const card=document.createElement('article');card.className='trip-journey';
 const info=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('small');
 title.textContent=(item.from||'Indulás kiválasztása')+' → '+item.to;
 desc.textContent=(item.mode==='now'?'Indulás most':item.mode==='depart'?'Indulás ekkor':'Érkezés ekkor')+' · '+item.date+' '+item.time+' · nem foglalás';
 info.append(title,desc);
 const load=document.createElement('button');load.type='button';load.textContent='Betöltés';
 load.addEventListener('click',()=>{
 from.value=item.from;to.value=item.to;date.value=item.date;time.value=item.time;setMode(item.mode);
 saved.hidden=true;panel.scrollIntoView({behavior:'smooth',block:'start'});feedback('✓ Utazás betöltve. Az útvonalat a Keresés gombbal nyithatod meg.');
 });
 const remove=document.createElement('button');remove.type='button';remove.className='del';remove.textContent='Törlés';
 remove.setAttribute('aria-label','Mentett utazás törlése: '+title.textContent);
 remove.addEventListener('click',()=>{if(persist(read().filter(x=>x.id!==item.id)))renderJourneys()});
 card.append(info,load,remove);list.append(card);
 }
}
function saveJourney(){
 const r=snapshot();
 if(!r.to){feedback('Az utazás mentéséhez add meg a célállomást.');to.focus();return}
 if(r.from&&r.from.toLocaleLowerCase('hu-HU')===r.to.toLocaleLowerCase('hu-HU')){feedback('Az indulási hely és a cél nem lehet azonos.');return}
 const existing=read();
 const record={...r,id:'st-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)};
 if(persist([record,...existing])){renderJourneys();feedback('✓ Smart Trip útvonal elmentve a '+(profile()==='m'?'Mónika':'Zsolt')+' profiljához, ezen a készüléken.')}
}
function startSearch(event){
 event.preventDefault();
 const r=snapshot();
 if(!r.to){to.focus();feedback('Adj meg egy célállomást az útvonaltervezéshez.');return}
 if(r.from&&r.from.toLocaleLowerCase('hu-HU')===r.to.toLocaleLowerCase('hu-HU')){feedback('Két különböző hely szükséges.');return}
 if(r.mode!=='now'&&(!/^\d{4}-\d\d-\d\d$/.test(r.date)||!/^\d\d:\d\d$/.test(r.time))){feedback('Válassz érvényes utazási dátumot és időpontot.');return}
 const handoff={...r,created:Date.now(),source:'sh9-public-transport-smart-trip-v1'};
 try{sessionStorage.setItem(handoffKey,JSON.stringify(handoff))}
 catch(_){feedback('Az útvonal átadása nem sikerült. Próbáld meg újra, vagy nyisd meg közvetlenül a BKK útvonaltervezőt.');return}
 window.location.assign('../../../healthhub/guardian/#hhSmartHubDestinationV802');
}
trigger.addEventListener('click',()=>show(panel.hidden));
$('smartTripClose')?.addEventListener('click',()=>show(false));
for(const button of panel.querySelectorAll('[data-trip-mode]'))button.addEventListener('click',()=>setMode(button.dataset.tripMode));
for(const input of [date,time])input.addEventListener('change',()=>{if(selected==='now')setMode('depart')});
$('smartTripSwap')?.addEventListener('click',()=>{const a=from.value;from.value=to.value;to.value=a});
form.addEventListener('submit',startSearch);
$('smartTripSave')?.addEventListener('click',saveJourney);
$('smartTripJourneys')?.addEventListener('click',()=>{saved.hidden=!saved.hidden;if(!saved.hidden)renderJourneys()});
$('smartTripSchedule')?.addEventListener('click',()=>{
 const src=$('smartTripSources'),showSources=src.hidden;src.hidden=!showSources;
 $('smartTripSchedule').setAttribute('aria-expanded',String(showSources));
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false)});
window.addEventListener('pageshow',()=>{if(!panel.hidden&&!saved.hidden)renderJourneys()});
const now=budapestNow();date.value=now.date;time.value=now.time;setMode('now');
window.SH9_PUBLIC_TRANSPORT_SMART_TRIP_V2=Object.freeze({open:()=>show(true),close:()=>show(false),setMode,getJourney:snapshot});
})();
