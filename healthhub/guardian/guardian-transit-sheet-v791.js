/* Smart Arrival v791 mobile sheet: explicit three-state, keyboard and accessible toggles. */
(function(w,d){'use strict';
const KEY='hh-transit-sheet-size-v791';
function init(){
 const panel=d.getElementById('hhTransitPanel'),details=d.getElementById('hhTransitDetails');
 if(!panel||!details)return;
 const controls=[...panel.querySelectorAll('[data-hh-transit-size]')];
 function apply(size){
  if(!['closed','half','full'].includes(size))size='half';
  panel.dataset.sheetSize=size;
  details.open=size!=='closed';
  for(const b of controls)b.setAttribute('aria-pressed',String(b.dataset.hhTransitSize===size));
  try{w.localStorage.setItem(KEY,size)}catch(_){}
 }
 let saved='half';try{saved=w.localStorage.getItem(KEY)||'half'}catch(_){}
 apply(saved);
 controls.forEach(b=>b.addEventListener('click',()=>apply(b.dataset.hhTransitSize)));
 details.addEventListener('toggle',()=>{if(!details.open&&panel.dataset.sheetSize!=='closed')apply('closed');else if(details.open&&panel.dataset.sheetSize==='closed')apply('half')});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
