(function(){
'use strict';
/* HealthHub v583 · Non-destructive front-end enhancer for original v307 journal.
   Inputs are the existing per-profile, locally cached journal events; Dropbox
   sync and canonical event schema remain solely controlled by live-v307.js.
   Count-based snapshots only, no generated medical inference or silent AI upload.
   Opt out: ?hhsymptomglass=0. */
var PAGE='hhSymptomJournal307',STORE='hh-symptom-journal-v1';
var root=document.documentElement;
function enabled(){try{return new URLSearchParams(location.search).get('hhsymptomglass')!=='0'}catch(e){return true}}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]})}
function profile(){try{return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(e){return 'zsolt'}}
function fmt(iso){var d=new Date(iso);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(d):'—'}
function rows(){
 try{
  var d=JSON.parse(localStorage.getItem(STORE)||'null');
  if(!d||!Array.isArray(d.events))return [];
  var p=profile(),today=Date.now(),from=today-30*86400000;
  return d.events.filter(function(e){
   var at=Date.parse(e&&e.eventAt||'');
   return e&&!e.deletedAt&&e.profile===p&&Number.isFinite(at)&&at>=from&&at<=today+300000;
  }).sort(function(a,b){return Date.parse(b.eventAt)-Date.parse(a.eventAt)});
 }catch(e){return []}
}
function ensure(){
 if(!enabled())return null;
 var page=document.getElementById(PAGE),body=page&&page.querySelector('.hhSJBody');
 if(!page||!body)return null;
 var intro=page.querySelector('#hhSJPremiumIntro583');
 if(!intro){
  intro=document.createElement('section');
  intro.id='hhSJPremiumIntro583';
  intro.className='hhSJPremiumIntro583';
  intro.setAttribute('aria-label','Tünetnapló gyors áttekintés');
  intro.innerHTML='<h2 class="hhSJIntroTitle583">🩺 A tested jelzései, egy helyen</h2>'+
   '<p class="hhSJIntroSubtitle583">Gyors rögzítés, valódi bejegyzések és áttekinthető minták. A következtetés mindig a tiéd és az orvosodé.</p>'+
   '<div class="hhSJQuickActions583">'+
   '<button type="button" class="hhSJQuickAction583" data-hh-sj-action="new"><span class="hhSJQuickIcon583" aria-hidden="true">＋</span>Új bejegyzés</button>'+
   '<button type="button" class="hhSJQuickAction583" data-hh-sj-action="stats"><span class="hhSJQuickIcon583" aria-hidden="true">▥</span>Statisztika</button>'+
   '<button type="button" class="hhSJQuickAction583" data-hh-sj-action="ask"><span class="hhSJQuickIcon583" aria-hidden="true">✦</span>Kérdezd Lénát</button>'+
   '</div>'+
   '<div class="hhSJInsights583" id="hhSJInsights583" aria-live="polite"></div>'+
   '<div class="hhSJPattern583" id="hhSJPattern583"></div>'+
   '<p class="hhSJMicro583">Az összegzés csak a meglévő naplóadataidból számol. Nem diagnózis, és önmagában nem bizonyít tüneti összefüggést.</p>';
  body.insertBefore(intro,body.firstChild);
  intro.addEventListener('click',function(e){
   var b=e.target&&e.target.closest&&e.target.closest('[data-hh-sj-action]');
   if(!b)return;
   e.preventDefault();
   var action=b.dataset.hhSjAction;
   if(action==='ask'){
    if(typeof window.hhOpenLenaSmart299==='function'){window.hhOpenLenaSmart299();return}
    if(typeof window.toast==='function')window.toast('Az Ask Léna még betöltődik.');
    return;
   }
   var cards=Array.from(body.querySelectorAll(':scope > .hhSJCard'));
   var node=action==='new'?cards[0]:action==='stats'?cards[1]:null;
   if(node)node.scrollIntoView({behavior:'smooth',block:'start'});
  });
 }
 if(!page.dataset.hhSjIntro583)page.dataset.hhSjIntro583='on';
 if(!page.dataset.hhSjObserved583){
  var log=page.querySelector('#hhSJLog');
  if(log&&window.MutationObserver){
   var watch=new MutationObserver(function(){refresh()});
   watch.observe(log,{childList:true});
   page.dataset.hhSjObserved583='on';
  }
 }
 return page;
}
function refresh(){
 var page=ensure();if(!page)return;
 var holder=page.querySelector('#hhSJInsights583'),pattern=page.querySelector('#hhSJPattern583');
 if(!holder||!pattern)return;
 var list=rows(),groups=Object.create(null),days=Object.create(null),measured=0;
 list.forEach(function(e){
  var name=String(e.symptom||'Egyéb');
  groups[name]=(groups[name]||0)+1;
  var t=new Date(e.eventAt);
  days[t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate()]=true;
  if(e.measurement&&(e.measurement.systolic!=null||e.measurement.diastolic!=null||e.measurement.pulse!=null))measured++;
 });
 var freq=Object.keys(groups).sort(function(a,b){return groups[b]-groups[a]||a.localeCompare(b,'hu-HU')});
 var latest=list[0]||null;
 var items=[
  {n:String(list.length),label:'Esemény · 30 nap'},
  {n:String(Object.keys(days).length),label:'Érintett nap'},
  {n:latest?fmt(latest.eventAt):'—',label:'Utolsó bejegyzés'}
 ];
 holder.innerHTML=items.map(function(v){return '<div class="hhSJInsight583"><b>'+esc(v.n)+'</b><span>'+esc(v.label)+'</span></div>'}).join('');
 pattern.innerHTML=list.length?
  '<strong>📊 Leggyakoribb rögzített tünet:</strong> '+esc(freq[0])+' ('+groups[freq[0]]+' alkalom).'+
  (measured?' <strong>Kapcsolódó vérnyomás/pulzusmérés:</strong> '+measured+' eseménynél.':'')+
  ' A gyakoriság és az időbeli együttjárás önmagában nem bizonyít okot.':
  '<strong>📖 Még nincs bejegyzés az elmúlt 30 napból.</strong> Az első eseményt az Új bejegyzés gombbal rögzítheted.';
}
function initialize(){
 if(!enabled()){root.dataset.hhSymptomGlass='off';return}
 root.dataset.hhSymptomGlass='on';
 ensure();refresh();
 document.addEventListener('click',function(e){
  if(e.target&&e.target.closest&&e.target.closest('.hhSJLaunch307'))setTimeout(refresh,80);
 },true);
 ['healthhub:symptom-changed','healthhub:symptom-saved','healthhub:profile-changed','hh:profile-changed'].forEach(function(k){window.addEventListener(k,function(){setTimeout(refresh,0)})});
 window.addEventListener('storage',function(e){if(e.key===STORE||e.key==='hh-profile')refresh()});
 window.addEventListener('pageshow',refresh);
 var tries=0,boot=setInterval(function(){
  if(ensure()){refresh();clearInterval(boot)}
  else if(++tries>24)clearInterval(boot);
 },400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
})();
