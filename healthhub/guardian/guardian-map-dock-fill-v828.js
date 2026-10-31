/* Family Guard v1050 · robust presentation-only mobile map-to-VISIBLE-taskbar fit.
 * Measures the actual bottom navigation and existing map-card, rather than
 * assuming a Samsung viewport size. Never starts GPS or alters coordinates.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const card=d.querySelector('.map-card');
 const mapNode=d.getElementById('guardianMap'),input=d.getElementById('guardianMapSearchInputV819');
 if(!card||!mapNode)return;
 // SH9 replaces the original hidden Guardian dock with its own fixed nav.
 // Reading the retired dock yields top=0 on mobile and skips viewport fitting.
 function visibleDock(mapTop){
  for(const id of ['sh9TransitNavV927','sh9GlobalNavV24','guardianHHNav']){
   const element=d.getElementById(id);
   if(!element||element.hidden)continue;
   try{
    const style=w.getComputedStyle?.(element);
    if(style&&(style.display==='none'||style.visibility==='hidden'))continue;
    const bounds=element.getBoundingClientRect();
    if(Number.isFinite(bounds.top)&&bounds.top>mapTop&&bounds.top>0)
     return bounds;
   }catch(_){}
  }
  return null;
 }
 let scheduled=false,lastHeight=0;
 function resizeMap(){
  const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  if(map&&typeof map.resize==='function')try{map.resize()}catch(_){}
 }
 function mobilePortrait(){
  return !!(w.matchMedia&&w.matchMedia('(max-width:600px) and (orientation:portrait)').matches);
 }
 function resetMapHeight(){
  card.style.removeProperty('--hh-guardian-map-dock-height-v828');
  if(mapNode.style&&typeof mapNode.style.removeProperty==='function')
   mapNode.style.removeProperty('height');
  if(lastHeight){lastHeight=0;w.setTimeout(resizeMap,60)}
 }
 function fit(){
  scheduled=false;
  if(!mobilePortrait()){resetMapHeight();return}
  // The CSS immersive mode must own height:100%, so inline height may not persist.
  if(card.classList.contains('hh-map-full-v819')||d.body.classList.contains('hh-map-full-v819')){
   resetMapHeight();return;
  }
  // Browser keyboards may shrink the visual viewport; do not collapse the map
  // while someone enters an address.
  if(input&&d.activeElement===input)return;
  const mapRect=card.getBoundingClientRect();
  if(!Number.isFinite(mapRect.top)||mapRect.top<0)return;
  const dock=visibleDock(mapRect.top);
  if(!dock)return;
  // Subtract borders to make the painted map edge meet the top of the fixed dock.
  const desired=Math.round(dock.top-mapRect.top-2);
  if(desired<350||desired>920)return;
  if(Math.abs(desired-lastHeight)<2)return;
  lastHeight=desired;
  card.style.setProperty('--hh-guardian-map-dock-height-v828',desired+'px');
  // Some older map CSS layers still set #guardianMap height !important.
  // An inline important value is deterministic and reaches the real dock edge.
  if(mapNode.style&&typeof mapNode.style.setProperty==='function')
   mapNode.style.setProperty('height',desired+'px','important');
  w.setTimeout(resizeMap,40);w.setTimeout(resizeMap,180);
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(fit);
  else w.setTimeout(fit,0);
 }
 w.addEventListener('resize',schedule,{passive:true});
 w.addEventListener('orientationchange',schedule,{passive:true});
 // On a deliberate browser refresh return to the intended Family Guard landing
 // position. Never override history Back/Forward, a deep-link, or keyboard input.
 function resetReloadPosition(){
  const kind=w.performance?.getEntriesByType?.('navigation')?.[0]?.type;
  if(kind!=='reload'||w.location?.hash||input&&d.activeElement===input)return;
  try{w.scrollTo?.(0,0)}catch(_){}
  if(d.scrollingElement)d.scrollingElement.scrollTop=0;
  schedule();
 }
 w.addEventListener('pageshow',()=>{resetReloadPosition();schedule()});
 if(input&&typeof input.addEventListener==='function')input.addEventListener('blur',()=>w.setTimeout(schedule,180));
 // Opening or closing the app's fullscreen map changes the map class.
 // Reapply measured mobile height only after the normal view returns.
 if(typeof w.MutationObserver==='function'){
  const observer=new w.MutationObserver(schedule);
  observer.observe(card,{attributes:true,attributeFilter:['class']});
 }

 if(w.visualViewport&&w.visualViewport.addEventListener){
  w.visualViewport.addEventListener('resize',schedule,{passive:true});
 }
 // The SH9 global dock can be inserted after this module initializes.
 // A bounded layout retry avoids observing the full page or polling.
 // Hero image and fonts can also settle after DOM readiness.
 schedule();
 w.setTimeout(()=>{resetReloadPosition();schedule()},250);
 w.setTimeout(schedule,850);
 // Refit if the hero image finishes decoding after the first layout.
 const hero=d.querySelector('.guardian-hero');
 if(hero)hero.addEventListener('load',schedule,true);
})(window,document);
