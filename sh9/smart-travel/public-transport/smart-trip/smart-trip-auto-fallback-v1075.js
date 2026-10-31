/* SH9 Smart Trip AI v1075: verified routing failure -> same-tab public Google Maps.
 * Only called after one explicitly submitted SH9 search with valid places/time.
 * No popup, no new API cost, no additional click, no background navigation.
 * Google Maps URL supports transit but does NOT preserve date/arrive-by settings.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_AUTO_FALLBACK_V1075=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function valid(q){
  return !!q&&typeof q.from==='string'&&q.from.trim().length>=2&&
   typeof q.to==='string'&&q.to.trim().length>=2&&
   q.from.trim().toLocaleLowerCase('hu-HU')!==q.to.trim().toLocaleLowerCase('hu-HU')&&
   ['now','depart','arrive'].includes(q.mode)&&
   /^\d{4}-\d{2}-\d{2}$/.test(q.date)&&
   /^([01]\d|2[0-3]):[0-5]\d$/.test(q.time);
 }
 function url(model,q,places){
  if(!valid(q)||typeof model?.mapsUrl!=='function')return null;
  const link=model.mapsUrl(q,places);
  if(typeof link!=='string')return null;
  try{
   const target=new URL(link);
   if(target.origin!=='https://www.google.com'||target.pathname!=='/maps/dir/'||
      target.searchParams.get('api')!=='1'||
      target.searchParams.get('travelmode')!=='transit'||
      !target.searchParams.get('destination'))return null;
   return target.toString();
  }catch(_){return null}
 }
 function go(model,q,places,location){
  const target=url(model,q,places);
  if(!target||typeof location?.assign!=='function')return false;
  try{location.assign(target);return true}catch(_){return false}
 }
 return Object.freeze({valid,url,go});
});
