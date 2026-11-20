/* SHO Shopping Golden Recovery V3: mount existing shared v934 dock below the hero.
   Does not duplicate controls or change navigation, storage, data, or API calls. */
(function(w,d){
 'use strict';
 const SLOT='shoppingGoldenDockSlotV3', DOCK='sh9UnifiedGlassDockV34';
 function place(){
  const slot=d.getElementById(SLOT),dock=d.getElementById(DOCK);
  if(!slot||!dock)return;
  if(dock.parentElement!==slot)slot.appendChild(dock);
  slot.setAttribute('data-golden-dock-ready','on');
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',place,{once:true});
 else place();
 w.addEventListener('pageshow',place);
})(window,document);