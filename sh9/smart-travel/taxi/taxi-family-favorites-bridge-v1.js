/* SHO Smart Taxi · Shared family favorites, read-only bridge v1.
 * Reuses exactly the Family Guard / Smart Trip 40-slot family favorites API.
 * No copy of the favorites table, no local writes, no GPS fallback.
 * Returned coordinates are the saved location of the selected place.
 */
(function(w){'use strict';
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('hu-HU').trim();
 const valid=p=>p&&typeof p.name==='string'&&p.name.trim().length>=3&&
  Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&
  Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180;
 function find(query='',limit=6){
  const api=w.HH_TRAVEL_FAVORITES_V972;
  if(!api?.favoritePlaces)return [];
  let list=[];
  try{list=api.favoritePlaces()||[]}catch(_){return []}
  const term=fold(query),max=Math.max(1,Math.min(40,Number(limit)||6)),seen=new Set();
  return list.filter(valid).filter(p=>!term||
   [p.displayName,p.name,p.subtitle].some(v=>fold(v).includes(term)))
   .map(p=>{
    const label=p.name.trim().slice(0,130),displayName=String(p.displayName||'Kedvenc').trim().slice(0,40);
    return {label,displayName,subtitle:String(p.subtitle||'').trim().slice(0,160),
     location:{lat:Number(p.lat),lng:Number(p.lng)},favorite:true};
   }).filter(p=>{
    const key=p.location.lat.toFixed(5)+':'+p.location.lng.toFixed(5);
    if(seen.has(key))return false;
    seen.add(key);return true;
   }).slice(0,max);
 }
 function sync(){const api=w.HH_TRAVEL_FAVORITES_V972;return api?.sync?.()||Promise.resolve(false)}
 w.SHO_TAXI_FAVORITES_V1=Object.freeze({find,sync});
})(window);
