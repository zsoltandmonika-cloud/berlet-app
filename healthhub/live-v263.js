(function(){
'use strict';
/* HealthHub v263 — visible one-click profile switch on HealthRadar main landing hero. */

function currentCode(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function currentName(){return currentCode()==='m'?'Mónika':'Zsolt'}
function otherName(){return currentCode()==='m'?'Zsolt':'Mónika'}

function ensureStyle(){
  if(document.getElementById('hhHealthMainSwitchStyle263'))return;
  var s=document.createElement('style');
  s.id='hhHealthMainSwitchStyle263';
  s.textContent=
    '#heroH .hhHealthMainSwitch263{position:absolute;left:16px;bottom:14px;z-index:12;display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.82);border-radius:999px;padding:7px 11px;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 5px 16px rgba(25,58,82,.14);color:var(--a);font:900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.01em;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:transform .12s ease,box-shadow .12s ease}'+
    '#heroH .hhHealthMainSwitch263 .hh263Swap{font-size:14px;line-height:1}'+
    '#heroH .hhHealthMainSwitch263:active{transform:scale(.96);box-shadow:0 3px 10px rgba(25,58,82,.12)}'+
    '#heroH .hhHealthMainSwitch263:focus-visible{outline:2px solid var(--a);outline-offset:2px}';
  document.head.appendChild(s);
}

function paint(){
  ensureStyle();
  var hero=document.getElementById('heroH');
  if(!hero)return;
  var btn=hero.querySelector('.hhHealthMainSwitch263');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='hhHealthMainSwitch263';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      toggle();
    },true);
    hero.appendChild(btn);
  }
  btn.innerHTML='<span>'+currentName()+'</span><span class="hh263Swap" aria-hidden="true">⇄</span>';
  btn.title='Váltás '+otherName()+' profiljára';
  btn.setAttribute('aria-label','Egy kattintás: váltás '+otherName()+' profiljára');
}

function toggle(){
  var next=currentCode()==='m'?'z':'m';
  if(typeof window.hhSetActiveProfile==='function')window.hhSetActiveProfile(next,{source:'health-main'});
  else if(typeof window.setProfile==='function')window.setProfile(next,{source:'health-main'});
  else localStorage.setItem('hh-profile',next);

  /* v127 owns the HealthRadar landing counters; refresh them immediately too. */
  Promise.resolve().then(function(){
    if(typeof window.hhSyncFullMigrationDashboard==='function')return window.hhSyncFullMigrationDashboard();
  }).catch(function(e){console.warn('HealthRadar main profile refresh',e)});
  setTimeout(paint,20);
  setTimeout(paint,140);
  return false;
}

window.hhHealthMainToggle263=toggle;

/* Hero can be reconstructed by older live patches, so re-decorate after show/profile changes. */
window.addEventListener('healthhub:profile-changed',function(){setTimeout(paint,20)});

var prevShow=window.show;
if(typeof prevShow==='function'){
  window.show=function(id){
    var r=prevShow.apply(this,arguments);
    if(id==='health')setTimeout(paint,20);
    return r;
  };
}

var hero=document.getElementById('heroH');
if(hero&&window.MutationObserver){
  var mo=new MutationObserver(function(){
    if(!hero.querySelector('.hhHealthMainSwitch263'))setTimeout(paint,0);
  });
  mo.observe(hero,{childList:true});
}

paint();
setTimeout(paint,250);
setTimeout(paint,900);

document.documentElement.dataset.healthhubHealthMainSwitch='1.263';
window.HH_LIVE_BUILD='v263-health-main-one-click-profile';
})();