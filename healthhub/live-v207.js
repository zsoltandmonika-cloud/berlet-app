(function(){
'use strict';

/* HealthHub v1.208 — HOME hero hotfix.
   HOME only. HealthRadar/Timeline/Activity/category heroes remain untouched.
   Existing dynamic HOME layers remain live: name, HealthHub title, date, weather and nameday. */

var STYLE_ID='hh-v208-home-hero-style';
var SAFE_Z='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';

function profile(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}

function style(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=
    '#heroHome{height:198px!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;isolation:isolate;}'+
    '#heroHome #personHome{display:none!important;}'+
    '#heroHome .heroBtns{display:none!important;}'+
    '#heroHome:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;}'+
    'html[data-hh-home-profile="m"] #heroHome:before{background:linear-gradient(90deg,rgba(91,35,67,.55) 0%,rgba(104,46,77,.34) 28%,rgba(104,46,77,.08) 48%,rgba(104,46,77,0) 62%);}'+
    'html[data-hh-home-profile="z"] #heroHome:before{background:linear-gradient(90deg,rgba(4,39,70,.58) 0%,rgba(7,54,91,.36) 28%,rgba(7,54,91,.08) 48%,rgba(7,54,91,0) 62%);}'+
    '#heroHome .heroCopy{left:20px!important;right:155px!important;top:42px!important;z-index:4!important;text-shadow:0 2px 7px rgba(0,0,0,.44)!important;}'+
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
  var b64=p==='m'?window.HH_HOME_HERO_M_V207:SAFE_Z;
  if(!b64)return;
  document.documentElement.dataset.hhHomeProfile=p;
  hero.style.setProperty('background-image','url("data:image/webp;base64,'+b64+'")','important');
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center center','important');
  hero.style.setProperty('background-repeat','no-repeat','important');
  var person=document.getElementById('personHome');
  if(person)person.style.setProperty('display','none','important');
  document.documentElement.dataset.healthhubHomeHero='v208';
}

function hooks(){
  var original=window.setProfile;
  if(typeof original==='function'&&!original.__hhV208){
    var wrapped=function(){var r=original.apply(this,arguments);setTimeout(apply,0);setTimeout(apply,100);return r};
    wrapped.__hhV208=true;window.setProfile=wrapped;
  }
  var name=document.getElementById('nameHome');
  if(name&&!name.__hhV208Observer){
    name.__hhV208Observer=true;
    new MutationObserver(function(){setTimeout(apply,0)}).observe(name,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('storage',function(e){if(e.key==='hh-profile')apply()});
}

function boot(){style();apply();hooks();setTimeout(apply,120);setTimeout(apply,450)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
window.addEventListener('focus',function(){setTimeout(apply,50)});
window.HH_LIVE_BUILD='v1.208-home-hero-hotfix';
})();