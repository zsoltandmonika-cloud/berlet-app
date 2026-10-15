/* HealthHub Sleep Premium Glass v531 | CSS-only opt-out visual adapter.
 * Does not create, clone, hide or transform Sleep records, canvases, SVG,
 * charts, tiles, source timestamps, profile data, or the Sleep Helper.
 * Legacy view: ?hhsleepglass=0 (no writes or sync effects).
 */
(function(){
 'use strict';
 var params;
 try{params=new URLSearchParams(location.search)}catch(e){params=null}
 if(params&&params.get('hhsleepglass')==='0')return;
 var root=document.documentElement;
 function updateProfile(){
  var p='z';
  try{p=localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(e){}
  root.setAttribute('data-hh-sleep-profile',p);
 }
 var link=document.createElement('link');
 link.rel='stylesheet';link.href='./sleep-premium-glass-v531.css?v=531';
 link.dataset.hhSleepPremium='531';
 link.addEventListener('load',function(){
  updateProfile();
  root.setAttribute('data-hh-sleep-glass','on');
  root.dataset.hhSleepPremiumBuild='v531';
 },{once:true});
 link.addEventListener('error',function(){console.warn('Sleep Premium Glass CSS unavailable; retaining original Sleep UI.')},{once:true});
 document.head.appendChild(link);
 window.addEventListener('healthhub:profile-changed',updateProfile);
 document.addEventListener('hh:profile-changed',updateProfile);
 window.addEventListener('storage',function(e){if(e.key==='hh-profile')updateProfile()});
 // Canonical Sleep's profile switch dispatches the event synchronously.
 // The original data and render functions remain the only authorities.
})();
