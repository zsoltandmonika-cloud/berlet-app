/* v1019 · Leletek + Gyógyszerek: move the existing private-data banner to the
   end of content (after Medical Master on Leletek). Presentation only.
   The original banner DOM node, text updates and privacy controls are kept.
   All other HealthRadar subpages retain the normal banner position. */
(function(w,d){
 'use strict';
 var anchor=null,observed=null,queued=false;
 function place(){
  var section=d.getElementById('healthSection');
  var banner=d.getElementById('healthMigrationBanner');
  var content=d.getElementById('healthSubContent');
  if(!section||!banner||!content||!content.parentNode)return;
  // Remember the genuine original insertion point rather than recreating
  // this live status element, which receives asynchronous text updates.
  if(!anchor||!anchor.isConnected){
   anchor=d.createComment('HealthRadar status original position');
   banner.parentNode.insertBefore(anchor,banner);
  }
  if(w.healthSectionKind==='records'||w.healthSectionKind==='medications'){
   if(content.nextElementSibling!==banner)content.after(banner);
   banner.dataset.hhRecordsBottom='on';
  }else{
   if(anchor.parentNode&&anchor.nextSibling!==banner)
    anchor.parentNode.insertBefore(banner,anchor.nextSibling);
   delete banner.dataset.hhRecordsBottom;
  }
 }
 function schedule(){
  if(queued)return;queued=true;
  var run=function(){queued=false;place()};
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(run);
  else w.setTimeout(run,30);
 }
 function init(){
  var section=d.getElementById('healthSection');
  if(!section)return;
  place();
  if(observed===section)return;
  if(observed)observed=null;
  observed=section;
  // Only DOM changes inside the HealthRadar subpage, never the whole app.
  new MutationObserver(schedule).observe(section,{childList:true,subtree:true});
  w.addEventListener('healthhub:profile-changed',schedule);
  d.addEventListener('click',function(e){
   if(section.contains(e.target)||e.target.closest?.('#health .quick'))
    w.setTimeout(schedule,0);
  },true);
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window,document);
