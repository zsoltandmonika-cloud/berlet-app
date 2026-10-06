(function(){
'use strict';
/* HealthHub v260 — canonical one-click profile controller.
   One source of truth for profile state, then refresh every visible profile-owned surface.
   Loaded last so older module wrappers cannot replace this controller afterwards. */

var previousSetProfile=window.setProfile;
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

  /* Re-apply the original theme/name/home values immediately. */
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

async function refreshVisibleProfileData(code,seq,reason){
  code=codeOf(code);
  var profile=keyOf(code);
  if(seq!==switchSeq||currentCode()!==code)return false;
  if(refreshing&&reason==='followup')return false;
  refreshing=true;
  try{
    /* Repair/prepare the selected HealthRadar profile before rendering it. */
    if(typeof window.hhEnsureHealthProfile==='function'){
      try{await window.hhEnsureHealthProfile(profile)}catch(e){console.warn('HealthHub profile prepare',e)}
    }
    if(seq!==switchSeq||currentCode()!==code)return false;

    /* Home + HealthRadar summary cards. These functions read hh-profile. */
    var jobs=[];
    [window.hhSyncHealthDashboard,window.hhSyncHealthHome,window.hhSyncFullMigrationDashboard].forEach(function(fn){
      try{var r=callSafe(fn);if(r&&typeof r.then==='function')jobs.push(r)}catch(e){}
    });
    if(jobs.length){try{await Promise.allSettled(jobs)}catch(e){}}
    if(seq!==switchSeq||currentCode()!==code)return false;

    /* Re-render only the page that is actually visible. */
    if(isOn('healthSection')&&typeof window.renderHealthSection==='function'){
      try{await window.renderHealthSection()}catch(e){console.warn('HealthHub HealthRadar rerender',e)}
    }
    if(isOn('hhActivityPage191')&&typeof window.hhRenderActivity191==='function'){
      try{await window.hhRenderActivity191(profile)}catch(e){console.warn('HealthHub Activity rerender',e)}
    }
    if(isOn('hhSleepPage')&&typeof window.hhRenderSleep==='function'){
      try{await window.hhRenderSleep(profile)}catch(e){console.warn('HealthHub Sleep rerender',e)}
    }

    /* Keep profile-specific device metadata aligned without blocking the UI. */
    if(typeof window.hhDeviceCloudSync==='function'){
      Promise.resolve().then(function(){
        if(seq===switchSeq&&currentCode()===code)return window.hhDeviceCloudSync(true);
      }).catch(function(e){console.warn('HealthHub device profile sync',e)});
    }

    document.documentElement.dataset.hhActiveProfile=code;
    document.documentElement.dataset.hhActiveProfileData=profile;
    return true;
  }finally{
    refreshing=false;
  }
}

function scheduleRefresh(code,seq){
  requestAnimationFrame(function(){refreshVisibleProfileData(code,seq,'frame')});
  setTimeout(function(){refreshVisibleProfileData(code,seq,'followup')},120);
}

function canonicalSetProfile(p,options){
  var code=codeOf(p),source=options&&options.source||'one-click';
  var seq=++switchSeq;

  /* Preserve useful side-effects from existing modules, but enforce the
     canonical state again afterwards in case an old wrapper lags behind. */
  try{
    if(typeof previousSetProfile==='function')previousSetProfile.call(window,code);
  }catch(e){console.warn('HealthHub legacy profile chain',e)}

  syncCoreState(code);
  dispatchProfileChanged(code,source);
  scheduleRefresh(code,seq);
  return code;
}

function toggleProfile(source){
  return canonicalSetProfile(currentCode()==='m'?'z':'m',{source:source||'one-click-toggle'});
}

/* Final authority. Older wrappers are intentionally kept only behind this call. */
window.setProfile=canonicalSetProfile;
window.hhSetActiveProfile=canonicalSetProfile;
window.hhToggleProfileOneClick=function(){return toggleProfile('global-toggle')};

/* Activity and Sleep already expose one-click controls. Route them through the
   same controller so they cannot maintain a second profile state. */
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

/* Canonical cloud refresh event: when new Health Connect data arrives for the
   active profile, repaint the currently visible profile-owned screen. */
window.addEventListener('healthhub:health-cloud-synced',function(e){
  var detail=e&&e.detail||{};
  if(detail.profile&&detail.profile!==currentKey())return;
  var seq=switchSeq;
  setTimeout(function(){refreshVisibleProfileData(currentCode(),seq,'cloud')},30);
});

/* Cross-tab / installed-PWA consistency. */
window.addEventListener('storage',function(e){
  if(e.key!=='hh-profile')return;
  var code=codeOf(e.newValue);
  var seq=++switchSeq;
  syncCoreState(code);
  dispatchProfileChanged(code,'storage');
  scheduleRefresh(code,seq);
});

/* Normalize the page once after all older modules have finished booting. */
(function boot(){
  var code=syncCoreState(currentCode());
  var seq=++switchSeq;
  document.documentElement.dataset.healthhubProfileController='1.260';
  document.documentElement.dataset.hhActiveProfile=code;
  dispatchProfileChanged(code,'boot');
  scheduleRefresh(code,seq);
})();

window.HH_LIVE_BUILD='v260-canonical-one-click-profile';
})();