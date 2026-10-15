/* HealthHub v554 | Wide-area profile switching with safe action exclusions.
   Reuses the WORKING native v553 Hero toggle. Never places a screen-wide
   overlay over medical cards, navigation or other real controls. */
(function(root){
'use strict';
var ID='hhProfileDock554';
var BLOCK='button,a,input,select,textarea,summary,label,[role="button"],[contenteditable],'+
 '.card,.mini,.hhLiveKpi,.kpi,.q,.ask,.envCell,#hhEnvCard308,'+
 '.listCard,.legacyAccess,[data-hh-kpi-target],[onclick],.tabs,.chip';
function code(){try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}}
function name(p){return p==='m'?'Mónika':'Zsolt'}
function active(){
 var p=document.getElementById('health');
 return !!(p&&p.classList.contains('on'));
}
function overlayOpen(){
 var o=document.getElementById('overlay');
 return !!(o&&o.classList.contains('on'));
}
function paint(){
 var b=document.getElementById(ID);if(!b)return;
 var p=code(),next=p==='m'?'z':'m';
 b.dataset.active=p;
 b.setAttribute('aria-label','Aktív profil: '+name(p)+'. Koppints a '+name(next)+' profilra váltáshoz.');
 b.title='Profilváltás: '+name(p)+' ⇄ '+name(next);
 document.documentElement.dataset.hhHealthProfile=p;
}
function switchViaWorking553(e){
 if(!active()||overlayOpen())return;
 /* Keep the successful, user-verified native v553 controller, not a parallel profile state. */
 if(typeof root.hhHealthHeroNative553Tap==='function'){
  root.hhHealthHeroNative553Tap(e);
 }else if(typeof root.hhToggleProfileOneClick==='function'){
  if(e&&e.cancelable)e.preventDefault();
  root.hhToggleProfileOneClick();
 }
 paint();
}
function mount(){
 if(!document.body)return;
 var b=document.getElementById(ID);
 if(!b){
  b=document.createElement('button');b.type='button';b.id=ID;
  b.className='hhHealthProfileDock554';
  b.innerHTML='<span class="hh554Name hh554Z">Zsolt</span>'+
   '<span class="hh554Arrow" aria-hidden="true">⇄</span>'+
   '<span class="hh554Name hh554M">Mónika</span>';
  b.addEventListener('click',function(e){switchViaWorking553(e)});
  document.body.appendChild(b);
 }
 paint();
}
function blankTap(e){
 if(!active()||overlayOpen()||e.defaultPrevented||e.button!==0)return;
 var page=document.getElementById('health'),t=e.target;
 if(!page||!t||!page.contains(t))return;
 /* The whole Hero keeps its actual v553 button, preventing a double switch. */
 if(t.closest&&(t.closest('#heroH')||t.closest(BLOCK)))return;
 /* A bare page, section background or padding area is deliberately tappable. */
 switchViaWorking553(e);
}
document.addEventListener('click',blankTap,false);
root.addEventListener('healthhub:profile-changed',paint);
root.addEventListener('storage',function(e){if(e.key==='hh-profile')paint()});
root.addEventListener('pageshow',mount);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
root.HH_HEALTH_WIDE_SWITCH_V554=Object.freeze({refresh:paint,toggle:switchViaWorking553});
})(window);
