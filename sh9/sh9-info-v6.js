/* SH9 v6 · live public info cells. Only public namedays/weather.
 * Private calendar data intentionally not fetched without dedicated consent/OAuth.
 * Never pretend that the chat calendar connector gives this public site access.
 */
(function(){
 'use strict';
 var region=document.getElementById('sh9InfoBar6');
 if(!region)return;
 var dateEl=document.getElementById('sh9Date6');
 var nameEl=document.getElementById('sh9Nameday6');
 var weatherEl=document.getElementById('sh9Weather6');
 var weatherSub=document.getElementById('sh9WeatherDetail6');
 var weatherCell=document.getElementById('sh9WeatherCell6');
 var tz='Europe/Budapest';
 function budapestParts(now){
  var iso=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  var p={};iso.forEach(function(o){if(o.type!=='literal')p[o.type]=Number(o.value)});
  return p;
 }
 function setDate(){
  var now=new Date();
  dateEl.textContent=new Intl.DateTimeFormat('hu-HU',{timeZone:tz,month:'long',day:'numeric',weekday:'short'}).format(now);
  return budapestParts(now);
 }
 var currentDay='';
 var namedayData=null;
 function showNameday(p){
  var k=p.month+'-'+p.day;
  if(k===currentDay&&nameEl.textContent!=='Névnap betöltése…')return;
  currentDay=k;
  var names=namedayData&&namedayData.namedays&&namedayData.namedays[String(p.month)]&&namedayData.namedays[String(p.month)][String(p.day)];
  nameEl.textContent=Array.isArray(names)&&names.length?names.join(', ')+' névnap':'Névnap nem elérhető';
 }
 async function fetchNamedays(){
  try{
   var r=await fetch('../healthhub/data/namedays.json',{cache:'force-cache'});
   if(!r.ok)throw new Error('nameday');
   namedayData=await r.json();
   currentDay='';
   showNameday(setDate());
  }catch(e){nameEl.textContent='Névnap nem elérhető';}
 }
 function weatherLabel(c){
  if(c===0)return 'Derült';
  if(c===1)return 'Többnyire derült';
  if(c===2)return 'Részben felhős';
  if(c===3)return 'Borult';
  if(c===45||c===48)return 'Köd';
  if([51,53,55,56,57].includes(c))return 'Szitálás';
  if([61,63,65,66,67].includes(c))return 'Eső';
  if([71,73,75,77].includes(c))return 'Havazás';
  if([80,81,82].includes(c))return 'Zápor';
  if([85,86].includes(c))return 'Hózápor';
  if([95,96,99].includes(c))return 'Zivatar';
  return 'Változó';
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
   var url='https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,weather_code,is_day&timezone=Europe%2FBudapest';
   var r=await fetch(url,{cache:'no-store'});
   if(!r.ok)throw new Error('weather '+r.status);
   var j=await r.json(),cur=j.current||{};
   if(!Number.isFinite(cur.temperature_2m)||!Number.isFinite(cur.weather_code))throw new Error('missing measurements');
   weatherEl.textContent=weatherEmoji(cur.weather_code,cur.is_day===1)+' '+Math.round(cur.temperature_2m)+'°C';
   weatherSub.textContent=weatherLabel(cur.weather_code)+' · Budapest';
   weatherCell.dataset.status='ready';
   weatherCell.title='Open-Meteo · '+new Intl.DateTimeFormat('hu-HU',{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(new Date());
  }catch(e){
   weatherEl.textContent='Nem elérhető';
   weatherSub.textContent='Budapest · nincs friss adat';
   weatherCell.dataset.status='error';
   weatherCell.title='Az élő időjárás lekérése sikertelen';
  }
 }
 function tick(){
  var p=setDate();
  if(currentDay!==p.month+'-'+p.day)showNameday(p);
 }
 tick();fetchNamedays();refreshWeather();
 setInterval(tick,60*1000);
 setInterval(refreshWeather,10*60*1000);
 document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();refreshWeather()}});
})();
