/* HealthHub v550: one-tap switch on the visible name in Health KPIs.
   Uses existing canonical profile controller; never changes any measurements. */
(function(root){
'use strict';
var selector='#health .kpiCard .hhLiveHead small';
function name(){try{return root.localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt';}catch(_){return 'Zsolt';}}
function setHint(){
 var label=document.querySelector(selector);if(!label)return;
 var next=name()==='Zsolt'?'Mónika':'Zsolt';
 label.setAttribute('role','button');
 label.setAttribute('tabindex','0');
 label.setAttribute('aria-label','Egy érintés: profilváltás '+next+' adataira');
 label.setAttribute('title','Váltás '+next+' profiljára');
}
function swap(){
 var h=document.getElementById('health');if(!h||!h.classList.contains('on'))return false;
 var before=name(),wanted=before==='Zsolt'?'m':'z';
 try{
  if(typeof root.hhToggleProfileOneClick==='function')root.hhToggleProfileOneClick();
  else if(typeof root.setProfile==='function')root.setProfile(wanted);
  else return false;
  if(name()===before)return false;
  setHint();
  if(typeof root.hhRenderLiveKpis==='function'){
   Promise.resolve(root.hhRenderLiveKpis()).catch(function(e){console.warn('Health KPI refresh',e);});
  }
  return true;
 }catch(e){console.warn('HealthHub profile switch failed',e);return false}
}
function activate(e){
 var target=e.target&&e.target.closest?e.target.closest(selector):null;
 if(!target)return;
 var page=document.getElementById('health');if(!page||!page.classList.contains('on'))return;
 if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
 if(e.type==='click'&&e.button!=null&&e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 swap();
}
function init(){
 setHint();
 var card=document.querySelector('#health .kpiCard');
 if(card&&typeof root.MutationObserver==='function'){
  var observer=new root.MutationObserver(setHint);
  observer.observe(card,{childList:true,subtree:true});
 }
}
document.addEventListener('click',activate,true);
document.addEventListener('keydown',activate,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.addEventListener('healthhub:profile-changed',setHint);
root.HH_HEALTH_ONE_CLICK_V550=Object.freeze({switch:swap,refresh:setHint});
})(window);
