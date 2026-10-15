/* v553 native Hero button. No global capture trickery.
   The approved Hero artwork is unchanged; the actual button owns each tap. */
(function(root){
 'use strict';
 var buttonSelector='#health #heroH > .hhHealthHeroNativeTap553';
 function profile(){try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}}
 function pname(p){return p==='m'?'Mónika':'Zsolt'}
 function note(message){if(typeof root.toast==='function')root.toast(message);}
 function decorate(){
  var button=document.querySelector(buttonSelector);
  if(!button)return;
  button.setAttribute('aria-label','Érintsd meg a képet: váltás '+pname(profile()==='m'?'z':'m')+' profiljára');
  button.title='Profilváltás · '+pname(profile())+' ⇄ '+pname(profile()==='m'?'z':'m');
 }
 function tap(e){
  if(e){if(e.cancelable)e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  var health=document.getElementById('health');
  if(!health||!health.classList.contains('on'))return false;
  /* Only the visible picker blocks the Hero; do not mistake hidden dialogs for open modals. */
  var picker=document.getElementById('overlay');
  if(picker&&picker.classList.contains('on'))return false;
  var old=profile(),wanted=old==='m'?'z':'m';
  try{
   if(typeof root.hhSetActiveProfile==='function')root.hhSetActiveProfile(wanted,{source:'health-hero-native-v553'});
   else if(typeof root.hhToggleProfileOneClick==='function')root.hhToggleProfileOneClick();
   else if(typeof root.setProfile==='function')root.setProfile(wanted);
   else{note('Profilváltás nem érhető el.');return false;}
   var actual=profile();
   if(actual!==wanted){note('Profilváltás sikertelen.');return false;}
   document.documentElement.dataset.hhHealthProfile=actual;
   decorate();
   note(pname(actual)+' profil aktív');
   if(typeof root.hhRenderLiveKpis==='function'){
    Promise.resolve().then(function(){return root.hhRenderLiveKpis()}).then(decorate)
     .catch(function(err){root.console&&root.console.warn('v553 KPI refresh',err);});
   }
   return false;
  }catch(err){root.console&&root.console.warn('v553 native Hero tap',err);note('Profilváltás nem sikerült.');return false;}
 }
 root.hhHealthHeroNative553Tap=tap;
 function init(){
  try{if(new URLSearchParams(root.location.search).get('hhdiag')==='1')
   document.documentElement.dataset.hhHeroDiag='553';}catch(_){}
  decorate();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 root.addEventListener('healthhub:profile-changed',decorate);
 root.addEventListener('pageshow',decorate);
 root.HH_HEALTH_HERO_NATIVE_V553=Object.freeze({tap:tap,refresh:decorate});
})(window);
