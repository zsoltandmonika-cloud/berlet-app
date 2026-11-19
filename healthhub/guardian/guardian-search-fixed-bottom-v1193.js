/* Family Guard · fixed bottom search v1193 (presentation only).
 * Keeps the existing search trio aligned to the VISIBLE bottom navigation
 * instead of the map's document position. No cloned controls or event handlers.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const card=d.querySelector('.map-card');
 const tray=d.getElementById('guardianMapSearchV819');
 const input=d.getElementById('guardianMapSearchInputV819');
 if(!card||!tray)return;
 const ATTRIBUTE='data-hh-search-fixed-v1193';
 let queued=false;
 function mobile(){
  return !!(w.matchMedia&&w.matchMedia('(max-width:600px) and (orientation:portrait)').matches);
 }
 function visibleNav(){
  for(const id of ['sh9TransitNavV927','sh9GlobalNavV24','guardianHHNav']){
   const nav=d.getElementById(id);
   if(!nav||nav.hidden)continue;
   const style=w.getComputedStyle&&w.getComputedStyle(nav);
   if(style&&(style.display==='none'||style.visibility==='hidden'))continue;
   const rect=nav.getBoundingClientRect();
   if(Number.isFinite(rect.top)&&rect.top>0&&rect.top<w.innerHeight)
    return rect;
  }
  return null;
 }
 function clear(){card.removeAttribute(ATTRIBUTE)}
 function sync(){
  queued=false;
  if(!mobile()||d.documentElement.getAttribute('data-sh9-transit')==='on'||
     card.classList.contains('hh-map-full-v819')||
     d.body.classList.contains('hh-map-full-v819')){
   clear();return;
  }
  // The existing v832 keyboard guard is the sole owner of focused positioning.
  if(card.classList.contains('hh-map-typing-v832')||d.activeElement===input)return;
  const nav=visibleNav(),rect=card.getBoundingClientRect();
  if(!nav||!Number.isFinite(rect.left)||!Number.isFinite(rect.width)||
     rect.width<=0||rect.bottom<=96||rect.top>=nav.top-48){
   clear();return;
  }
  const left=Math.max(0,Math.round(rect.left));
  const width=Math.min(Math.round(rect.width),Math.max(0,w.innerWidth-left));
  const bottom=Math.max(0,Math.round(w.innerHeight-nav.top));
  if(width<180){clear();return}
  card.style.setProperty('--hh-search-screen-left-v1193',left+'px');
  card.style.setProperty('--hh-search-screen-width-v1193',width+'px');
  card.style.setProperty('--hh-search-screen-bottom-v1193',bottom+'px');
  card.setAttribute(ATTRIBUTE,'on');
 }
 function schedule(){
  if(queued)return;
  queued=true;
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(sync);
  else w.setTimeout(sync,0);
 }
 ['resize','orientationchange','scroll','pageshow'].forEach(name=>
  w.addEventListener(name,schedule,{passive:true}));
 if(w.visualViewport&&w.visualViewport.addEventListener){
  w.visualViewport.addEventListener('resize',schedule,{passive:true});
  w.visualViewport.addEventListener('scroll',schedule,{passive:true});
 }
 if(input){
  input.addEventListener('blur',()=>w.setTimeout(schedule,480));
 }
 if(typeof w.MutationObserver==='function'){
  const observer=new w.MutationObserver(schedule);
  observer.observe(card,{attributes:true,attributeFilter:['class']});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',schedule,{once:true});
 else schedule();
 w.setTimeout(schedule,180);
 w.setTimeout(schedule,900);
})(window,document);
