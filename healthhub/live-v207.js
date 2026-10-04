(function(){
'use strict';

/* HealthHub v1.212 — remove legacy heroCopy overlay.
   HOME only. HealthRadar/Timeline/Activity/category heroes remain untouched.
   Existing dynamic HOME layers remain live: name, HealthHub title, date, weather and nameday. */

var STYLE_ID='hh-v212-home-hero-style';
function profile(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}

function style(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=
    '#heroHome{height:198px!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;isolation:isolate;}'+
    '#heroHome #personHome{display:none!important;}'+
    '#heroHome .heroBtns{display:none!important;}'+
    '#heroHome:before{content:none!important;display:none!important;background:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}'+
    '#heroHome .heroCopy::before,#heroHome .heroCopy::after{content:none!important;display:none!important;background:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}'+
    '#heroHome .heroCopy{left:20px!important;right:155px!important;top:42px!important;z-index:4!important;text-shadow:0 2px 7px rgba(0,0,0,.52)!important;padding:0!important;border-radius:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;box-shadow:none!important;background:transparent!important;}'+
    '#heroHome .heroCopy h1{font-size:28px!important;line-height:.98!important;font-weight:900!important;margin:0!important;}'+
    '#heroHome .heroCopy .screenTitle{font-size:20px!important;font-weight:850!important;margin-top:4px!important;}'+
    '#heroHome .heroCopy .date{font-size:12px!important;font-weight:760!important;margin-top:6px!important;}'+
    '#heroHome .heroCopy .weather,#heroHome .heroCopy .nameday{font-size:12px!important;font-weight:780!important;}'+
    '#heroHome .profileHit{z-index:7!important;}'+
    '@media(max-width:380px){#heroHome .heroCopy{left:16px!important;right:142px!important;top:40px!important}#heroHome .heroCopy h1{font-size:26px!important}#heroHome .heroCopy .screenTitle{font-size:19px!important}}';
  document.head.appendChild(s);
}

function apply(){
  style();
  var hero=document.getElementById('heroHome'); if(!hero)return;
  var p=profile();
  var b64=p==='m'?window.HH_HOME_HERO_M_V207:window.HH_HOME_HERO_Z_V209;
  if(!b64)return;
  document.documentElement.dataset.hhHomeProfile=p;
  hero.style.setProperty('background-image','url("data:image/webp;base64,'+b64+'")','important');
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center center','important');
  hero.style.setProperty('background-repeat','no-repeat','important');
  var person=document.getElementById('personHome');
  if(person)person.style.setProperty('display','none','important');
  document.documentElement.dataset.healthhubHomeHero='v212';
}

function hooks(){
  var original=window.setProfile;
  if(typeof original==='function'&&!original.__hhV212){
    var wrapped=function(){var r=original.apply(this,arguments);setTimeout(apply,0);setTimeout(apply,100);return r};
    wrapped.__hhV212=true;window.setProfile=wrapped;
  }
  var name=document.getElementById('nameHome');
  if(name&&!name.__hhV212Observer){
    name.__hhV212Observer=true;
    new MutationObserver(function(){setTimeout(apply,0)}).observe(name,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('storage',function(e){if(e.key==='hh-profile')apply()});
}

function boot(){style();apply();hooks();setTimeout(apply,120);setTimeout(apply,450)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
window.addEventListener('focus',function(){setTimeout(apply,50)});
window.HH_LIVE_BUILD='v1.212-home-hero-no-overlay';
})();