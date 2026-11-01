/* SH9 v6 · live public info cells. Only public namedays/weather.
 * Private calendar data intentionally not fetched without dedicated consent/OAuth.
 * Never pretend that the chat calendar connector gives this public site access.
 */
(function(){
 'use strict';
 var region=document.getElementById('sh9InfoBar6');
 if(!region)return;
 var dateEl=document.getElementById('sh9Date6');
 var nameEl=document.getElementById('sh9NamedayValue6');
 var weatherEl=document.getElementById('sh9Weather6');
 var weatherSub=document.getElementById('sh9WeatherDetail6');
 var weatherCell=document.getElementById('sh9WeatherCell6');
 var tz='Europe/Budapest';
 var lang=()=>window.SH9_I18N_V1;
 var tr=(key,fallback)=>lang()?.t(key)||fallback;
 var fmtLocale=()=>lang()?.locale()||'hu-HU';
 function budapestParts(now){
  var iso=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  var p={};iso.forEach(function(o){if(o.type!=='literal')p[o.type]=Number(o.value)});
  return p;
 }
 function setDate(){
  var now=new Date();
  dateEl.textContent=new Intl.DateTimeFormat(fmtLocale(),{timeZone:tz,month:'long',day:'numeric',weekday:'short'}).format(now);
  return budapestParts(now);
 }
 var currentDay='';
 var namedayData=null;
 function showNameday(p){
  var k=p.month+'-'+p.day;
  if(k===currentDay&&nameEl.textContent!=='betöltés…')return;
  currentDay=k;
  var names=namedayData&&namedayData.namedays&&namedayData.namedays[String(p.month)]&&namedayData.namedays[String(p.month)][String(p.day)];
  nameEl.textContent=Array.isArray(names)&&names.length?names.join(', '):tr('nameday.unavailable','nem elérhető');
 }
 async function fetchNamedays(){
  try{
   var r=await fetch('../healthhub/data/namedays.json',{cache:'force-cache'});
   if(!r.ok)throw new Error('nameday');
   namedayData=await r.json();
   currentDay='';
   showNameday(setDate());
  }catch(e){nameEl.textContent=tr('nameday.unavailable','nem elérhető');}
 }
 function weatherLabel(c){
  var code=c===0?'0':c===1?'1':c===2?'2':c===3?'3':c===45||c===48?'45':
   [51,53,55,56,57].includes(c)?'51':[61,63,65,66,67].includes(c)?'61':
   [71,73,75,77].includes(c)?'71':[80,81,82].includes(c)?'80':
   [85,86].includes(c)?'85':[95,96,99].includes(c)?'95':'other';
  var hu={'0':'Derült','1':'Többnyire derült','2':'Részben felhős','3':'Borult','45':'Köd','51':'Szitálás','61':'Eső','71':'Havazás','80':'Zápor','85':'Hózápor','95':'Zivatar',other:'Változó'};
  return tr('wx.'+code,hu[code]);
 }
  function weatherEmoji(c,day){
  if(c===0)return day?'☀️':'🌙';
  if([1,2].includes(c))return day?'🌤️':'☁️';
  if(c===3)return '☁️';
  if([45,48].includes(c))return '🌫️';
  if([51,53,55,56,57].includes(c))return '🌦️';
  if([61,63,65,66,67,80,81,82].includes(c))return '🌧️';
  if([71,73,75,77,85,86].includes(c))return '🌨️';
  if([95,96,99].includes(c))return '⛈️';
  return '🌤️';
 }
 async function refreshWeather(){
  try{
   var url='https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=Europe%2FBudapest&forecast_days=1';
   var r=await fetch(url,{cache:'no-store'});
   if(!r.ok)throw new Error('weather '+r.status);
   var j=await r.json(),cur=j.current||{};
   if(!Number.isFinite(cur.temperature_2m)||!Number.isFinite(cur.weather_code))throw new Error('missing measurements');
   weatherEl.textContent=weatherEmoji(cur.weather_code,cur.is_day===1)+' '+Math.round(cur.temperature_2m)+'°C';
   weatherSub.textContent=weatherLabel(cur.weather_code)+' · Budapest';
   weatherCell.dataset.status='ready';
   weatherCell.title='Open-Meteo · '+new Intl.DateTimeFormat(fmtLocale(),{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(new Date());
   /* Single source of truth for SH9's visual weather layer. */
   var wx={
    temp:cur.temperature_2m,code:cur.weather_code,isDay:cur.is_day===1,
    sunrise:j.daily&&j.daily.sunrise&&j.daily.sunrise[0]||null,
    sunset:j.daily&&j.daily.sunset&&j.daily.sunset[0]||null,
    observedAt:cur.time||null,receivedAt:new Date().toISOString(),
    source:'Open-Meteo',location:'Budapest'
   };
   window.SH9Weather=wx;
   window.dispatchEvent(new CustomEvent('sh9:weather',{detail:wx}));
  }catch(e){
   weatherEl.textContent=tr('wx.notAvailable','Nem elérhető');
   weatherSub.textContent=tr('wx.noData','Budapest · nincs friss adat');
   weatherCell.dataset.status='error';
   weatherCell.title=tr('wx.error','Az élő időjárás lekérése sikertelen');
   window.SH9Weather=null;
   window.dispatchEvent(new CustomEvent('sh9:weather-error'));
  }
 }
 function tick(){
  var p=setDate();
  if(currentDay!==p.month+'-'+p.day)showNameday(p);
 }
 window.addEventListener?.('sh9:languagechange',function(){
  setDate();
  if(nameEl.textContent==='nem elérhető'||nameEl.textContent==='unavailable')
   nameEl.textContent=tr('nameday.unavailable','nem elérhető');
  if(weatherCell.dataset.status==='ready'&&window.SH9Weather)
   weatherSub.textContent=weatherLabel(window.SH9Weather.code)+' · Budapest';
  else if(weatherCell.dataset.status==='error'){
   weatherEl.textContent=tr('wx.notAvailable','Nem elérhető');
   weatherSub.textContent=tr('wx.noData','Budapest · nincs friss adat');
   weatherCell.title=tr('wx.error','Az élő időjárás lekérése sikertelen');
  }
 });
 tick();fetchNamedays();refreshWeather();
 setInterval(tick,60*1000);
 setInterval(refreshWeather,10*60*1000);
 document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();refreshWeather()}});
})();
