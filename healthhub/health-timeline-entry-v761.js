/* HealthHub v761: preserve the original Timeline page via one-tap Egészség submenu.
 * Adds only a link inside the existing Health quick grid. Never clones timeline data. */
(function(w,d){
'use strict';
const ID='hhTimelineQuick761';
let observer=null,watching=null;
function open(e){
 const target=e.target&&e.target.closest?e.target.closest('#'+ID):null;
 if(!target)return;
 e.preventDefault();e.stopPropagation();
 if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 if(typeof w.show==='function')w.show('timeline');
 else if(typeof w.toast==='function')w.toast('Az Idővonal most nem érhető el.');
}
function insert(){
 const health=d.getElementById('health'),grid=health&&health.querySelector('.quick');
 if(!grid)return false;
 if(grid.querySelector('#'+ID))return true;
 const tile=d.createElement('button');
 tile.type='button';tile.className='q hhTimelineQuick761';tile.id=ID;
 tile.setAttribute('aria-label','Idővonal megnyitása az Egészség menüből');
 tile.innerHTML='<div class="qbox" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M14 15h2"/></svg></div><span>Idővonal</span>';
 grid.appendChild(tile);return true;
}
function init(){
 const health=d.getElementById('health');if(!health)return;
 insert();
 if(typeof w.MutationObserver==='function'&&watching!==health){
  if(observer)observer.disconnect();
  watching=health;
  observer=new w.MutationObserver(function(records){
   if(records.some(function(r){return r.addedNodes&&r.addedNodes.length}))insert();
  });
  observer.observe(health,{childList:true,subtree:true});
 }
}
d.addEventListener('click',open,true);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.addEventListener('pageshow',init);
w.HH_HEALTH_TIMELINE_V761=Object.freeze({open:function(){if(typeof w.show==='function')w.show('timeline')},refresh:insert});
})(window,document);
