(function(){
'use strict';

/* HealthHub v1.215 — single-source static HOME hero.
   HOME has exactly two images: Léna+Zsolt and Léna+Mónika.
   Seasonal/daypart/weather logic must never change HOME background. */

var STYLE_ID='hh-v215-home-hero-style';
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
    '#heroHome .heroCopy{left:10px!important;right:155px!important;top:42px!important;z-index:4!important;text-shadow:0 2px 7px rgba(0,0,0,.52)!important;padding:0!important;border-radius:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;box-shadow:none!important;background:transparent!important;}'+
    '#heroHome .heroCopy h1{font-size:28px!important;line-height:.98!important;font-weight:900!important;margin:0!important;}'+
    '#heroHome .heroCopy .screenTitle{font-size:20px!important;font-weight:850!important;margin-top:4px!important;}'+
    '#heroHome .heroCopy .date{font-size:12px!important;font-weight:760!important;margin-top:6px!important;}'+
    '#heroHome .heroCopy .weather,#heroHome .heroCopy .nameday{font-size:12px!important;font-weight:780!important;}'+
    '#heroHome #weatherHome .weatherSep{display:none!important;}'+
    '#heroHome #weatherHome span:last-child{display:block!important;margin-top:1px!important;}'+
    '#heroHome .profileHit{z-index:7!important;}'+
    '@media(max-width:380px){#heroHome .heroCopy{left:8px!important;right:142px!important;top:40px!important}#heroHome .heroCopy h1{font-size:26px!important}#heroHome .heroCopy .screenTitle{font-size:19px!important}}';
  document.head.appendChild(s);
}

function heroUrl(p){
  return p==='m'
    ? './assets/hero-home-m-approved-v215.webp?v=215'
    : './assets/hero-home-z-approved-v215.webp?v=215';
}
function paint(p){
  var hero=document.getElementById('heroHome'); if(!hero)return;
  document.documentElement.dataset.hhHomeProfile=p;
  hero.style.setProperty('background-image','url("'+heroUrl(p)+'")','important');
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position',p==='z'?'46% center':'50% center','important');
  hero.style.setProperty('background-repeat','no-repeat','important');
  hero.classList.remove('night','evening');
  hero.removeAttribute('data-daypart');
  var person=document.getElementById('personHome');
  if(person){person.removeAttribute('src');person.style.setProperty('display','none','important');}
  document.documentElement.dataset.healthhubHomeHero='v215-static-two-profile';
}
function apply(){style();paint(profile())}

function hooks(){
  var original=window.setProfile;
  if(typeof original==='function'&&!original.__hhV215){
    var wrapped=function(){
      var p=arguments[0]==='m'?'m':arguments[0]==='z'?'z':profile();
      paint(p);
      var r=original.apply(this,arguments);
      paint(p);
      return r
    };
    wrapped.__hhV215=true;window.setProfile=wrapped;
  }
  var name=document.getElementById('nameHome');
  if(name&&!name.__hhV215Observer){
    name.__hhV215Observer=true;
    new MutationObserver(function(){setTimeout(apply,0)}).observe(name,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('storage',function(e){if(e.key==='hh-profile')apply()});
}

function boot(){style();apply();hooks();setTimeout(apply,120);setTimeout(apply,450)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
window.addEventListener('focus',function(){setTimeout(apply,50)});
window.HH_LIVE_BUILD='v1.217-zsolt-hero-right-shift';
})();