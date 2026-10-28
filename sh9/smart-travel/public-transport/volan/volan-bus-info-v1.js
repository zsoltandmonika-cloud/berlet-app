
/* SH9 Volán Buszinfó v1. No network calls or invented timetables. */
(function(){
'use strict';
const trigger=document.getElementById('volan-bus-info-trigger');
if(!trigger)return;
const overlay=document.createElement('div');
overlay.className='volan-bi-overlay';overlay.id='volan-bus-info-overlay';overlay.hidden=true;
overlay.innerHTML="<section id=\"volan-bus-info-dialog\" class=\"volan-bi-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"volan-bi-title\" aria-describedby=\"volan-bi-description\" tabindex=\"-1\">\n<header class=\"volan-bi-head\"><span class=\"volan-bi-symbol\" aria-hidden=\"true\">🚌</span><div><h2 class=\"volan-bi-brand\" id=\"volan-bi-title\">VOLÁNBUSZ</h2><p class=\"volan-bi-subtitle\" id=\"volan-bi-description\">Járatinformáció</p></div></header>\n<button class=\"volan-bi-close\" type=\"button\" aria-label=\"Járatinformáció bezárása\">×</button>\n<div class=\"volan-bi-bus-stage\"><img class=\"volan-bi-bus-image\" alt=\"Volánbusz távolsági autóbusz\"></div>\n<section class=\"volan-bi-card\">\n<div class=\"volan-bi-line\"><span class=\"volan-bi-eyebrow\">Járatszám</span><span id=\"volan-bi-verify\" class=\"volan-bi-state\">Nem ellenőrzött adat</span></div>\n<div class=\"volan-bi-line\"><strong id=\"volan-bi-number\" class=\"volan-bi-number\">—</strong><strong id=\"volan-bi-route\" class=\"volan-bi-route\">Nincs kiválasztott járat</strong></div>\n</section>\n<div class=\"volan-bi-two-col\">\n<section class=\"volan-bi-card\" aria-label=\"Indulás és érkezés\"><div class=\"volan-bi-stop\">\n<div class=\"volan-bi-rail\" aria-hidden=\"true\"></div><div class=\"volan-bi-stop-list\">\n<div class=\"volan-bi-place\"><span id=\"volan-bi-depart-time\" class=\"volan-bi-time\">—</span><b id=\"volan-bi-from\">Nincs megadva</b><span id=\"volan-bi-depart-caption\">Indulás · nem ellenőrzött</span></div>\n<div class=\"volan-bi-place\"><span id=\"volan-bi-arrive-time\" class=\"volan-bi-time\">—</span><b id=\"volan-bi-to\">Nincs megadva</b><span id=\"volan-bi-arrive-caption\">Érkezés · nem ellenőrzött</span></div>\n</div></div><p id=\"volan-bi-time-note\" class=\"volan-bi-tiny\">A menetrendi időpontok még nem érhetők el.</p></section>\n<section class=\"volan-bi-card\" aria-label=\"Járműszolgáltatások\"><div class=\"volan-bi-facilities\">\n<div class=\"volan-bi-facility\" data-service=\"wifi\" data-status=\"unknown\"><span class=\"symbol\" aria-hidden=\"true\">⌁</span><span class=\"label\">Wi-Fi</span><span class=\"value\">Nincs adat</span></div>\n<div class=\"volan-bi-facility\" data-service=\"wc\" data-status=\"unknown\"><span class=\"symbol\" aria-hidden=\"true\">🚻</span><span class=\"label\">WC</span><span class=\"value\">Nincs adat</span></div>\n<div class=\"volan-bi-facility\" data-service=\"seat\" data-status=\"unknown\"><span class=\"symbol\" aria-hidden=\"true\">💺</span><span class=\"label\">Ülőhely</span><span class=\"value\">Nincs adat</span></div>\n<div class=\"volan-bi-facility\" data-service=\"ac\" data-status=\"unknown\"><span class=\"symbol\" aria-hidden=\"true\">❄</span><span class=\"label\">Légkondicionáló</span><span class=\"value\">Nincs adat</span></div>\n</div></section>\n</div>\n<section class=\"volan-bi-card\" aria-label=\"Utazási részletek\"><div class=\"volan-bi-metrics\">\n<div class=\"volan-bi-metric\"><span>◷ Időtartam</span><b id=\"volan-bi-duration\">—</b></div>\n<div class=\"volan-bi-metric\"><span>⌁ Távolság</span><b id=\"volan-bi-distance\">—</b></div>\n<div class=\"volan-bi-metric\"><span>▣ Poggyász</span><b id=\"volan-bi-luggage\">Nincs adat</b></div>\n</div></section>\n<footer class=\"volan-bi-bottom\"><p id=\"volan-bi-footnote\">Előnézet. Nincs élő Volán-adatkapcsolat; a saját útvonalterv nem hiteles menetrend.</p><button type=\"button\" class=\"volan-bi-done\">Bezárás</button></footer>\n</section>";
document.body.appendChild(overlay);
const dialog=overlay.querySelector('[role="dialog"]');
const $=id=>overlay.querySelector('#'+id);
const closeButton=overlay.querySelector('.volan-bi-close');
const doneButton=overlay.querySelector('.volan-bi-done');
const image=overlay.querySelector('.volan-bi-bus-image');
const cardBus=document.querySelector('.volan-bus-thumb');
if(cardBus)image.src=cardBus.currentSrc||cardBus.src;
let previousFocus=null,previousOverflow='',lastData=null;
function setText(id,v){$(id).textContent=v==null||v===''?'—':String(v).slice(0,140)}
function setService(service,value,verified){
 const el=overlay.querySelector('[data-service="'+service+'"]');
 if(!el)return;
 const hasValue=verified&&typeof value==='boolean';
 el.dataset.status=!hasValue?'unknown':value?'yes':'no';
 el.querySelector('.value').textContent=!hasValue?'Nincs adat':value?'✓ Elérhető':'✕ Nem elérhető';
}
function getPlanner(){
 const from=document.getElementById('from')?.value.trim()||'';
 const to=document.getElementById('to')?.value.trim()||'';
 const mode=document.querySelector('[data-mode].on')?.dataset.mode||'now';
 const date=document.getElementById('rail-date')?.value||'';
 const time=document.getElementById('rail-time')?.value||'';
 return{from,to,mode,date,time};
}
function render(input){
 const d=input&&typeof input==='object'?input:{},plan=getPlanner();
 const verified=d.source==='official'&&d.verified===true;
 const from=String(d.from||plan.from||'Nincs megadva').slice(0,100);
 const to=String(d.to||plan.to||'Nincs megadva').slice(0,100);
 setText('volan-bi-number',d.number||'—');
 setText('volan-bi-route',(from!=='Nincs megadva'||to!=='Nincs megadva')?from+' ↔ '+to:'Nincs kiválasztott járat');
 setText('volan-bi-from',from);setText('volan-bi-to',to);
 const status=$('volan-bi-verify');
 status.textContent=verified?'✓ Hitelesített adat':'Menetrend nem ellenőrzött';
 status.classList.toggle('verified',verified);
 setText('volan-bi-depart-time',verified?d.departure||'—':'—');
 setText('volan-bi-arrive-time',verified?d.arrival||'—':'—');
 setText('volan-bi-depart-caption',verified?'Indulás · menetrend':'Indulás · nem ellenőrzött');
 setText('volan-bi-arrive-caption',verified?'Érkezés · menetrend':'Érkezés · nem ellenőrzött');
 const selected=plan.mode==='now'?'Indulás most':plan.mode==='arrive'?'Tervezett érkezés':'Tervezett indulás';
 setText('volan-bi-time-note',verified?(d.asOf?'Forrás időpontja: '+String(d.asOf).slice(0,60):'Hitelesített menetrendi adatok'):(plan.mode==='now'?'A rendszer még nem kapcsolódik élő buszmenetrendhez.':selected+': '+(plan.date||'dátum nélkül')+' '+(plan.time||'időpont nélkül')+' · saját terv, nem járatindulás.'));
 setText('volan-bi-duration',verified?d.duration||'—':'—');
 setText('volan-bi-distance',verified?d.distance||'—':'—');
 setText('volan-bi-luggage',verified?d.luggage||'Nincs adat':'Nincs adat');
 for(const service of ['wifi','wc','seat','ac'])setService(service,d.amenities?.[service],verified);
 setText('volan-bi-footnote',verified?'Forrás: hivatalos adatkapcsolat. Az adatok változhatnak.':'Előnézet. Nincs élő Volán-adatkapcsolat; a saját útvonalterv nem hiteles menetrend.');
}
function onKey(e){
 if(e.key==='Escape'){e.preventDefault();close();return}
 if(e.key!=='Tab')return;
 const list=[...dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length>0);
 if(!list.length){e.preventDefault();dialog.focus();return}
 const first=list[0],last=list[list.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}
function open(data){
 if(!overlay.hidden)return;
 lastData=data&&typeof data==='object'?data:null;
 render(lastData);
 previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;
 overlay.hidden=false;document.body.style.overflow='hidden';
 document.addEventListener('keydown',onKey);
 closeButton.focus();
}
function close(){
 if(overlay.hidden)return;
 overlay.hidden=true;document.body.style.overflow=previousOverflow;
 document.removeEventListener('keydown',onKey);
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
}
trigger.addEventListener('click',()=>open());
closeButton.addEventListener('click',close);
doneButton.addEventListener('click',close);
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
window.SH9_VOLAN_BUSINFO_V1=Object.freeze({open,close,refresh(){if(!overlay.hidden)render(lastData)}});
})();
