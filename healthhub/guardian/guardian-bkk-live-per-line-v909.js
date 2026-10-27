/* Family Guard v909 · independent live-vehicle selection per favorite route.
 * Presentation preference only: never changes catalog favorites, static GTFS,
 * Family Guard GPS, or polling. Defaults to all eligible favorites visible.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_LIVE_PER_LINE_V909=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const KEY='hh-bkk-live-disabled-per-profile-v909';
 const ROUTE_KEY=/^(?:bus|tram|trolley|metro|hev|other):[A-Za-z0-9_-]{1,16}$/;
 const LEGACY={260:'bus:260',17:'tram:17',19:'tram:19',1:'tram:1',41:'tram:41'};
 const canonical=v=>typeof v==='string'?(ROUTE_KEY.test(v)?v:Object.prototype.hasOwnProperty.call(LEGACY,v)?LEGACY[v]:null):null;
 const PROFILES=['zsolt','monika'];
 const hidden={zsolt:new Set(),monika:new Set()};
 const normalizeProfile=x=>x==='monika'?'monika':'zsolt';
 if(w&&w.localStorage)try{
  const saved=JSON.parse(w.localStorage.getItem(KEY)||'null');
  if(saved&&typeof saved==='object')for(const p of PROFILES){
   if(Array.isArray(saved[p]))for(const id of saved[p]){
    const key=canonical(id);if(key)hidden[p].add(key);
   }
  }
 }catch(_){}
 function enabled(id,profile){
  const key=canonical(String(id));return !!key&&!hidden[normalizeProfile(profile)].has(key);
 }
 function setEnabled(id,value,profile){
  const key=canonical(String(id));if(!key)return false;
  const p=normalizeProfile(profile),next=!!value,previous=enabled(key,p);
  if(next)hidden[p].delete(key);else hidden[p].add(key);
  if(previous===next)return true;
  if(w&&w.localStorage)try{
   w.localStorage.setItem(KEY,JSON.stringify({
    zsolt:[...hidden.zsolt],monika:[...hidden.monika]
   }));
  }catch(_){}
  if(w&&typeof w.dispatchEvent==='function'&&typeof w.CustomEvent==='function')
   w.dispatchEvent(new w.CustomEvent('hh-bkk-live-per-line-v909-changed',{
    detail:{profile:p,routeKey:key,routeId:key.split(':')[1],enabled:next}
   }));
  return true;
 }
 return {enabled,setEnabled,KEY,version:'911'};
});
