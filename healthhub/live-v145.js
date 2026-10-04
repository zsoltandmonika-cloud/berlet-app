(function(){
'use strict';

/* HealthHub v1.45 — let the actual day/evening/night photographs show.
   The old night overlay obscured even the separately lit night scenes.
   Wide autumn night assets preserve the moon, city lights and water. */

var assets={
  z:'./assets/hero-z-autumn-night-v145.webp',
  m:'./assets/hero-m-autumn-night-v145.webp'
};
try{
  Object.keys(assets).forEach(function(p){
    if(HERO_BG[p]&&HERO_BG[p].autumn)HERO_BG[p].autumn.night=assets[p];
  });
}catch(e){console.warn('HealthHub hero photograph update failed',e)}

var style=document.createElement('style');
style.id='hh-v145-scenic-heroes';
style.textContent=`
#heroT,
#heroT.night,
#heroT.evening{
  background-image:var(--hero)!important;
  background-size:cover!important;
  background-position:center center!important;
  background-repeat:no-repeat!important;
}
#heroT .heroCopy{
  isolation:isolate;
  text-shadow:0 1px 2px rgba(0,0,0,.92),0 2px 5px rgba(0,0,0,.70);
}
#heroT .heroCopy::before{
  content:"";
  position:absolute;
  inset:-7px -8px;
  z-index:-1;
  border-radius:12px;
  background:linear-gradient(90deg,rgba(3,17,40,.30),rgba(3,17,40,.16) 78%,transparent);
  pointer-events:none;
}
#heroT .heroBtns .round{
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));
}
`;
document.head.appendChild(style);

/* All existing controllers read this same map on their next render.
   Reapply now as well, so the first frame already uses the new asset. */
var p=localStorage.getItem('hh-profile')==='m'?'m':'z';
var hero=document.getElementById('heroT');
var part=document.documentElement.dataset.healthhubDaypart||
  (hero&&hero.dataset.daypart)||
  (typeof window.daypart==='function'?window.daypart():'day');
try{
  var s=typeof window.season==='function'?window.season():'autumn';
  var bg=HERO_BG[p]&&HERO_BG[p][s]&&HERO_BG[p][s][part];
  if(bg)document.documentElement.style.setProperty('--hero','url("'+bg+'")');
}catch(e){}

document.documentElement.dataset.healthhubHeroPhotography='1.215-timeline-only';
window.HH_LIVE_BUILD='v1.215-scenic-timeline-only';
})();
