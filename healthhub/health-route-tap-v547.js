/* HealthHub v547 | Early Health tap recovery. Visual layers unchanged. */
(function(root){
 'use strict';
 function route(){
  var page=document.getElementById('health');
  if(!page)return false;
  try{if(typeof root.show==='function')root.show('health')}
  catch(err){if(root.console&&root.console.warn)root.console.warn('Health route fallback',err)}
  if(!page.classList.contains('on')){
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on')});
    page.classList.add('on');
    ['navHomeBar','navTimelineBar','navDetailBar','navHealthBar'].forEach(function(id){
      var n=document.getElementById(id);if(n)n.style.display=id==='navHealthBar'?'grid':'none';
    });
    try{root.scrollTo(0,0)}catch(_){}
  }
  return page.classList.contains('on');
 }
 function fromNav(t){
  var b=t&&t.closest&&t.closest('button');
  if(!b||!b.closest('#navHomeBar, #navHealthBar, #navTimelineBar, #navDetailBar'))return false;
  return (b.getAttribute('onclick')||'').indexOf("show('health')")>=0;
 }
 function fromTile(e){
  var home=document.getElementById('home');
  if(!home||!home.classList.contains('on'))return false;
  var tile=document.querySelector('#home .hhpg-tile[data-key="health"]');
  if(!tile)return false;
  if(e.target&&e.target.closest&&e.target.closest('#home .hhpg-tile[data-key="health"]')===tile)return true;
  if(typeof e.clientX!=='number'||typeof e.clientY!=='number')return false;
  var r=tile.getBoundingClientRect();
  return r.width>0&&r.height>0&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
 }
 function onClick(e){
  if(e.button!=null&&e.button!==0)return;
  if(!fromTile(e)&&!fromNav(e.target))return;
  var picker=document.getElementById('overlay');
  if(picker&&picker.classList.contains('on'))return;
  e.preventDefault();e.stopPropagation();
  if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  var ok=route();
  document.documentElement.dataset.hhHealthTapResult=ok?'open':'failed';
  if(!ok&&root.toast)root.toast('Az Egészség modul nem nyitható meg. Ellenőrizd a betöltést.');
 }
 root.addEventListener('click',onClick,true);
 root.HH_HEALTH_ROUTE_V547=Object.freeze({open:route});
})(window);
