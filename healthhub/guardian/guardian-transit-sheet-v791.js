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
 // Touch gesture is confined to the grip area, never the map or scrolling list.
 const grip=panel.querySelector('.hh-transit-sheet-grip');
 if(grip){
  let startY=null,startX=null;
  grip.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   startY=e.clientY;startX=e.clientX;
   if(grip.setPointerCapture)grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointerup',e=>{
   if(startY===null)return;
   const dy=e.clientY-startY,dx=e.clientX-startX;
   startY=null;startX=null;
   if(Math.abs(dy)<35||Math.abs(dy)<Math.abs(dx)*1.3)return;
   const states=['closed','half','full'],at=states.indexOf(panel.dataset.sheetSize);
   apply(states[Math.max(0,Math.min(2,at+(dy<0?1:-1)))]);
  });
  grip.addEventListener('pointercancel',()=>{startY=null;startX=null});
  grip.addEventListener('keydown',e=>{
   if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
   e.preventDefault();
   const states=['closed','half','full'],at=states.indexOf(panel.dataset.sheetSize);
   apply(states[Math.max(0,Math.min(2,at+(e.key==='ArrowUp'?1:-1)))]);
  });
 }

 details.addEventListener('toggle',()=>{if(!details.open&&panel.dataset.sheetSize!=='closed')apply('closed');else if(details.open&&panel.dataset.sheetSize==='closed')apply('half')});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
