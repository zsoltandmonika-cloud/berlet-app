/* SHO Preview v31 · canonical dock actions, real navigation shell, safely isolated mock Wallet.
 * Uses existing SH9/HealthHub routes, SH9 profile/language preferences and
 * shared Golden bottom nav. No private cloud or credentials in this preview.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const ROOT='/berlet-app/',SH9=ROOT+'sh9/',HH=ROOT+'healthhub/';
const KEY='hh-profile',LANG='sh9-language-v1',FAMILY_TASKS=SH9+'family-hub/';
const REAL_ROUTES=Object.freeze({
 'Egészség':HH,
 'Biztonság':HH+'guardian/',
 'Utazás':SH9+'smart-travel/',
 'Szórakozás':SH9+'entertainment/',
 'Bevásárlás':SH9+'shopping/',
 'Sport':SH9+'sport/',
 // Navigate to the working Golden Standard web pilot; no change to cloud write safeguards.
 'Életmód':SH9+'lifestyle/',
 'Táplálkozás':HH+'nutrition/',
 'Aktivitás':HH+'activity-one/?source=sho',
 'Alvás':HH+'sleep-one/?source=sho'
});
const LABELS={
 hu:Object.freeze({Wallet:'Smart Wallet',Táplálkozás:'Táplálkozás',Aktivitás:'Aktivitás',Alvás:'Alvás'}),
 en:Object.freeze({Egészség:'Health',Biztonság:'Safety',Utazás:'Travel',Szórakozás:'Entertainment',Bevásárlás:'Shopping',Sport:'Sport',Wallet:'Smart Wallet',Kapcsolatok:'People',Életmód:'Lifestyle',Táplálkozás:'Nutrition',Aktivitás:'Activity',Alvás:'Sleep'})
};
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
 // Canonical SHO Smart Valet is now a full-screen, honest visual preview.
 // Keep the historical inline mock implementation below as a fallback for
 // old offline SH9 snapshots, but send live launcher / preview entries to it.
 if(/^\/berlet-app\/sh9\/(?:index\.html)?$/.test(w.location.pathname)||
    /^\/berlet-app\/sh9\/sho-preview\/(?:index\.html)?$/.test(w.location.pathname)){
  goto(SH9+'wallet/');return;
 }
 let html='<p class="banner">Jegyek demónézetben. Valódi igazolványt vagy bankkártyát ide ne fotózz!</p><div class="tickets">';
 for(const t of demo[profile]){
  html+='<div class="ticket-row"><button class="ticket-row" type="button" data-open="'+t.id+
  '" style="flex:1;padding:0;border:0;background:transparent"><span class="big">'+t.icon+
  '</span><span class="tlabel"><b>'+t.name+'</b><small>'+t.provider+' · '+t.date+
  '</small></span></button><button class="pin" type="button" data-pin="'+t.id+
  '" aria-label="Kitűzés">'+(pins[profile]===t.id?'📌':'☆')+'</button></div>';
 }
 html+='</div><div class="actions"><button class="action primary" id="realPass" type="button">🎟️ Budapest-bérlet · Smart Valet</button>'+
  '<button class="action" id="addPhoto" type="button">📷 Próba fotó</button></div>'+
  '<p class="muted">A Budapest-bérlet mostantól a Smart Valet Bérletek kategóriájában kezelhető.</p>';
 open('💳 Smart Wallet · '+(profile==='z'?'Zsolt':'Mónika'),html);
 d.querySelectorAll('[data-open]').forEach(n=>n.onclick=()=>view(n.dataset.open));
 d.querySelectorAll('[data-pin]').forEach(n=>n.onclick=()=>{setPin(n.dataset.pin);wallet()});
 $('realPass').onclick=()=>goto(SH9+'wallet/?category=pass');
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
 const profileName=$('shoDockProfileName');
 if(profileName){
  profileName.textContent=profile==='z'?'Zsolt':'Mónika';
  $('profile').setAttribute('aria-label',profile==='z'?'Váltás Mónika profiljára':'Váltás Zsolt profiljára');
 }else $('profile').textContent=(profile==='z'?'Zsolt':'Mónika')+' ⇄';
 updatePinned();
 if(!$('overlay').hidden&&$('sheetTitle').textContent.includes('Smart Wallet'))wallet();
}
function switchProfile(){
 const next=profile==='z'?'m':'z';
 if(!put(KEY,next)){toast('A profil nem menthető a böngészőben');return}
 paintProfile();
 w.dispatchEvent(new CustomEvent('hh-family-profile-changed',{detail:{profile:next==='m'?'monika':'zsolt'}}));
 w.dispatchEvent(new CustomEvent('sh9:profilechange',{detail:{profile:next}}));
 toast('Aktív profil: '+(next==='z'?'Zsolt 💙':'Mónika 🩷'));
}
function paintLang(){
 const english=lang==='en';
 $('hu').classList.toggle('chosen',!english);$('en').classList.toggle('chosen',english);
 $('hu').setAttribute('aria-pressed',String(!english));$('en').setAttribute('aria-pressed',String(english));
 d.documentElement.lang=english?'en-CA':'hu';
 d.querySelectorAll('.module-grid [data-module]').forEach(el=>{const n=el.querySelector('b'),key=el.dataset.module;if(n)n.textContent=LABELS[lang][key]||key;});
 const tasksLabel=$('shoDockTasksLabel');
 if(tasksLabel)tasksLabel.textContent=english?'Tasks':'Feladatok';
 else $('tasks').textContent=english?'Tasks':'Feladatok';
 const langLabel=$('shoDockLangLabel');
 if(langLabel)langLabel.textContent=english?'Language':'Nyelv';
 $('dateHeading').textContent=english?'DATE':'DÁTUM';
 $('weatherHeading').textContent=english?'WEATHER':'IDŐJÁRÁS';
 $('calendarHeading').textContent=english?'CALENDAR':'NAPTÁR';
 $('calStrong').textContent=english?'Outlook Calendar':'Outlook-naptár';
 $('calSmall').textContent=english?'Open agenda':'Agenda megnyitása';
 $('ask').querySelector('span').textContent=english?'Ask Léna':'Kérdezd Lénát';
 refreshDate();
}
function changeLang(value){
 // Delegate to the existing SH9 i18n engine, which owns persistence and
 // notification for all SH9/HealthHub pages. Do not dispatch twice.
 const i18n=w.SH9_I18N_V1;
 if(i18n&&typeof i18n.setLanguage==='function'){
  lang=i18n.setLanguage(value)==='en'?'en':'hu';
  paintLang();return;
 }
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

/* SHO Weather v34: MetNet local observations first, wttr.in as a bounded fallback.
   MetNet's public widget API is CORS-enabled and cached by the provider. */
let weatherInFlight=null,weatherRetryTimer=null,weatherSourceUrl='https://www.metnet.hu/szamitogepes-elorejelzes/Budapest%20III.';
const WEATHER_CACHE='sho-weather-budapest-v34',WEATHER_FRESH_MS=60*60*1000,WEATHER_REFRESH_MS=10*60*1000;
const WX_METNET='https://www.metnet.hu/api/widget/v1/most?hely=Budapest%20III.';
const WX_WTTR='https://wttr.in/Budapest?format=j1';
const METNET_FORECAST_URL='https://www.metnet.hu/szamitogepes-elorejelzes/Budapest%20III.';
function showWeather(data,cached){
 if(!data||!Number.isFinite(data.temp)||data.temp< -70||data.temp>65)return false;
 const at=Date.parse(data.at||'');
 if(!Number.isFinite(at)||Date.now()-at>WEATHER_FRESH_MS||at>Date.now()+60000)return false;
 const condition=String(data.condition||'Változó').slice(0,30);
 const icon=String(data.icon||'🌤️');
 $('wxValue').textContent=icon+' '+Math.round(data.temp)+'°C · '+condition;
 $('wxSub').textContent='Budapest III. · '+(data.sourceLabel||data.source||'Időjárás')+(cached?' · cache':'');
 const cell=$('wxValue').closest('button');
 weatherSourceUrl=data.sourceUrl||METNET_FORECAST_URL;
 if(cell){
  cell.dataset.weatherStatus=cached?'cached':'ready';
  cell.dataset.weatherProvider=data.source||'unknown';
  const observed=data.observedAt&&Number.isFinite(Date.parse(data.observedAt))?
   ' · mérés '+new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'}).format(new Date(data.observedAt)):'';
  const station=data.stationName?' · '+data.stationName:'';
  cell.title=(data.source||'Időjárás')+observed+station+(cached?' · helyi gyorsítótár':'');
 }
 return true;
}
function cachedWeather(){
 try{
  const data=JSON.parse(w.localStorage.getItem(WEATHER_CACHE)||'null');
  return showWeather(data,true);
 }catch(_){return false}
}
async function requestWeather(url){
 const controller=new AbortController();
 const timeout=w.setTimeout(()=>controller.abort(),6500);
 try{
  const response=await w.fetch(url,{cache:'no-store',signal:controller.signal,credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{w.clearTimeout(timeout)}
}
function queueWeatherRetry(){
 if(weatherRetryTimer||d.hidden)return;
 weatherRetryTimer=w.setTimeout(()=>{
  weatherRetryTimer=null;
  void weather(true);
 },60000);
}
async function weather(force=false){
 if(weatherInFlight)return weatherInFlight;
 if(!force&&weatherAt&&Date.now()-weatherAt<WEATHER_REFRESH_MS)return;
 weatherInFlight=(async()=>{
  const adapter=w.SH9MetNetWeatherV1;
  let data=null;
  try{
   if(!adapter||typeof adapter.parseMetnetWeather!=='function')throw Error('MetNet adapter unavailable');
   const payload=await requestWeather(WX_METNET);
   data=adapter.parseMetnetWeather(payload);
   if(!data)throw Error('MetNet response contains no valid current temperature');
  }catch(primaryError){
   try{
    if(!adapter||typeof adapter.parseWttrWeather!=='function')throw Error('Weather adapter unavailable');
    const payload=await requestWeather(WX_WTTR);
    data=adapter.parseWttrWeather(payload);
    if(!data)throw Error('wttr.in response contains no valid current temperature');
   }catch(fallbackError){
    console.warn('SHO weather providers unavailable',primaryError,fallbackError);
   }
  }
  if(data&&showWeather(data,false)){
   weatherAt=Date.now();
   if(weatherRetryTimer){w.clearTimeout(weatherRetryTimer);weatherRetryTimer=null}
   try{w.localStorage.setItem(WEATHER_CACHE,JSON.stringify(data))}catch(_){}
  }else{
   weatherAt=0;
   if(!cachedWeather()){
    $('wxValue').textContent=lang==='en'?'Unavailable':'Nem elérhető';
    $('wxSub').textContent='Budapest III. · nincs friss adat';
    const cell=$('wxValue').closest('button');
    if(cell){cell.dataset.weatherStatus='error';cell.title='A MetNet és a tartalék időjárási szolgáltató sem érhető el. Újrapróbálkozás 1 perc múlva.'}
   }
   queueWeatherRetry();
  }
 })();
 try{return await weatherInFlight}finally{weatherInFlight=null}
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
$('tasks').onclick=()=>goto(FAMILY_TASKS);
$('status').onclick=()=>goto(SH9); // Original SH9 is the source of truth for native OTA.
// Hero Wallet and the Smart Wallet tile deliberately share the same existing handler.
$('heroWallet').onclick=wallet;$('pinLauncher').onclick=()=>view(pins[profile]);
d.querySelectorAll('[data-module]').forEach(el=>el.onclick=()=>navModule(el.dataset.module));
d.querySelectorAll('[data-demo]').forEach(el=>el.onclick=()=>{
 const kind=el.dataset.demo;
 if(kind==='date')w.open('https://outlook.live.com/calendar/0/view/month','_blank','noopener,noreferrer');
 if(kind==='calendar')w.location.assign('https://outlook.live.com/calendar/0/view/month');
 if(kind==='weather')w.open(weatherSourceUrl||METNET_FORECAST_URL,'_blank','noopener,noreferrer');
});
$('home').onclick=top;$('ask').onclick=openAsk;$('back').onclick=back;
$('alerts').onclick=()=>goto(SH9+'notification-center/');
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
w.addEventListener('sh9:languagechange',()=>{
 lang=w.SH9_I18N_V1?.getLanguage?.()==='en'?'en':get(LANG,'hu')==='en'?'en':'hu';
 paintLang();
});
w.addEventListener('pageshow',()=>{
 paintProfile();lang=w.SH9_I18N_V1?.getLanguage?.()==='en'?'en':get(LANG,'hu')==='en'?'en':'hu';paintLang();refreshDate();
});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'){refreshDate();void weather()}});
lang=get(LANG,'hu')==='en'?'en':'hu';paintProfile();paintLang();cachedWeather();void nameday();void weather();
w.setInterval(()=>{if(!d.hidden)void weather()},WEATHER_REFRESH_MS);
// Shared four-button dock opens the canonical SHO Wallet view from any module.
try{
 const params=new URLSearchParams(w.location.search);
 if(params.get('sho')==='wallet'&&(/^\/berlet-app\/sh9\/?$/.test(w.location.pathname)||w.location.pathname.endsWith('/sh9/index.html'))){
  params.delete('sho');
  const query=params.toString();
  w.history.replaceState(w.history.state,'',w.location.pathname+(query?'?'+query:'')+w.location.hash);
  wallet();
 }
}catch(_){};
})(window,document);
