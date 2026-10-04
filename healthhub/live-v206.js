(function(){
'use strict';

/* HealthHub v1.206 — profile-aware home hero only.
   Category/subpage heroes intentionally remain untouched.
   The existing live HTML layers for name, date, weather and nameday stay active. */

var STYLE_ID='hh-v206-home-hero-style';

function currentProfile(){
  return localStorage.getItem('hh-profile')==='m'?'m':'z';
}

function addStyle(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=
    '#heroHome{height:248px!important;background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important;isolation:isolate;}'+
    '#heroHome .person{display:none!important;}'+
    '#heroHome .heroBtns{display:none!important;}'+
    '#heroHome:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(8,35,60,.60) 0%,rgba(8,35,60,.39) 27%,rgba(8,35,60,.10) 47%,rgba(8,35,60,0) 62%);}'+
    'html[data-hh-home-profile="m"] #heroHome:before{background:linear-gradient(90deg,rgba(84,34,63,.55) 0%,rgba(107,45,79,.34) 27%,rgba(107,45,79,.08) 48%,rgba(107,45,79,0) 62%);}'+
    'html[data-hh-home-profile="z"] #heroHome:before{background:linear-gradient(90deg,rgba(5,40,72,.59) 0%,rgba(8,55,91,.38) 27%,rgba(8,55,91,.09) 48%,rgba(8,55,91,0) 62%);}'+
    '#heroHome .heroCopy{left:20px!important;right:155px!important;top:73px!important;z-index:4!important;text-shadow:0 2px 7px rgba(0,0,0,.42)!important;}'+
    '#heroHome .heroCopy h1{font-size:31px!important;line-height:.98!important;font-weight:900!important;margin:0!important;}'+
    '#heroHome .heroCopy .screenTitle{font-size:21px!important;font-weight:850!important;margin-top:5px!important;}'+
    '#heroHome .heroCopy .date{font-size:12.5px!important;font-weight:760!important;margin-top:7px!important;}'+
    '#heroHome .heroCopy .weather,#heroHome .heroCopy .nameday{font-size:12.5px!important;font-weight:780!important;}'+
    '#heroHome .profileHit{z-index:7!important;}'+
    '@media(max-width:380px){#heroHome{height:236px!important}#heroHome .heroCopy{left:16px!important;right:145px!important;top:69px!important}#heroHome .heroCopy h1{font-size:28px!important}#heroHome .heroCopy .screenTitle{font-size:19px!important}}';
  document.head.appendChild(s);
}

function applyHomeHero(){
  addStyle();
  var hero=document.getElementById('heroHome');
  if(!hero)return;

  var p=currentProfile();
  var data=p==='m'?window.HH_HOME_HERO_M_V206:window.HH_HOME_HERO_Z_V206;
  if(!data)return;

  document.documentElement.dataset.hhHomeProfile=p;
  hero.style.setProperty('background-image','url("data:image/webp;base64,'+data+'")','important');
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center top','important');
  hero.style.setProperty('background-repeat','no-repeat','important');

  /* Keep the dynamic text layer exactly as the app already maintains it. */
  var person=document.getElementById('personHome');
  if(person)person.style.setProperty('display','none','important');

  document.documentElement.dataset.healthhubHomeHero='v206';
}

function hookProfileSwitch(){
  var original=window.setProfile;
  if(typeof original==='function'&&!original.__hhV206){
    var wrapped=function(){
      var r=original.apply(this,arguments);
      setTimeout(applyHomeHero,0);
      setTimeout(applyHomeHero,90);
      return r;
    };
    wrapped.__hhV206=true;
    window.setProfile=wrapped;
  }

  var name=document.getElementById('nameHome');
  if(name&&!name.__hhV206Observer){
    name.__hhV206Observer=true;
    new MutationObserver(function(){setTimeout(applyHomeHero,0)}).observe(name,{childList:true,subtree:true,characterData:true});
  }

  window.addEventListener('storage',function(e){
    if(e.key==='hh-profile')applyHomeHero();
  });
}

function boot(){
  addStyle();
  applyHomeHero();
  hookProfileSwitch();
  setTimeout(applyHomeHero,120);
  setTimeout(applyHomeHero,500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.addEventListener('focus',function(){setTimeout(applyHomeHero,60)});
window.HH_LIVE_BUILD='v1.206-profile-home-hero';
})();