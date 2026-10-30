/* v1024 Smart Trip hero detail control · local-only zoom.
 * Reuses the already loaded approved data-image from CSS; zero requests.
 * Does not alter route planning, GPS, profile state or the SH9 taskbar.
 */
(function(w,d){
 'use strict';
 const header=d.querySelector('.st22-header');
 const dialog=d.getElementById('st22HeroDialog');
 const launch=d.getElementById('st22HeroExpand');
 const close=d.getElementById('st22HeroClose');
 const poster=d.getElementById('st22HeroPoster');
 const scroll=d.getElementById('st22HeroScroll');
 if(!header||!dialog||!launch||!close||!poster||!scroll)return;
 function show(){
  const image=w.getComputedStyle(header,'::before').backgroundImage;
  if(!image||image==='none'){
   launch.setAttribute('aria-label','Hero kép nem érhető el');
   return;
  }
  poster.style.setProperty('--st22-zoom-image',image);
  try{dialog.showModal()}catch(_){dialog.setAttribute('open','')}
  // Start at the left-most edge: title, Zsolt, Mónika and Corky.
  scroll.scrollLeft=0;scroll.scrollTop=0;
 }
 function hide(){
  if(dialog.close)dialog.close();
  else dialog.removeAttribute('open');
  launch.focus({preventScroll:true});
 }
 launch.addEventListener('click',show);
 close.addEventListener('click',hide);
 dialog.addEventListener('click',e=>{if(e.target===dialog)hide()});
 dialog.addEventListener('cancel',e=>{e.preventDefault();hide()});
 w.SH9_SMART_TRIP_HERO_V1024=Object.freeze({open:show,close:hide,version:'1024'});
})(window,document);