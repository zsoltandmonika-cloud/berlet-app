/* SH9 language core v1 · HU / Canadian English. Presentation only.
   No profile, geolocation, health, API, navigation, or database mutations.
   Extend by adding approved translations and data-i18n attributes. */
(function(w,d){
'use strict';
if(w.SH9_I18N_V1)return;
const KEY='sh9-language-v1',DEFAULT='hu';
const dict=Object.freeze({
 hu:Object.freeze({
  'module.health':'Egészség','module.guard':'Biztonság','module.travel':'Utazás',
  'module.entertainment':'Szórakozás','module.ask':'Ask Léna','module.sports':'Sport',
  'module.daily':'Családi aktualitások','module.people':'Kapcsolatok','module.lifestyle':'Életmód',
  'module.ariaHealth':'Egészség megnyitása','module.ariaGuard':'Biztonság megnyitása','module.ariaTravel':'Utazás megnyitása','module.ariaSports':'Sport megnyitása',
  'module.ariaPeople':'Kapcsolatok megnyitása','module.ariaLifestyle':'Életmód megnyitása',
  'module.ariaEntertainment':'Szórakozás megnyitása','module.ariaDaily':'Családi aktualitások megnyitása',
  'travel.pageTitle':'SH9 · Utazás',
  'travel.heroAria':'Utazás · Róma, Párizs, Dubai · Léna, Mónika, Zsolt, Corky és Buddy',
  'nav.home':'Kezdőlap','nav.timeline':'Idővonal','nav.back':'Vissza','nav.notifications':'Értesítések','nav.admin':'Admin',
  'info.date':'DÁTUM','info.nameday':'NÉVNAP · ','info.weather':'IDŐJÁRÁS','info.calendar':'NAPTÁR',
  'info.loading':'Betöltés…','info.dateLoading':'Dátum betöltése…','info.notConnected':'Nincs összekötve',
  'info.openAgenda':'Agenda megnyitása ›',
  'modal.unavailable':'Ez a modul még fejlesztés alatt áll. A HealthHub és a Family Guard már elérhető az SH9-ből.',
  'modal.close':'Bezárás','modal.noHistory':'Nincs előző oldal az SH9 előzményeiben.',
  'aria.hero':'SH9 SmartHub Nine, Buddy mókus asszisztens, futurisztikus kilencmodulos központ',
  'aria.info':'Mai információk: dátum, névnap, időjárás, naptár',
  'aria.grid':'SH9 kilenc modulja','aria.nav':'SH9 navigáció',
  'aria.nameday':'Dátum és névnap · Outlook havi naptár megnyitása',
  'aria.weather':'Budapest részletes időjárás-előrejelzésének megnyitása',
  'aria.agenda':'Outlook Agenda megnyitása közvetlenül',
  'aria.ota':'HH One frissítések ellenőrzése',
  'lang.hu':'Magyar','lang.en':'Kanadai angol',
  'travel.planner':'Saját útvonaltervező','travel.publicTitle':'Tömegközlekedés','travel.publicAria':'Tömegközlekedés megnyitása','travel.public':'Járatok · menetrend','travel.road':'Autós utazások',
  'travel.air':'Repülés · járatok','travel.concierge':'Travel Concierge','travel.taxi':'Taxik · rendelés',
  'travel.shared':'Autó · bringa · roller','travel.trips':'Utazási terveink','travel.places':'Kedvenc helyek',
  'travel.forecast':'Előrejelzés ↗','travel.weatherLoading':'Időjárás betöltése…',
  'travel.grid':'Utazás kilenc kategóriája',
  'travel.pendingRoad':'Az autós útvonaltervezés, forgalom és parkolási lehetőségek még fejlesztés alatt állnak.',
  'travel.pendingAir':'A repülőjáratok és repülőtéri adatok integrációja következő fejlesztési lépés.',
  'travel.pendingTaxi':'A taxitársaságok és rendelési szolgáltatások bekötése még előkészítés alatt áll.',
  'travel.pendingShared':'A közösségi autók, kerékpárok és elektromos rollerek adatkapcsolatai még előkészítés alatt állnak.',
  'travel.pending':'Ez a funkció fejlesztés alatt áll.','travel.notifications':'Az SH9 értesítési központja még fejlesztés alatt áll.',
  'wx.notAvailable':'Nem elérhető','wx.noData':'Budapest · nincs friss adat',
  'wx.error':'Az élő időjárás lekérése sikertelen',
  'nameday.unavailable':'nem elérhető',
  'wx.0':'Derült','wx.1':'Többnyire derült','wx.2':'Részben felhős','wx.3':'Borult',
  'wx.45':'Köd','wx.51':'Szitálás','wx.61':'Eső','wx.71':'Havazás',
  'wx.80':'Zápor','wx.85':'Hózápor','wx.95':'Zivatar','wx.other':'Változó'
 }),
 en:Object.freeze({
  'module.health':'Health','module.guard':'Safety','module.travel':'Travel',
  'module.entertainment':'Entertainment','module.ask':'Ask Léna','module.sports':'Sports',
  'module.daily':'Family Updates','module.people':'People','module.lifestyle':'Lifestyle',
  'module.ariaHealth':'Open Health','module.ariaGuard':'Open Safety','module.ariaTravel':'Open Travel','module.ariaSports':'Open Sports',
  'module.ariaPeople':'Open People','module.ariaLifestyle':'Open Lifestyle',
  'module.ariaEntertainment':'Open Entertainment','module.ariaDaily':'Open Family Updates',
  'travel.pageTitle':'SH9 · Travel',
  'travel.heroAria':'Travel · Rome, Paris and Dubai · Léna, Mónika, Zsolt, Corky and Buddy',
  'nav.home':'Home','nav.timeline':'Timeline','nav.back':'Back','nav.notifications':'Notifications','nav.admin':'Admin',
  'info.date':'DATE','info.nameday':'NAME DAY · ','info.weather':'WEATHER','info.calendar':'CALENDAR',
  'info.loading':'Loading…','info.dateLoading':'Loading date…','info.notConnected':'Not connected',
  'info.openAgenda':'Open agenda ›',
  'modal.unavailable':'This module is still in development. HealthHub and Family Guard are already available in SH9.',
  'modal.close':'Close','modal.noHistory':'There is no previous page in SH9 history.',
  'aria.hero':'SH9 SmartHub Nine, Buddy the squirrel assistant, nine-module family dashboard',
  'aria.info':'Today: date, name day, weather and calendar',
  'aria.grid':'SH9 nine modules','aria.nav':'SH9 navigation',
  'aria.nameday':'Date and name day · open Outlook month view',
  'aria.weather':'Open detailed Budapest weather forecast',
  'aria.agenda':'Open Outlook agenda directly',
  'aria.ota':'Check HH One updates',
  'lang.hu':'Hungarian','lang.en':'Canadian English',
  'travel.planner':'Your trip planner','travel.publicTitle':'Public Transport','travel.publicAria':'Open Public Transport','travel.public':'Routes · timetables','travel.road':'Driving and road trips',
  'travel.air':'Flights and airports','travel.concierge':'Travel Concierge','travel.taxi':'Taxis · booking',
  'travel.shared':'Cars · bikes · scooters','travel.trips':'Our saved trips','travel.places':'Favourite places',
  'travel.forecast':'Forecast ↗','travel.weatherLoading':'Loading weather…',
  'travel.grid':'Travel: nine categories',
  'travel.pendingRoad':'Driving directions, traffic and parking are still in development.',
  'travel.pendingAir':'Flight schedules and airport information are planned for a future update.',
  'travel.pendingTaxi':'Taxi booking integrations are still being prepared.',
  'travel.pendingShared':'Shared cars, bikes and scooter integrations are still being prepared.',
  'travel.pending':'This feature is still in development.','travel.notifications':'The SH9 notification centre is still in development.',
  'wx.notAvailable':'Unavailable','wx.noData':'Budapest · no recent data',
  'wx.error':'Live weather could not be loaded',
  'nameday.unavailable':'unavailable',
  'wx.0':'Clear','wx.1':'Mostly clear','wx.2':'Partly cloudy','wx.3':'Overcast',
  'wx.45':'Fog','wx.51':'Drizzle','wx.61':'Rain','wx.71':'Snow',
  'wx.80':'Showers','wx.85':'Snow showers','wx.95':'Thunderstorm','wx.other':'Variable'
 })
});
function normalize(value){return value==='en'||value==='en-CA'?'en':'hu'}
function read(){
 try{return normalize(w.localStorage?.getItem(KEY))}catch(_){return DEFAULT}
}
let language=read();
function t(key){return dict[language][key]||dict.hu[key]||key}
function apply(root){
 if(!d?.querySelectorAll)return;
 const scope=root||d;
 if(scope.querySelectorAll){
  scope.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n');if(k&&t(k))el.textContent=t(k)});
  scope.querySelectorAll('[data-i18n-aria]').forEach(el=>{const k=el.getAttribute('data-i18n-aria');if(k)el.setAttribute('aria-label',t(k))});
  scope.querySelectorAll('[data-i18n-title]').forEach(el=>{const k=el.getAttribute('data-i18n-title');if(k)el.title=t(k)});
 }
 if(d.documentElement)d.documentElement.lang=language==='en'?'en-CA':'hu-HU';
 if(d.querySelectorAll)d.querySelectorAll('[data-sh9-lang]').forEach(el=>{
  const selected=el.getAttribute('data-sh9-lang')===language;
  el.setAttribute('aria-pressed',String(selected));
  el.setAttribute('aria-label',t('lang.'+el.getAttribute('data-sh9-lang')));
  el.title=t('lang.'+el.getAttribute('data-sh9-lang'));
 });
}
function notify(){
 try{w.dispatchEvent(new CustomEvent('sh9:languagechange',{detail:{language,locale:locale()}}))}catch(_){}
}
function setLanguage(next){
 const v=normalize(next);
 if(v===language){apply();return language}
 language=v;
 try{w.localStorage?.setItem(KEY,v)}catch(_){}
 apply();notify();
 return language;
}
function locale(){return language==='en'?'en-CA':'hu-HU'}
function date(value,options){return new Intl.DateTimeFormat(locale(),options).format(value)}
function init(){
 apply();
 if(d.querySelectorAll)d.querySelectorAll('[data-sh9-lang]').forEach(button=>{
  button.addEventListener('click',()=>setLanguage(button.getAttribute('data-sh9-lang')));
 });
 notify();
}
w.SH9_I18N_V1=Object.freeze({version:'1',storageKey:KEY,getLanguage:()=>language,setLanguage,t,locale,date,apply,translations:dict});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.addEventListener?.('storage',e=>{
 if(e.key===KEY){language=normalize(e.newValue);apply();notify()}
});
})(window,document);
