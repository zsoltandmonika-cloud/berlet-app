/* HealthHub v1016 · LELETEK ONLY: one existing search input moves into
   the hero beside the canonical profile pill. Never clone or rebind the input;
   moving it preserves all original input handlers, search values and data.
   Restore its original location on other HealthRadar subpages.
   ?hhrecords1016=0 bypasses this visual update. */
(function(w,d){
 'use strict';
 var qs;try{qs=new URLSearchParams(w.location.search)}catch(_){qs=null}
 if(qs&&(qs.get('hhrecords1016')==='0'||qs.get('hhrecords1015')==='0'||qs.get('hhpremium')==='0'))return;
 var original=null,source=null,scheduled=false,observer=null;
 function locate(){
  var page=d.getElementById('healthSection');
  var hero=page&&page.querySelector('.healthSubHero');
  var input=page&&page.querySelector('#healthSearch');
  var search=input&&input.closest('.healthSearchWrap');
  return {page:page,hero:hero,input:input,search:search};
 }
 function reconcile(){
  var parts=locate(),page=parts.page,hero=parts.hero,input=parts.input,search=parts.search;
  if(!page||!hero||!search||!input)return;
  var records=w.healthSectionKind==='records';
  if(records){
   if(!original||!original.isConnected){
    // Anchor is retained at the exact original search location in the
    // scroll body; never throw away the original form or handler.
    if(search.parentNode!==hero){
     original=d.createComment('Leletek search original slot v1016');
     search.parentNode.insertBefore(original,search);
     source=search.parentNode;
    }
   }
   if(search.parentNode!==hero)hero.appendChild(search);
   page.dataset.hhRecordsSearchV1016='on';
   if(search.dataset.hhRecordsSearchPill!=='on'){
    search.dataset.hhRecordsSearchPill='on';
    search.dataset.hhOriginalPlaceholder=input.getAttribute('placeholder')||'';
    input.placeholder='Lelet keresése…';
    input.setAttribute('aria-label','Keresés a leletek között');
   }
   // The canonical sort button can be relocated without rebinding its inline
   // click handler; no second 'Sort' button and no duplicated result counter.
   var section=page.querySelector('#healthSubContent .hhDocs1015');
   if(section){
    var heading=section.querySelector('.hhRsmHeading');
    var sort=section.querySelector('button[onclick*="hhToggleDocSort"]');
    if(heading&&sort&&sort.parentElement!==heading){
     heading.appendChild(sort);
     sort.classList.add('hhDocs1016Sort');
     section.dataset.hhDocsCompactV1016='on';
     // The result count remains visible in the filters heading; only its
     // redundant legacy summary row is hidden by scoped CSS.
    }
   }
  }else{
   if(search.dataset.hhRecordsSearchPill==='on'){
    input.placeholder=search.dataset.hhOriginalPlaceholder||'Keresés a HealthRadarban…';
    input.setAttribute('aria-label','Keresés a HealthRadarban');
    delete search.dataset.hhRecordsSearchPill;
   }
   if(original&&original.parentNode&&search.parentNode!==original.parentNode){
    original.parentNode.insertBefore(search,original.nextSibling);
   }else if(source&&source.isConnected&&search.parentNode===hero){
    source.insertBefore(search,source.firstChild);
   }
   delete page.dataset.hhRecordsSearchV1016;
  }
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  (w.requestAnimationFrame||function(f){return w.setTimeout(f,30)})(function(){
   scheduled=false;reconcile();
  });
 }
 function boot(){
  var page=d.getElementById('healthSection');
  if(!page)return;
  reconcile();
  if(observer)return;
  observer=new MutationObserver(function(changes){
   if(changes.some(function(c){return c.type==='childList'}))schedule();
  });
  observer.observe(page,{childList:true,subtree:true});
  w.addEventListener('healthhub:profile-changed',schedule);
  w.addEventListener('pageshow',schedule);
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
 var old=w.renderHealthSection;
 if(typeof old==='function')w.renderHealthSection=async function(){
  var value=await old.apply(this,arguments);
  reconcile();
  return value;
 };
 w.HH_RECORDS_HERO_SEARCH_V1016=Object.freeze({version:'1016',refresh:schedule});
})(window,document);
