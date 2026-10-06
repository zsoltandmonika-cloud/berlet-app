(function(){
'use strict';
/* HealthHub v261 — one-click profile switch on Leletek header. */

function currentCode(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function currentKey(){return currentCode()==='m'?'monika':'zsolt'}
function otherName(){return currentCode()==='m'?'Zsolt':'Mónika'}
function isRecords(){return window.healthSectionKind==='records'}

function ensureStyle(){
  if(document.getElementById('hhRecordsProfileSwitchStyle'))return;
  var s=document.createElement('style');
  s.id='hhRecordsProfileSwitchStyle';
  s.textContent=
    '#healthSubProfile.hhRecordsQuickProfile{display:inline-flex!important;align-items:center;gap:5px;width:max-content;padding:4px 8px!important;border-radius:999px;background:var(--soft)!important;color:var(--a)!important;border:1px solid color-mix(in srgb,var(--a) 24%,#fff)!important;cursor:pointer!important;user-select:none;-webkit-tap-highlight-color:transparent;transition:transform .12s ease,box-shadow .12s ease;font-weight:900!important;}'+
    '#healthSubProfile.hhRecordsQuickProfile:after{content:"⇄";font-size:12px;line-height:1;color:var(--a)}'+
    '#healthSubProfile.hhRecordsQuickProfile:active{transform:scale(.96)}'+
    '#healthSubProfile.hhRecordsQuickProfile:focus-visible{outline:2px solid var(--a);outline-offset:2px}';
  document.head.appendChild(s);
}

function decorate(){
  ensureStyle();
  var el=document.getElementById('healthSubProfile');
  if(!el)return;
  if(!isRecords()){
    el.classList.remove('hhRecordsQuickProfile');
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    el.removeAttribute('title');
    el.removeAttribute('aria-label');
    return;
  }
  el.classList.add('hhRecordsQuickProfile');
  el.setAttribute('role','button');
  el.setAttribute('tabindex','0');
  el.title='Váltás '+otherName()+' leleteire';
  el.setAttribute('aria-label','Egy kattintás: váltás '+otherName()+' leleteire');
}

function toggleRecordsProfile(e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(!isRecords())return false;
  var next=currentCode()==='m'?'z':'m';
  var nextKey=next==='m'?'monika':'zsolt';

  /* Keep the document filter tied to the selected person. */
  if(window.hhDocState){
    window.hhDocState.profile=nextKey;
    window.hhDocState.showAll=false;
  }

  if(typeof window.hhSetActiveProfile==='function')window.hhSetActiveProfile(next,{source:'records'});
  else if(typeof window.setProfile==='function')window.setProfile(next,{source:'records'});
  else localStorage.setItem('hh-profile',next);

  setTimeout(decorate,30);
  return false;
}

/* Header profile label is the quick switch only while Leletek is open. */
document.addEventListener('click',function(e){
  var el=e.target&&e.target.closest?e.target.closest('#healthSubProfile.hhRecordsQuickProfile'):null;
  if(el)toggleRecordsProfile(e);
},true);

document.addEventListener('keydown',function(e){
  var el=e.target&&e.target.closest?e.target.closest('#healthSubProfile.hhRecordsQuickProfile'):null;
  if(!el)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleRecordsProfile(e)}
},true);

var previousRender=window.renderHealthSection;
if(typeof previousRender==='function'){
  window.renderHealthSection=async function(){
    var r=await previousRender.apply(this,arguments);
    decorate();
    return r;
  };
}

window.addEventListener('healthhub:profile-changed',function(){setTimeout(decorate,20)});
setTimeout(decorate,120);
setTimeout(decorate,700);

document.documentElement.dataset.healthhubRecordsProfileSwitch='1.261';
window.HH_LIVE_BUILD='v261-records-one-click-profile';
})();