/* SH9 MÁV Smart Rail v1 · public, low-usage station-to-station transit handoff.
 * Google Maps transit handoff is not a rail-only timetable or MÁV live feed.
 * No direct MÁVPlusz deep link is assumed without documented support.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_RAIL_V1=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const DEFAULT={from:'Budapest-Keleti pályaudvar',to:'Kazincbarcika vasútállomás'};
 const MAPS='https://www.google.com/maps/dir/?api=1';
 const OFFICIAL=Object.freeze({
  planner:'https://mavplusz.hu/',
  live:'https://vonatinfo.mav.hu/map.aspx',
  alerts:'https://www.mavcsoport.hu/mavinform',
  gtfs:'https://www.mavcsoport.hu/gtfs-igenybejelento'
 });
 function station(value){
  if(typeof value!=='string')return null;
  const s=value.trim().replace(/\s+/g,' ');
  // Only plain station names, never HTML, code, or externally supplied URLs.
  if(s.length<2||s.length>100||/[<>\u0000-\u001f\u007f]/.test(s))return null;
  if(/^(?:https?:|javascript:|data:)/i.test(s))return null;
  return s;
 }
 function journey(from,to){
  const a=station(from),b=station(to);
  if(!a||!b||a.toLocaleLowerCase('hu-HU')===b.toLocaleLowerCase('hu-HU'))return null;
  return {from:a,to:b};
 }
 function directionsUrl(from,to){
  const j=journey(from,to);
  if(!j)return null;
  const u=new URL(MAPS);
  u.searchParams.set('origin',j.from);
  u.searchParams.set('destination',j.to);
  u.searchParams.set('travelmode','transit');
  return u.toString();
 }
 function normalizeFavorites(rows){
  if(!Array.isArray(rows))return [];
  const seen=new Set(),out=[];
  for(const row of rows.slice(0,60)){
   const j=row&&journey(row.from,row.to);
   if(!j)continue;
   const key=(j.from+'|'+j.to).toLocaleLowerCase('hu-HU');
   if(seen.has(key))continue;
   seen.add(key);out.push(j);if(out.length>=12)break;
  }
  return out;
 }
 return Object.freeze({DEFAULT,OFFICIAL,station,journey,directionsUrl,normalizeFavorites});
});
