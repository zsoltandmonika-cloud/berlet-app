/* HH Nutrition v1201 · read-only animated eight-step water ruler.
 * Reads the EXISTING hydrated jug's aria-label ("last empty ... N ml")
 * rather than calculating or storing water independently. The original
 * click handlers, journal, water/goal data, pitcher levels, RAG and sync are
 * untouched. One MutationObserver; no timer or polling needed.
 */
(function(){
 'use strict';
 function init(){
  var meter=document.getElementById('hhWaterStepsV1201');
  var gauge=document.querySelector('#balanceCard .hh-water-gauge');
  var count=document.getElementById('hhWaterStepsCountV1201');
  if(!meter||!gauge||!count)return;
  var segments=Array.from(meter.querySelectorAll('.hh-water-steps-bars-v1201 > span'));
  if(segments.length!==8)return;
  var previous=-1;
  function refresh(){
   var source=gauge.getAttribute('aria-label')||'';
   // The hydration engine provides the measured milliliters since the last
   // actual jar empty via this existing accessibility label.
   var m=source.match(/utolsó ürítés óta\s*([\d\s.,\u00a0\u202f]+)\s*ml/i);
   var ml=m?Number(m[1].replace(/[^0-9]/g,'')):NaN;
   if(!Number.isFinite(ml)){ // No configured goal, unknown live jug reading.
    meter.removeAttribute('aria-valuenow');
    meter.setAttribute('aria-valuetext','Nincs beállított vízszint');
    count.textContent='— / 8';
    segments.forEach(function(s){s.classList.remove('is-full-v1201','just-filled-v1201');});
    previous=-1;
    return;
   }
   ml=Math.max(0,Math.round(ml));
   var steps=Math.min(8,Math.floor(ml/250));
   meter.setAttribute('aria-valuenow',String(Math.min(2000,ml)));
   meter.setAttribute('aria-valuetext',steps+' teljes 250 milliliteres szint a nyolcból; kancsóban '+ml+' ml');
   count.textContent=String(steps)+' / 8';
   if(steps===previous)return;
   segments.forEach(function(s,i){
    var full=i<steps;
    s.classList.toggle('is-full-v1201',full);
    s.classList.toggle('just-filled-v1201',full && (previous>=0 && i>=previous));
   });
   previous=steps;
  }
  var observer=new MutationObserver(refresh);
  observer.observe(gauge,{attributes:true,attributeFilter:['aria-label']});
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
