(function(){
'use strict';

/* HealthHub v1.224 — clean shared Timeline hero.
   Only "Zsolt Timeline" / "Mónika Timeline" remains visible in the hero,
   with direct one-click profile switching. */

var HERO='./assets/timeline-hero-v222.webp?v=222';

function profile(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function profileName(){return profile()==='m'?'Mónika':'Zsolt'}

function ensureStyle(){
  if(document.getElementById('hh-v223-timeline-style'))return;
  var s=document.createElement('style');
  s.id='hh-v223-timeline-style';
  s.textContent=
    '#heroT .heroBtns,#heroT #personT,#heroT .heroCopy .screenTitle,#heroT .heroCopy .date,#heroT .heroCopy .weather,#heroT .heroCopy .nameday{display:none!important}'+
    '#heroT .heroCopy{left:165px!important;right:12px!important;top:18px!important;z-index:8!important;text-shadow:0 2px 7px rgba(0,0,0,.38)!important}'+
    '#heroT .heroCopy h1{font-size:0!important;line-height:1.1!important;margin:0!important;font-weight:900!important;white-space:nowrap!important}'+
    '#heroT .heroCopy h1::after{content:attr(data-hh-title);font-size:22px!important;line-height:1.1!important}'+
    '#heroT .profileHit{left:0!important;top:0!important;width:100%!important;height:100%!important;z-index:7!important;cursor:pointer!important}'+
    '@media(max-width:380px){#heroT .heroCopy{left:145px!important;right:8px!important;top:16px!important}#heroT .heroCopy h1::after{font-size:20px!important}}';
  document.head.appendChild(s);
}

function paintTimelineHero(){
  var hero=document.getElementById('heroT');
  if(!hero)return;
  ensureStyle();

  hero.style.setProperty(
    'background-image',
    'linear-gradient(180deg,rgba(7,38,61,.10),rgba(6,34,58,.38)),url("'+HERO+'")',
    'important'
  );
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center center','important');
  hero.style.setProperty('background-repeat','no-repeat','important');
  hero.classList.remove('night','evening');

  var name=document.getElementById('nameT');
  if(name){
    var title=profileName()+' Timeline';
    name.textContent=title;
    name.setAttribute('data-hh-title',title);
    name.setAttribute('aria-label',title);
  }

  document.documentElement.dataset.healthhubTimelineHero='v224-lena-clean';
}

function bindDirectTimelineToggle(){
  var hit=document.querySelector('#heroT .profileHit');
  if(!hit||hit.__hhTimelineDirectToggle)return;
  hit.__hhTimelineDirectToggle=true;
  hit.setAttribute('aria-label','Profilváltás egy kattintással');
  hit.title='Profilváltás';
  hit.onclick=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    var next=profile()==='m'?'z':'m';
    if(typeof window.setProfile==='function')window.setProfile(next);
    else localStorage.setItem('hh-profile',next);
    setTimeout(paintTimelineHero,0);
    return false;
  };
}

paintTimelineHero();
bindDirectTimelineToggle();
setTimeout(function(){paintTimelineHero();bindDirectTimelineToggle()},80);
setTimeout(function(){paintTimelineHero();bindDirectTimelineToggle()},500);

var prevSetProfile=window.setProfile;
if(typeof prevSetProfile==='function'){
  window.setProfile=function(){
    var r=prevSetProfile.apply(this,arguments);
    setTimeout(function(){paintTimelineHero();bindDirectTimelineToggle()},20);
    return r;
  };
}

window.addEventListener('focus',function(){setTimeout(function(){paintTimelineHero();bindDirectTimelineToggle()},30)});
window.HH_LIVE_BUILD='v1.224-timeline-title-lock';
})();