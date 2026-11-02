/* SHO Preview v2 · real navigation shell, safely isolated mock Wallet.
 * Uses existing SH9/HealthHub routes, SH9 profile/language preferences and
 * shared Golden bottom nav. No private cloud or credentials in this preview.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const ROOT='/berlet-app/',SH9=ROOT+'sh9/',HH=ROOT+'healthhub/';
const KEY='hh-profile',LANG='sh9-language-v1';
const REAL_ROUTES=Object.freeze({
 'Egészség':HH,
 'Biztonság':HH+'guardian/',
 'Utazás':SH9+'smart-travel/'
});
const MODULES=Object.freeze(['Egészség','Biztonság','Utazás','Szórakozás','Bevásárlás','Sport','Családi aktualitások','Kapcsolatok','Életmód']);
const LABELS={hu:MODULES,en:['Health','Safety','Travel','Entertainment','Shopping','Sport','Family updates','People','Lifestyle']};
const demo={
 z:[{id:'zbkk',name:'Budapest-bérlet',provider:'BKK',date:'Mintabérlet',icon:'🚌',front:null,back:null},{id:'zvonat',name:'Vonatjegy',provider:'MÁV',date:'Mintajegy',icon:'🚆',front:null,back:null}],
 m:[{id:'mbkk',name:'Budapest-bérlet',provider:'BKK',date:'Mintabérlet',icon:'🚌',front:null,back:null},{id:'mbusz',name:'Buszjegy',provider:'Volán',date:'Mintajegy',icon:'🚍',front:null,back:null}]
};
const pins={z:'',m:''};
let profile='z',lang='hu',opened='',flipped=false,toastTimer=null,weatherAt=0;
const get=(key,fallback)=>{try{return w.localStorage.getItem(key)||fallback}catch(_){return fallback}};
const put=(key,value)=>{try{w.localStorage.setItem(key,value);return true}catch(_){return false}};
const goto=path=>w.location.assign(path);
const activeTicket=()=>demo[profile].find(t=>t.id===opened);
function toast(s){
 const box=$('toast');box.textContent=s;box.hidden=false;
 w.clearTimeout(toastTimer);toastTimer=w.setTimeout(()=>box.hidden=true,2400);
}
function open(title,html){
 $('sheetTitle').textContent=title;$('sheetBody').innerHTML=html;$('overlay').hidden=false;$('close').focus();
}
function close(){ $('overlay').hidden=true; }
function unavailable(title){
 open(title,'<p class="banner">Ez a modul a jelenlegi SH9 rendszerben is fejlesztés alatt áll.</p>'+
  '<p class="muted">Az SHO előnézet nem helyettesíti látszatfunkcióval. Az éles három főmodul már közvetlenül elérhető.</p>'+
  '<div class="actions"><button class="action" id="goSh9" type="button">Eredeti SH9</button>'+
  '<button class="action primary" id="gotit" type="button">Rendben</button></div>');
 $('goSh9').onclick=()=>goto(SH9);$('gotit').onclick=close;
}
function navModule(label){if(REAL_ROUTES[label])goto(REAL_ROUTES[label]);else if(label==='Wallet')wallet();else unavailable(label)}
function setPin(id){
 pins[profile]=pins[profile]===id?'':id;
 updatePinned();
 toast(pins[profile]?'Kitűzve ebben a demóban':'Kitűzés törölve');
}
function updatePinned(){
 const id=pins[profile],node=$('pinLauncher');node.hidden=!id;
 if(id){const t=demo[profile].find(a=>a.id===id);node.textContent='📌 '+(t?.name||'Jegy')}
}
function wallet(){
 let html='<p class="banner">Jegyek demónézetben. Valódi igazolványt vagy bankkártyát ide ne fotózz!</p><div class="tickets">';
 for(const t of demo[profile]){
  html+='<div class="ticket-row"><button class="ticket-row" type="button" data-open="'+t.id+
  '" style="flex:1;padding:0;border:0;background:transparent"><span class="big">'+t.icon+
  '</span><span class="tlabel"><b>'+t.name+'</b><small>'+t.provider+' · '+t.date+
  '</small></span></button><button class="pin" type="button" data-pin="'+t.id+
  '" aria-label="Kitűzés">'+(pins[profile]===t.id?'📌':'☆')+'</button></div>';
 }
 html+='</div><div class="actions"><button class="action primary" id="realPass" type="button">🎟️ Meglévő Bérlet app</button>'+
  '<button class="action" id="addPhoto" type="button">📷 Próba fotó</button></div>'+
  '<p class="muted">A Bérlet app a már mentett bérleteket mutatja. Az univerzális, titkosított Wallet még nincs élesítve.</p>';
 open('💳 Smart Wallet · '+(profile==='z'?'Zsolt':'Mónika'),html);
 d.querySelectorAll('[data-open]').forEach(n=>n.onclick=()=>view(n.dataset.open));
 d.querySelectorAll('[data-pin]').forEach(n=>n.onclick=()=>{setPin(n.dataset.pin);wallet()});
 $('realPass').onclick=()=>goto(ROOT);
 $('addPhoto').onclick=()=>$('photo').click();
}
function view(id){
 if(!demo[profile].some(t=>t.id===id))return;
 opened=id;flipped=false;close();$('viewer').hidden=false;drawViewer();
}
function drawViewer(){
 const t=activeTicket();if(!t)return;
 $('viewTitle').textContent=t.name+' · DEMÓ';
 const box=$('viewContent');box.replaceChildren();
 const url=flipped?t.back:t.front;
 if(url){const img=d.createElement('img');img.src=url;img.alt='Helyi próbafotó';box.appendChild(img);return}
 const pane=d.createElement('div');
 const provider=d.createElement('small');provider.textContent=t.provider+' · SHO Preview';
 const name=d.createElement('b');name.textContent=t.name;
 const note=d.createElement('p');note.textContent='Szemléltető kártya, nem érvényes jegy.';
 const mark=d.createElement('span');mark.className='demo-mark';mark.textContent='DEMÓ';
 pane.append(provider,name,note,mark);box.appendChild(pane);
}
function paintProfile(){
 profile=get(KEY,'z')==='m'?'m':'z';
 d.documentElement.setAttribute('data-sh9-golden-profile',profile);
 $('profile').textContent=(profile==='z'?'Zsolt':'Mónika')+' ⇄';
 updatePinned();
 if(!$('overlay').hidden&&$('sheetTitle').textContent.includes('Smart Wallet'))wallet();
}
function switchProfile(){
 const next=profile==='z'?'m':'z';
 if(!put(KEY,next)){toast('A profil nem menthető a böngészőben');return}
 paintProfile();
 w.dispatchEvent(new CustomEvent('hh-family-profile-changed',{detail:{profile:next==='m'?'monika':'zsolt'}}));
 toast('Aktív profil: '+(next==='z'?'Zsolt 💙':'Mónika 🩷'));
}
function paintLang(){
 const english=lang==='en';
 $('hu').classList.toggle('chosen',!english);$('en').classList.toggle('chosen',english);
 $('hu').setAttribute('aria-pressed',String(!english));$('en').setAttribute('aria-pressed',String(english));
 d.documentElement.lang=english?'en-CA':'hu';
 d.querySelectorAll('.module-grid .tile:not(.wallet) b').forEach((n,i)=>n.textContent=LABELS[lang][i]);
 $('tasks').textContent=english?'Tasks':'Feladatok';
 $('dateHeading').textContent=english?'DATE':'DÁTUM';
 $('weatherHeading').textContent=english?'WEATHER':'IDŐJÁRÁS';
 $('calendarHeading').textContent=english?'CALENDAR':'NAPTÁR';
 $('calStrong').textContent=english?'Outlook Calendar':'Outlook-naptár';
 $('calSmall').textContent=english?'Open agenda':'Agenda megnyitása';
 $('ask').querySelector('span').textContent=english?'Ask Léna':'Kérdezd Lénát';
 refreshDate();
}
function changeLang(value){
 if(!put(LANG,value)){toast('A nyelv nem menthető');return}
 lang=value;paintLang();
 w.dispatchEvent(new CustomEvent('sh9:languagechange',{detail:{language:value}}));
}
function refreshDate(){
 $('date').textContent=new Intl.DateTimeFormat(lang==='hu'?'hu-HU':'en-CA',{
  timeZone:'Europe/Budapest',month:'long',day:'numeric',weekday:'short'
 }).format(new Date());
}
async function nameday(){
 try{
  const res=await w.fetch(HH+'data/namedays.json',{cache:'force-cache'});
  if(!res.ok)throw Error('Nameday file');
  const data=await res.json(),dateParts=new Intl.DateTimeFormat('en-GB',{
   timeZone:'Europe/Budapest',month:'numeric',day:'numeric'
  }).formatToParts(new Date());
  const vals=Object.fromEntries(dateParts.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  const names=data.namedays?.[String(vals.month)]?.[String(vals.day)];
  $('nameDay').textContent=Array.isArray(names)&&names.length?'NÉVNAP · '+names.join(', '):'Budapest';
 }catch(_){$('nameDay').textContent='Névnap nem elérhető'}
}
async function weather(){
 if(Date.now()-weatherAt<600000)return;
 weatherAt=Date.now();
 try{
  const url='https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,weather_code,is_day&timezone=Europe%2FBudapest';
  const res=await w.fetch(url,{cache:'no-store'});if(!res.ok)throw Error('Weather');
  const v=(await res.json()).current||{};if(!Number.isFinite(v.temperature_2m))throw Error('Temperature');
  const el=$('wxValue');el.textContent=(v.is_day?'🌤️ ':'🌙 ')+Math.round(v.temperature_2m)+' °C';
  $('wxSub').textContent='Budapest · Open-Meteo';
 }catch(_){$('wxValue').textContent='Nem elérhető';$('wxSub').textContent='Budapest'}
}
function openAsk(){
 const api=w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
 if(api&&typeof api.openProject==='function')api.openProject();
 else goto(HH+'index.html?sh9nav=admin&sh9cfg=asklena');
}
function top(){
 $('viewer').hidden=true;close();
 d.querySelector('.module-board').scrollTop=0;
 toast('SHO kezdőlap');
}
function back(){
 if(!$('viewer').hidden){$('viewer').hidden=true;return}
 if(!$('overlay').hidden){close();return}
 if(w.history.length>1)w.history.back();else goto(SH9);
}
$('profile').onclick=switchProfile;
$('hu').onclick=()=>changeLang('hu');
$('en').onclick=()=>changeLang('en');
$('tasks').onclick=()=>goto(SH9+'family-hub/');
$('status').onclick=()=>goto(SH9); // Original SH9 is the source of truth for native OTA.
$('heroWallet').onclick=wallet;$('pinLauncher').onclick=()=>view(pins[profile]);
d.querySelectorAll('[data-module]').forEach(el=>el.onclick=()=>navModule(el.dataset.module));
d.querySelectorAll('[data-demo]').forEach(el=>el.onclick=()=>{
 const kind=el.dataset.demo;
 if(kind==='date')w.open('https://outlook.live.com/calendar/0/view/month','_blank','noopener,noreferrer');
 if(kind==='calendar')w.open('https://outlook.live.com/calendar/0/view/agenda','_blank','noopener,noreferrer');
 if(kind==='weather')w.open('https://www.meteoblue.com/en/weather/week/budapest_hungary_3054643','_blank','noopener,noreferrer');
});
$('home').onclick=top;$('ask').onclick=openAsk;$('back').onclick=back;
$('alerts').onclick=()=>goto(HH+'index.html?sh9nav=notifications');
$('admin').onclick=()=>goto(HH+'index.html?sh9nav=admin');
$('close').onclick=close;$('overlay').onclick=e=>{if(e.target===$('overlay'))close()};
$('viewClose').onclick=()=>$('viewer').hidden=true;
$('flip').onclick=()=>{flipped=!flipped;drawViewer()};
$('viewPin').onclick=()=>setPin(opened);
$('photo').onchange=e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){toast('Csak próbafotó használható');return}
 const url=URL.createObjectURL(file),id='local'+Date.now();
 demo[profile].unshift({id,name:'Próbafotó',provider:'Helyi demó',date:'Nem mentett kép',icon:'📸',front:url,back:null});
 e.target.value='';wallet();toast('Fotó hozzáadva kizárólag az aktuális oldalon');
};
d.addEventListener('keydown',e=>{if(e.key==='Escape'){close();$('viewer').hidden=true}});
w.addEventListener('storage',e=>{
 if(e.key===KEY){paintProfile();}
 if(e.key===LANG){lang=get(LANG,'hu')==='en'?'en':'hu';paintLang();}
});
w.addEventListener('pageshow',()=>{paintProfile();refreshDate();});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'){refreshDate();void weather()}});
lang=get(LANG,'hu')==='en'?'en':'hu';paintProfile();paintLang();void nameday();void weather();
})(window,document);
