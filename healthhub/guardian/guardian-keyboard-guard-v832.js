/* Family Guard v832 · Mobile keyboard-safe floating address search.
 * Prevent Chrome/WebView's focus-induced page jump without changing search,
 * MapLibre, BKK status, profile sharing, GPS, or the fixed taskbar.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_KEYBOARD_V832=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 function layoutForViewport(offsetTop,height,trayHeight){
  const offset=Number.isFinite(offsetTop)?offsetTop:0;
  const available=Number.isFinite(height)?Math.max(160,height):560;
  const tray=Number.isFinite(trayHeight)?Math.max(42,trayHeight):52;
  const top=Math.max(offset+10,Math.round(offset+available-tray-10));
  return {top,maxResults:Math.min(310,Math.max(70,Math.floor(top-offset-20)))};
 }
 function init(){
  const d=w&&w.document;if(!d)return;
  const input=d.getElementById('guardianMapSearchInputV819');
  const box=d.getElementById('guardianMapSearchV819');
  const card=box&&box.closest('.map-card');
  if(!input||!box||!card)return;
  const mobile=()=>!!(w.matchMedia&&w.matchMedia('(max-width:600px) and (orientation:portrait)').matches);
  const pageY=()=>Number.isFinite(w.scrollY)?w.scrollY:(w.pageYOffset||0);
  let active=false,pointerY=null,anchorY=0,deadline=0,userScrolling=false,scheduled=false,blurTimer=null;
  function restoreFocusScroll(){
   if(!active||userScrolling||Date.now()>deadline||typeof w.scrollTo!=='function')return;
   // Restore only the *browser-induced* focus pan. Never block manual scrolling.
   if(Math.abs(pageY()-anchorY)>5)w.scrollTo(0,anchorY);
  }
  function end(){
   active=false;scheduled=false;deadline=0;
   card.classList.remove('hh-map-typing-v832');
   card.style.removeProperty('--hh-map-typing-top-v832');
   card.style.removeProperty('--hh-map-typing-results-v832');
  }
  function position(){
   scheduled=false;
   if(!active)return;
   if(!mobile()||card.classList.contains('hh-map-full-v819')||
      d.body.classList.contains('hh-map-full-v819')){end();return}
   const vv=w.visualViewport;
   const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
   const offset=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
   const tray=box.getBoundingClientRect().height||52;
   const layout=layoutForViewport(offset,height,tray);
   card.style.setProperty('--hh-map-typing-top-v832',layout.top+'px');
   card.style.setProperty('--hh-map-typing-results-v832',layout.maxResults+'px');
   restoreFocusScroll();
  }
  function schedule(){
   if(!active||scheduled)return;
   scheduled=true;
   if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(position);
   else w.setTimeout(position,0);
  }
  function begin(){
   if(!mobile()||card.classList.contains('hh-map-full-v819'))return;
   if(blurTimer!==null){w.clearTimeout(blurTimer);blurTimer=null}
   if(!active){
    anchorY=pointerY===null?pageY():pointerY;
    pointerY=null;userScrolling=false;
    deadline=Date.now()+950;
    active=true;card.classList.add('hh-map-typing-v832');
   }
   schedule();
   // Android keyboard resizing and native input scrolling occur asynchronously.
   [0,100,250,500,850].forEach(delay=>w.setTimeout(()=>{
    if(active){position();restoreFocusScroll()}
   },delay));
  }
  input.addEventListener('pointerdown',()=>{if(!active)pointerY=pageY()},{passive:true});
  input.addEventListener('touchstart',()=>{if(!active)pointerY=pageY()},{passive:true});
  input.addEventListener('focus',begin);
  input.addEventListener('blur',()=>{
   // Keep the results under the finger until a tapped suggestion receives click.
   blurTimer=w.setTimeout(()=>{
    blurTimer=null;
    if(d.activeElement!==input)end();
   },420);
  });
  w.addEventListener('touchmove',()=>{if(active)userScrolling=true},{passive:true});
  w.addEventListener('wheel',()=>{if(active)userScrolling=true},{passive:true});
  w.addEventListener('resize',schedule,{passive:true});
  w.addEventListener('orientationchange',schedule,{passive:true});
  w.addEventListener('pagehide',end);
  if(w.visualViewport&&w.visualViewport.addEventListener){
   w.visualViewport.addEventListener('resize',schedule,{passive:true});
   w.visualViewport.addEventListener('scroll',schedule,{passive:true});
  }
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {layoutForViewport,init,version:'832'};
});
