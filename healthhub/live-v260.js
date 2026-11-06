(function(){
'use strict';
/* HealthHub v260 — canonical one-click profile controller.
   One source of truth for profile state, then refresh every visible profile-owned surface.
   Loaded last so older module wrappers cannot replace this controller afterwards. */

var switchSeq=0;
var refreshing=false;

function codeOf(p){
  return (p==='m'||p==='monika')?'m':'z';
}
function keyOf(code){return codeOf(code)==='m'?'monika':'zsolt'}
function nameOf(code){return codeOf(code)==='m'?'Mónika':'Zsolt'}
function currentCode(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function currentKey(){return keyOf(currentCode())}
function isOn(id){var el=document.getElementById(id);return !!(el&&el.classList.contains('on'))}
function callSafe(fn,args){
  try{
    if(typeof fn!=='function')return null;
    return fn.apply(window,args||[]);
  }catch(e){console.warn('HealthHub profile refresh',e);return null}
}
function syncCoreState(code){
  code=codeOf(code);
  localStorage.setItem('hh-profile',code);
  try{window.cur=code}catch(e){}
  try{if(typeof cur!=='undefined')cur=code}catch(e){}

  try{
    if(typeof apply==='function')apply();
    else if(typeof window.apply==='function')window.apply();
  }catch(e){console.warn('HealthHub base profile apply',e)}
  return code;
}
function dispatchProfileChanged(code,source){
  try{
    window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{
      detail:{code:code,profile:keyOf(code),name:nameOf(code),source:source||'canonical'}
    }));
  }catch(e){}
}

async function refreshVisibleProfileData(code,seq){
  code=codeOf(code);
  var profile=keyOf(code);
  if(seq!==switchSeq||currentCode()!==code||refreshing)return false;
  refreshing=true;
  try{
    /* Critical path: update only currently visible profile-owned surfaces.
       Cloud sync, profile repair and legacy wrapper work are deliberately excluded. */
    if(isOn('healthSection')&&typeof window.renderHealthSection==='function'){
      try{await window.renderHealthSection()}catch(e){console.warn('HealthHub HealthRadar rerender',e)}
    }
    if(isOn('hhActivityPage191')&&typeof window.hhRenderActivity191==='function'){
      try{await window.hhRenderActivity191(profile)}catch(e){console.warn('HealthHub Activity rerender',e)}
    }
    if(isOn('hhSleepPage')&&typeof window.hhRenderSleep==='function'){
      try{await window.hhRenderSleep(profile)}catch(e){console.warn('HealthHub Sleep rerender',e)}
    }
    document.documentElement.dataset.hhActiveProfile=code;
    document.documentElement.dataset.hhActiveProfileData=profile;
    return true;
  }finally{
    refreshing=false;
  }
}
function scheduleRefresh(code,seq){
  requestAnimationFrame(function(){refreshVisibleProfileData(code,seq)});
}

function canonicalSetProfile(p,options){
  var code=codeOf(p),source=options&&options.source||'one-click';
  if(code===currentCode()&&source!=='storage')return code;
  var seq=++switchSeq;
  /* v303: bypass the historical setProfile wrapper chain entirely. */
  syncCoreState(code);
  var overlay=document.getElementById('overlay');if(overlay)overlay.classList.remove('on');
  dispatchProfileChanged(code,source);
  scheduleRefresh(code,seq);
  return code;
}

function toggleProfile(source){
  return canonicalSetProfile(currentCode()==='m'?'z':'m',{source:source||'one-click-toggle'});
}

window.setProfile=canonicalSetProfile;
window.hhSwitchProfile=canonicalSetProfile;
window.hhSetActiveProfile=canonicalSetProfile;
window.hhToggleProfileOneClick=function(){return toggleProfile('global-toggle')};

if(typeof window.hh191Profile==='function'){
  window.hh191Profile=function(p){canonicalSetProfile(p,{source:'activity'});return false};
  window.hh191ToggleProfile=function(){toggleProfile('activity');return false};
}
if(typeof window.hhSleepToggleProfile==='function'){
  window.hhSleepToggleProfile=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    toggleProfile('sleep');
    return false;
  };
}

document.addEventListener('click',function(e){
  var choice=e.target&&e.target.closest?e.target.closest('#overlay .choice'):null;
  if(!choice)return;
  var label=String(choice.textContent||'').toLowerCase();
  var code=(label.indexOf('mónika')>=0||label.indexOf('monika')>=0)?'m':'z';
  e.preventDefault();
  e.stopPropagation();
  if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  canonicalSetProfile(code,{source:'picker'});
},true);

window.addEventListener('healthhub:health-cloud-synced',function(e){
  var detail=e&&e.detail||{};
  if(detail.profile&&detail.profile!==currentKey())return;
  var seq=switchSeq;
  setTimeout(function(){refreshVisibleProfileData(currentCode(),seq,'cloud')},30);
});

window.addEventListener('storage',function(e){
  if(e.key!=='hh-profile')return;
  var code=codeOf(e.newValue);
  var seq=++switchSeq;
  syncCoreState(code);
  dispatchProfileChanged(code,'storage');
  scheduleRefresh(code,seq);
});

(function boot(){
  var code=syncCoreState(currentCode());
  var seq=++switchSeq;
  document.documentElement.dataset.healthhubProfileController='1.303';
  document.documentElement.dataset.hhActiveProfile=code;
  dispatchProfileChanged(code,'boot');
  scheduleRefresh(code,seq);
})();

(function loadRecordsQuickSwitch(){
  if(document.querySelector('script[data-hh-v261]')||document.documentElement.dataset.healthhubRecordsProfileSwitch)return;
  var s=document.createElement('script');
  s.src='./live-v261.js?v=261-records-one-click-profile-20261006';
  s.async=false;
  s.dataset.hhV261='1';
  document.head.appendChild(s);
})();

(function loadDeepSleep(){
  if(document.querySelector('script[data-hh-v262]')||document.documentElement.dataset.healthhubSleepDeep)return;
  var s=document.createElement('script');
  s.src='./live-v262.js?v=262-deep-sleep-night-analysis-20261006';
  s.async=false;
  s.dataset.hhV262='1';
  document.head.appendChild(s);
})();

(function loadHealthMainSwitch(){
  if(document.querySelector('script[data-hh-v263]')||document.documentElement.dataset.healthhubHealthMainSwitch)return;
  var s=document.createElement('script');
  s.src='./live-v263.js?v=263-health-main-one-click-profile-20261006';
  s.async=false;
  s.dataset.hhV263='1';
  document.head.appendChild(s);
})();

window.HH_LIVE_BUILD='v303-canonical-profile-fast-path';
})();
