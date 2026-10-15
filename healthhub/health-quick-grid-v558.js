/* HealthHub v558 | Remove only the redundant "Továbbiak" QUICK TILE
   from the Egészség grid. The bottom navigation More/Admin remains untouched. */
(function(root){
 'use strict';
 var observer=null,watched=null;
 function removeDuplicate(){
  var health=document.getElementById('health');
  var grid=health&&health.querySelector('.quick');
  if(!grid)return false;
  var removed=false;
  Array.prototype.slice.call(grid.children).forEach(function(tile){
   if(!tile.matches||!tile.matches('.q'))return;
   var visible=String(tile.textContent||'').replace(/\s+/g,'').trim().toLocaleLowerCase('hu-HU');
   if(visible!=='továbbiak')return;
   /* This is the Health quick-access tile, NOT the footer button. */
   tile.remove();removed=true;
  });
  return removed;
 }
 function init(){
  var health=document.getElementById('health');
  if(!health)return;
  removeDuplicate();
  if(typeof root.MutationObserver==='function'&&watched!==health){
   if(observer)observer.disconnect();
   watched=health;
   observer=new root.MutationObserver(function(records){
    if(records.some(function(r){return r.addedNodes&&r.addedNodes.length})){
     removeDuplicate();
    }
   });
   observer.observe(health,{childList:true,subtree:true});
  }
 }
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 root.addEventListener('pageshow',init);
 root.HH_HEALTH_QUICK_GRID_V558=Object.freeze({refresh:removeDuplicate});
})(window);
