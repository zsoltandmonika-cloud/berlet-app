(function(){
'use strict';

/* HealthHub v1.215 — Budapest weather + Timeline sunset/daypart controller.
   Fresh current weather + sunrise/sunset from one Open-Meteo call. */

var CACHE_KEY='hh-budapest-weather-v144';
var state=null;
var REFRESH_MS=10*60*1000;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function minOfDay(d){return d.getHours()*60+d.getMinutes()}
function isoToLocalMin(iso){if(!iso)return null;var d=new Date(iso);return isNaN(d)?null:minOfDay(d)}
function weatherKind(c){
  if(c===0)return'clear';
  if([1,2].includes(c))return'partly';
  if(c===3)return'cloudy';
  if([45,48].includes(c))return'fog';
  if([51,53,55,56,57].includes(c))return'drizzle';
  if([61,63,65,66,67,80,81,82].includes(c))return'rain';
  if([71,73,75,77,85,86].includes(c))return'snow';
  if([95,96,99].includes(c))return'storm';
  return'partly';
}
function weatherLabel(c){
  if(c===0)return'Derült';
  if(c===1)return'Többnyire derült';
  if(c===2)return'Részben felhős';
  if(c===3)return'Borult';
  if([45,48].includes(c))return'Köd';
  if([51,53,55,56,57].includes(c))return'Szitálás';
  if([61,63,65,66,67].includes(c))return'Eső';
  if([71,73,75,77].includes(c))return'Havazás';
  if([80,81,82].includes(c))return'Zápor';
  if([85,86].includes(c))return'Hózápor';
  if([95,96,99].includes(c))return'Zivatar';
  return'Változó';
}
function icon(c,isDay){
  var k=weatherKind(c),day=Number(isDay)===1;
  if(k==='clear')return day?'☀️':'🌙';
  if(k==='partly')return day?'🌤️':'☁️';
  if(k==='cloudy')return'☁️';
  if(k==='fog')return'🌫️';
  if(k==='drizzle')return'🌦️';
  if(k==='rain')return'🌧️';
  if(k==='snow')return'🌨️';
  if(k==='storm')return'⛈️';
  return day?'🌤️':'☁️';
}
function daypart(){
  var now=new Date(),m=minOfDay(now);
  if(!state)return m>=300&&m<1080?'day':m>=1080&&m<1290?'evening':'night';
  var rise=isoToLocalMin(state.sunrise),set=isoToLocalMin(state.sunset);
  if(rise==null||set==null)return m>=300&&m<1080?'day':m>=1080&&m<1290?'evening':'night';
  if(m<rise||m>=set)return'night';
  if(m>=Math.max(rise,set-60))return'evening';
  return'day';
}
function season(){var m=new Date().getMonth()+1;return m<=2||m===12?'winter':m<=5?'spring':m<=8?'summer':'autumn'}
function profile(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function bgFor(p,part){
  try{return HERO_BG[p]&&HERO_BG[p][season()]&&(HERO_BG[p][season()][part]||HERO_BG[p][season()].day)}catch(e){return null}
}
function render(){
  var dp=daypart(),bg=bgFor(profile(),dp);
  if(bg)document.documentElement.style.setProperty('--hero','url("'+bg+'")');
  ['heroT'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.classList.remove('night','evening');
    if(dp==='night')el.classList.add('night');
    else if(dp==='evening')el.classList.add('evening');
    el.dataset.daypart=dp;
  });
  document.documentElement.dataset.healthhubDaypart=dp;

  if(state){
    var html='<span class="weatherIcon" aria-hidden="true">'+icon(state.code,state.isDay)+'</span>'+
      '<span>'+Math.round(state.temp)+'°C</span>'+
      '<span class="weatherSep">·</span>'+
      '<span>'+esc(weatherLabel(state.code))+'</span>';
    ['weatherHome','weatherT','weatherH'].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML=html});
  }
}
function loadCache(){
  try{
    var x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(x&&x.fetchedAt&&Date.now()-new Date(x.fetchedAt).getTime()<6*60*60*1000)state=x;
  }catch(e){}
}
async function refresh(){
  try{
    var url='https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=sunrise,sunset&timezone=Europe%2FBudapest&forecast_days=1';
    var r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error('weather');
    var j=await r.json();
    state={
      temp:j.current&&j.current.temperature_2m,
      apparent:j.current&&j.current.apparent_temperature,
      code:j.current&&j.current.weather_code,
      isDay:j.current&&j.current.is_day,
      wind:j.current&&j.current.wind_speed_10m,
      sunrise:j.daily&&j.daily.sunrise&&j.daily.sunrise[0],
      sunset:j.daily&&j.daily.sunset&&j.daily.sunset[0],
      fetchedAt:new Date().toISOString()
    };
    localStorage.setItem(CACHE_KEY,JSON.stringify(state));
    render();
  }catch(e){
    console.warn('HealthHub Budapest weather refresh failed',e);
    render();
  }
}

loadCache();
render();
refresh();
setInterval(refresh,REFRESH_MS);
setInterval(render,60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});

var oldSet=window.setProfile;
if(typeof oldSet==='function'){
  window.setProfile=function(){
    var r=oldSet.apply(this,arguments);
    setTimeout(render,0);
    return r;
  };
}

document.documentElement.dataset.healthhubWeather='1.215-home-static';
window.HH_LIVE_BUILD='v1.215-weather-home-static';
})();