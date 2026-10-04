(function(){
'use strict';

/* HealthHub v1.207 — Mónika/Zsolt + Léna hero on HOME only.
   Timeline, HealthRadar and all category/subpage heroes stay on the previous hero system.
   Existing dynamic HOME layers remain live: profile name, date, weather and nameday. */

var STYLE_ID='hh-v207-home-hero-style';

function profile(){
  return localStorage.getItem('hh-profile')==='m'?'m':'z';
}

function style(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=
    '#heroHome{height:248px!important;background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important;isolation:isolate;}'+
    '#heroHome #personHome{display:none!important;}'+
    '#heroHome .heroBtns{display:none!important;}'+
    '#heroHome:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;}'+
    'html[data-hh-home-profile="m"] #heroHome:before{background:linear-gradient(90deg,rgba(91,35,67,.57) 0%,rgba(104,46,77,.37) 27%,rgba(104,46,77,.10) 47%,rgba(104,46,77,0) 62%);}'+
    'html[data-hh-home-profile="z"] #heroHome:before{background:linear-gradient(90deg,rgba(4,39,70,.60) 0%,rgba(7,54,91,.39) 27%,rgba(7,54,91,.10) 47%,rgba(7,54,91,0) 62%);}'+
    '#heroHome .heroCopy{left:20px!important;right:155px!important;top:73px!important;z-index:4!important;text-shadow:0 2px 7px rgba(0,0,0,.44)!important;}'+
    '#heroHome .heroCopy h1{font-size:31px!important;line-height:.98!important;font-weight:900!important;margin:0!important;}'+
    '#heroHome .heroCopy .screenTitle{font-size:21px!important;font-weight:850!important;margin-top:5px!important;}'+
    '#heroHome .heroCopy .date{font-size:12.5px!important;font-weight:760!important;margin-top:7px!important;}'+
    '#heroHome .heroCopy .weather,#heroHome .heroCopy .nameday{font-size:12.5px!important;font-weight:780!important;}'+
    '#heroHome .profileHit{z-index:7!important;}'+
    '@media(max-width:380px){#heroHome{height:236px!important}#heroHome .heroCopy{left:16px!important;right:143px!important;top:69px!important}#heroHome .heroCopy h1{font-size:28px!important}#heroHome .heroCopy .screenTitle{font-size:19px!important}}';
  document.head.appendChild(s);
}

function apply(){
  style();
  var hero=document.getElementById('heroHome');
  if(!hero)return;
  var p=profile();
  var b64=p==='m'?window.HH_HOME_HERO_M_V207:window.HH_HOME_HERO_Z_V207;
  if(!b64)return;

  document.documentElement.dataset.hhHomeProfile=p;
  hero.style.setProperty('background-image','url("data:image/webp;base64,'+b64+'")','important');
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center top','important');
  hero.style.setProperty('background-repeat','no-repeat','important');

  var person=document.getElementById('personHome');
  if(person)person.style.setProperty('display','none','important');

  document.documentElement.dataset.healthhubHomeHero='v207';
}

function hooks(){
  var original=window.setProfile;
  if(typeof original==='function'&&!original.__hhV207){
    var wrapped=function(){
      var r=original.apply(this,arguments);
      setTimeout(apply,0);
      setTimeout(apply,100);
      return r;
    };
    wrapped.__hhV207=true;
    window.setProfile=wrapped;
  }

  var name=document.getElementById('nameHome');
  if(name&&!name.__hhV207Observer){
    name.__hhV207Observer=true;
    new MutationObserver(function(){setTimeout(apply,0)}).observe(name,{
      childList:true,subtree:true,characterData:true
    });
  }

  window.addEventListener('storage',function(e){
    if(e.key==='hh-profile')apply();
  });
}

function boot(){
  style();
  apply();
  hooks();
  setTimeout(apply,120);
  setTimeout(apply,450);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.addEventListener('focus',function(){setTimeout(apply,50)});
window.HH_LIVE_BUILD='v1.207-home-profile-hero';
})();