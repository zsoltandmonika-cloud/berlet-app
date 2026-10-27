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
 const IDS=new Set(['260','17','19']);
 const PROFILES=['zsolt','monika'];
 const hidden={zsolt:new Set(),monika:new Set()};
 const normalizeProfile=x=>x==='monika'?'monika':'zsolt';
 if(w&&w.localStorage)try{
  const saved=JSON.parse(w.localStorage.getItem(KEY)||'null');
  if(saved&&typeof saved==='object')for(const p of PROFILES){
   if(Array.isArray(saved[p]))for(const id of saved[p]){
    if(IDS.has(String(id)))hidden[p].add(String(id));
   }
  }
 }catch(_){}
 function enabled(id,profile){
  id=String(id);return IDS.has(id)&&!hidden[normalizeProfile(profile)].has(id);
 }
 function setEnabled(id,value,profile){
  id=String(id);if(!IDS.has(id))return false;
  const p=normalizeProfile(profile),next=!!value,previous=enabled(id,p);
  if(next)hidden[p].delete(id);else hidden[p].add(id);
  if(previous===next)return true;
  if(w&&w.localStorage)try{
   w.localStorage.setItem(KEY,JSON.stringify({
    zsolt:[...hidden.zsolt],monika:[...hidden.monika]
   }));
  }catch(_){}
  if(w&&typeof w.dispatchEvent==='function'&&typeof w.CustomEvent==='function')
   w.dispatchEvent(new w.CustomEvent('hh-bkk-live-per-line-v909-changed',{
    detail:{profile:p,routeId:id,enabled:next}
   }));
  return true;
 }
 return {enabled,setEnabled,KEY,version:'909'};
});
