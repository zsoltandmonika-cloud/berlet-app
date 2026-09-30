(function(){
'use strict';

/* HealthHub v1.43 — sunset-aware Home hero daypart hotfix.
   Uses Budapest sunrise/sunset instead of the old fixed 18:00 / 21:30 cutoffs. */

var SUN_KEY='hh-budapest-sun-v1';
var sun=null;

function minuteOfDay(d){return d.getHours()*60+d.getMinutes()}
function localMinutes(iso){
  if(!iso)return null;
  var d=new Date(iso);
  if(Number.isNaN(d.getTime()))return null;
  return d.getHours()*60+d.getMinutes();
}
function loadSun(){
  try{
    var x=JSON.parse(localStorage.getItem(SUN_KEY)||'null');
    if(x&&x.date===new Date().toISOString().slice(0,10))sun=x;
  }catch(e){}
}
async function refreshSun(){
  try{
    var r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&daily=sunrise,sunset&timezone=Europe%2FBudapest&forecast_days=1',{cache:'no-store'});
    if(!r.ok)throw new Error('sun');
    var j=await r.json();
    var rise=j.daily&&j.daily.sunrise&&j.daily.sunrise[0];
    var set=j.daily&&j.daily.sunset&&j.daily.sunset[0];
    if(!rise||!set)throw new Error('sun');
    sun={date:new Date().toISOString().slice(0,10),sunrise:rise,sunset:set,updatedAt:new Date().toISOString()};
    localStorage.setItem(SUN_KEY,JSON.stringify(sun));
    applySunHero();
  }catch(e){ console.warn('HealthHub sunset refresh failed',e); }
}
function fallbackPart(){
  var m=minuteOfDay(new Date());
  return (m>=300&&m<1080)?'day':(m>=1080&&m<1290)?'evening':'night';
}
function realPart(){
  var now=new Date(),m=minuteOfDay(now),rise=sun?localMinutes(sun.sunrise):null,set=sun?localMinutes(sun.sunset):null;
  if(rise==null||set==null)return fallbackPart();
  if(m<rise||m>=set)return 'night';
  if(m>=Math.max(rise,set-60))return 'evening';
  return 'day';
}
function currentProfile(){
  return localStorage.getItem('hh-profile')==='m'?'m':'z';
}
function currentSeason(){
  var m=new Date().getMonth()+1;
  return (m>=3&&m<=5)?'spring':(m>=6&&m<=8)?'summer':(m>=9&&m<=11)?'autumn':'winter';
}
function bgFor(profile,part){
  try{
    return HERO_BG[profile]&&HERO_BG[profile][currentSeason()]&&
      (HERO_BG[profile][currentSeason()][part]||HERO_BG[profile][currentSeason()].day);
  }catch(e){ return null; }
}
function applySunHero(){
  var part=realPart(),profile=currentProfile(),bg=bgFor(profile,part);
  if(bg)document.documentElement.style.setProperty('--hero','url("'+bg+'")');
  ['heroHome','heroT'].forEach(function(id){
    var h=document.getElementById(id);if(!h)return;
    h.classList.remove('night','evening');
    if(part==='night')h.classList.add('night');
    else if(part==='evening')h.classList.add('evening');
    h.dataset.daypart=part;
  });
  /* heroH is HealthRadar's approved static medical hero and should not be changed. */
  document.documentElement.dataset.healthhubDaypart=part;
}

/* Keep the original global helpers aligned for profile changes and legacy code. */
try{
  window.daypart=function(){return realPart()};
}catch(e){}

var oldSet=window.setProfile;
if(typeof oldSet==='function'){
  window.setProfile=function(){
    var r=oldSet.apply(this,arguments);
    setTimeout(applySunHero,0);
    return r;
  };
}

loadSun();
applySunHero();
refreshSun();
setInterval(applySunHero,60000);
setInterval(refreshSun,21600000);

document.documentElement.dataset.healthhubSunsetHero='1.43';
window.HH_LIVE_BUILD='v1.43-sunset-aware-hero';
})();