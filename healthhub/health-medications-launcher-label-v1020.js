/* HealthHub v1020 · Home launcher label only.
 * Force the existing Gyógyszerek tile to display exactly "Gyógyszerek",
 * including after any later script edits. Keep its original icon, onclick,
 * route, profile and Supplements module completely untouched.
 */
(function(w,d){
 'use strict';
 var expected='Gyógyszerek',observer=null,observed=null,queued=false;
 function label(){
  var buttons=Array.from(d.querySelectorAll('#health .quick .q'));
  if(!buttons.length)return null;
  var b=buttons.find(function(x){return /gy[oó]gyszer/i.test(x.textContent||'')})||buttons[2];
  if(!b)return null;
  return Array.from(b.children).find(function(x){
   return x.tagName==='SPAN'&&!x.classList.contains('qbox');
  })||null;
 }
 function clean(){
  var target=label();
  if(!target)return;
  if(target.textContent.trim()!==expected)target.textContent=expected;
  if(!target.parentNode.getAttribute('aria-label'))
   target.parentNode.setAttribute('aria-label',expected);
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
  if(!d.getElementById('health'))return;
  var s=d.createElement('style');s.id='hhMedsLauncherV1020Style';
  s.textContent='#health .quick .q:nth-child(3)>span:not(.qbox){white-space:nowrap!important;font-size:11px!important;letter-spacing:-.02em!important;overflow:visible!important}';
  if(!d.getElementById(s.id))d.head.appendChild(s);
  clean();w.addEventListener('pageshow',queue);w.addEventListener('healthhub:profile-changed',queue);
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
 w.HH_MEDS_LAUNCHER_V1020={version:'1020',refresh:queue};
})(window,document);
