/* HealthHub v1020 · Home launcher label only.
 * Force the existing Gyógyszerek tile to display exactly "Gyógyszerek",
 * including after any later script edits. Keep its original icon, onclick,
 * route, profile and Supplements module completely untouched.
 */
(function(w,d){
 'use strict';
 var expected='Gyógyszerek',observer=null,observed=null,queued=false;
 function label(){
  // The launcher is in Premium Home, NOT the inner Egészség quick grid.
  return d.querySelector('#home .hhpg-tile[data-key="meds"] .hhpg-label');
 }
 function clean(){
  var target=label();
  if(!target)return;
  if(target.textContent.trim()!==expected)target.textContent=expected;
  target.parentNode.setAttribute('aria-label',expected+' megnyitása');
  if(observed===target)return;
  if(observer)observer.disconnect();
  observed=target;
  observer=new MutationObserver(function(){
   if(observed&&observed.textContent.trim()!==expected)queue();
  });
  observer.observe(target,{subtree:true,childList:true,characterData:true});
 }
 function queue(){
  if(queued)return;queued=true;
  (w.requestAnimationFrame||function(f){return w.setTimeout(f,30)})(function(){
   queued=false;clean();
  });
 }
 function init(){
  if(!d.getElementById('home'))return;
  var s=d.createElement('style');s.id='hhMedsLauncherV1020Style';
  s.textContent='#home .hhpg-tile[data-key="meds"] .hhpg-label{white-space:nowrap!important;font-size:11px!important;letter-spacing:-.025em!important;max-width:100%!important;overflow:visible!important}';
  if(!d.getElementById(s.id))d.head.appendChild(s);
  clean();w.addEventListener('pageshow',queue);w.addEventListener('healthhub:profile-changed',queue);
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
 w.HH_MEDS_LAUNCHER_V1020={version:'1020',refresh:queue};
})(window,document);
