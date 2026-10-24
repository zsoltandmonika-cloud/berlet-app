/* SH9 Smart Travel world clocks v2 · four independent DST-aware local times.
 * No API key, network access, tracking, location permission or custom UTC offsets.
 * Local browser Date/Intl used, clock labels intentionally kept short for S24 Ultra.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object' && module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRAVEL_CLOCKS_V2=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const ZONES=Object.freeze(['America/New_York','Europe/London','Europe/Paris','Europe/Budapest']);
 const FORMATTERS=new Map();
 function cityTime(zone,date){
  if(!ZONES.includes(zone))return null;
  const d=date instanceof Date?date:new Date(date);
  if(!Number.isFinite(d.getTime()))return null;
  let fmt=FORMATTERS.get(zone);
  if(!fmt){
   try{fmt=new Intl.DateTimeFormat('hu-HU',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}
   catch(e){return null;}
   FORMATTERS.set(zone,fmt);
  }
  return fmt.format(d);
 }
 function update(doc,date){
  if(!doc||!doc.querySelectorAll)return;
  const now=date||new Date();
  doc.querySelectorAll('[data-st-zone]').forEach(function(el){
   const value=cityTime(el.getAttribute('data-st-zone'),now);
   el.textContent=value||'--:--';
   if(value)el.setAttribute('title',el.parentNode.querySelector('.st-city').textContent+' · '+value);
  });
 }
 function init(){
  const doc=w&&w.document;
  if(!doc||!doc.querySelector('[data-st-zone]'))return;
  let minute=null;
  function tick(){
   if(doc.hidden)return;
   const now=new Date();
   const current=Math.floor(now.getTime()/60000);
   if(minute===current)return;
   minute=current;
   update(doc,now);
  }
  // Always refresh immediately on focus/resume; local DST transitions are calculated by Intl.
  tick();
  w.setInterval(tick,1000);
  doc.addEventListener('visibilitychange',function(){minute=null;tick()});
  w.addEventListener('pageshow',function(){minute=null;tick()});
  w.addEventListener('focus',function(){minute=null;tick()});
  const link=doc.getElementById('stFlightTracker');
  if(link && /Android|iPhone|iPad|iPod/i.test(String(w.navigator&&w.navigator.userAgent||''))){
   link.addEventListener('click',function(event){
    // In the SH9 Android WebView, _blank is not guaranteed to open an external browser.
    event.preventDefault();
    w.location.assign(link.href);
   });
  }
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
 return Object.freeze({cityTime:cityTime,update:update,ZONES:ZONES,version:'2.0'});
});
