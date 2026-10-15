/* HealthHub v560 | Egészség Golden Standard KPI pictograms
 * Nine consistent, lightly tinted line icons. Visual-only DOM enrichment of
 * existing live-v179 KPI cards: never modify readings, targets, or profiles. */
(function(root){
'use strict';
var ICONS={
 bp:'<path d="M20.6 5.9a5 5 0 0 0-7.1 0L12 7.3l-1.5-1.4a5 5 0 0 0-7.1 7.1L12 21l8.6-8a5 5 0 0 0 0-7.1Z"/><path d="M2.7 12.5h4.1l1.5-2.8 2.4 5.9 2.1-3.8h8.5"/>',
 pulse:'<path d="M3.3 9A9 9 0 1 1 3 14.5"/><path d="M1.8 12h4l2.1-4 3.3 8 2.2-4h8.7"/>',
 spo2:'<path d="M12 3.5v9"/><path d="M9 5.3c-1.7.5-2.4 2.2-3.3 3.7l-2.6 4.3c-1.8 3.2.1 6.7 3.4 6.7 2.8 0 4.2-2.3 4.2-4.6V8.8"/><path d="M15 5.3c1.7.5 2.4 2.2 3.3 3.7l2.6 4.3c1.8 3.2-.1 6.7-3.4 6.7-2.8 0-4.2-2.3-4.2-4.6V8.8"/><text x="13.4" y="23" font-size="5.3" font-weight="800" stroke="none" fill="currentColor">O₂</text>',
 glucose:'<path d="M12 2.4c-2.9 4.1-6.5 8.4-6.5 12.3a6.5 6.5 0 0 0 13 0C18.5 10.8 14.9 6.5 12 2.4Z"/><path d="M9.5 14.5h5M12 12v5"/>',
 weight:'<rect x="3" y="4.5" width="18" height="15.5" rx="3"/><path d="M9 9h6"/><path d="M12 9v3.4"/><path d="M7 16.5h10"/>',
 sleep:'<path d="M20.7 15.7A8.8 8.8 0 0 1 8.3 3.2 9 9 0 1 0 20.7 15.7Z"/><path d="M18.5 3v4M16.5 5h4"/>',
 exercise:'<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10M2 10v4M22 10v4"/>',
 steps:'<path d="M7.2 9.5c-2.1 1.5-3.9 5.5-2.4 8.3 1.1 2.1 4.8 1.4 5.6-.5.8-1.9-.1-4.2-3.2-7.3"/><path d="M15.7 5.6c-1.4 2.2-1.5 4.8.4 6.1 2.6 1.7 5.2-.1 5.1-2.6-.1-2.1-2.2-5.2-3.9-6.5"/><circle cx="5.3" cy="5.1" r="1"/><circle cx="8.4" cy="3.6" r=".8"/><circle cx="11" cy="4.5" r=".7"/><circle cx="18.5" cy="17.4" r="1"/><circle cx="15.4" cy="19.5" r=".8"/>',
 calories:'<path d="M12 22c-4.5 0-7.7-3.5-7.7-7.9 0-3.2 1.8-5.4 4.4-7.6.2 3 2.1 4 2.6 4.2C12 7.9 15.9 5.8 15 2.5c4.9 3.8 6 7.8 6 11.6 0 4.4-3.9 7.9-9 7.9Z"/><path d="M12 20c-2.2 0-3.9-1.7-3.9-4 0-1.3.7-2.6 2-3.6.2 1.4 1.2 1.7 1.5 1.9.4-1.8 2.3-2.7 2.4-4.1 1.5 1.7 2.2 3.6 2.2 5.7 0 2.4-1.8 4.1-4.2 4.1Z"/>'
};
var KEYS=['bp','pulse','spo2','glucose','weight','sleep','exercise','steps','calories'];
var observer=null;
function iconMarkup(key){
 return '<svg class="hhKpiSvg560" viewBox="0 0 24 24" width="25" height="25"'+
 ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'+
 ' stroke-linejoin="round" aria-hidden="true" focusable="false">'+ICONS[key]+'</svg>';
}
function decorate(){
 var card=document.querySelector('#health .kpiCard');
 if(!card)return 0;
 var tiles=card.querySelectorAll('.hhLiveGrid .hhLiveKpi'),changed=0;
 Array.prototype.forEach.call(tiles,function(tile){
  var key=null;
  for(var i=0;i<KEYS.length;i++){if(tile.classList.contains(KEYS[i])){key=KEYS[i];break;}}
  if(!key)return;
  var icon=tile.querySelector('.hhLiveIcon');
  if(!icon||icon.getAttribute('data-hh-icon-version')==='560')return;
  icon.innerHTML=iconMarkup(key);
  icon.setAttribute('aria-hidden','true');
  icon.setAttribute('data-hh-icon-version','560');
  tile.setAttribute('data-hh-icon-kind',key);
  changed++;
 });
 return changed;
}
function init(){
 decorate();
 var card=document.querySelector('#health .kpiCard');
 if(card&&typeof root.MutationObserver==='function'&&!observer){
  observer=new root.MutationObserver(function(){decorate();});
  observer.observe(card,{childList:true,subtree:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.addEventListener('pageshow',init);
root.addEventListener('healthhub:profile-changed',function(){root.setTimeout(decorate,160);});
root.HH_HEALTH_KPI_ICONS_V560=Object.freeze({refresh:decorate,keys:KEYS.slice()});
})(window);
