/* v927: SH9-branded viewport for the EXISTING Family Guard map and BKK layers.
   No map creation, no extra fetch, no GPS watchers, no background tasks. */
(function(w,d){'use strict';
const active=()=>new URLSearchParams(w.location.search).get('sh9Transit')==='1';
if(!active())return;
const $=id=>d.getElementById(id);
function showNotice(msg){const e=$('sh9TransitNoticeV927');if(!e)return;e.textContent=msg;e.hidden=false}
function syncTheme(){
 const isM=d.documentElement.dataset.guardianProfile==='m'||
  (w.localStorage&&w.localStorage.getItem('hh-profile')==='m');
 if($('sh9TransitProfileV927'))$('sh9TransitProfileV927').textContent=isM?'Mónika':'Zsolt';
}
function mapResize(){try{w.HH_GUARDIAN_V761?.map?.resize?.()}catch(_){}}
function scrollTo(id){
 const el=$(id);if(!el){showNotice('Ez a rész most nem érhető el.');return}
 el.scrollIntoView({behavior:w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});
}
function openFavorites(){
 const btn=$('hhBkkWatchToggleV858'),content=$('hhBkkWatchContentV858');
 if(btn&&content&&content.hidden)btn.click();
 scrollTo('hhBkkWatchlistV814');
}
function init(){
 const head=$('sh9TransitHeaderV927'),nav=$('sh9TransitNavV927');
 if(!head||!nav||!$('guardianMap')||!$('hhTransitPanel'))return;
 d.documentElement.dataset.sh9Transit='on';head.hidden=false;nav.hidden=false;
 syncTheme();
 $('sh9TransitMapV927')?.addEventListener('click',()=>scrollTo('guardianMap'));
 $('sh9TransitFavoritesV927')?.addEventListener('click',openFavorites);
 $('sh9TransitPlannerV927')?.addEventListener('click',()=>scrollTo('hhSmartHubDestinationV802'));
 $('sh9TransitNotifierV927')?.addEventListener('click',()=>showNotice('Az SH9 értesítéseket a központi modul kezeli.'));
 $('guardianProfileSwitch')?.addEventListener('click',()=>w.requestAnimationFrame(syncTheme));
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')syncTheme()});
 w.addEventListener('pageshow',()=>{syncTheme();mapResize()});
 w.addEventListener('resize',mapResize,{passive:true});
 // MapLibre owns this existing map. Resize only its viewport after CSS switches view.
 w.requestAnimationFrame(()=>{mapResize();w.requestAnimationFrame(mapResize)});
 const status=$('sh9TransitStatusV927');
 if(status)status.textContent='Meglévő Family Guard térkép · élő jelölők csak friss BKK-adatból. Indulási idők egyelőre nem állnak rendelkezésre ebben a nézetben.';
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);
else init();
})(window,document);
