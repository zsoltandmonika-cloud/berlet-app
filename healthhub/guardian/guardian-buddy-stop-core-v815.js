/* v815 pure, independently testable BKK arrival/departure rules.
 * Only source-verified BKK route stops and real fixes trigger. A distance to a
 * platform is an approximate arrival cue, NOT proof of boarding/vehicle stop.
 */
(function(root,factory){const x=factory();if(typeof module==='object'&&module.exports)module.exports=x;
 if(root)root.HH_BUDDY_STOP_CORE_V815=Object.freeze(x)})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_GPS_AGE=20000,MAX_BUS_AGE=90000,RADIUS=100;
 const rad=n=>n*Math.PI/180;
 function distance(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  const dlat=rad(a.lat-b.lat),dlng=rad(a.lng-b.lng);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
 }
 function validateRoutes(doc,now=Date.now()){
  if(!doc||doc.schemaVersion!==1||doc.source!=='BKK Zrt., CC BY 4.0'||!doc.routes||typeof doc.routes!=='object')return null;
  const date=Date.parse(doc.generatedAt||'');
  if(!Number.isFinite(date)||date>now+60000||now-date>14*86400000)return null;
  const routes={};
  for(const id of ['260','17','19']){
   const original=doc.routes[id];if(!original||!Array.isArray(original.variants))return null;
   const variants=[];
   for(const v of original.variants){
    if(!v||!Array.isArray(v.stops)||v.stops.length<2||typeof v.headsign!=='string')continue;
    const stops=v.stops.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&
      p.name.length<=120&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
      Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180)
      .map(p=>({id:p.id,name:p.name,lat:p.lat,lng:p.lng}));
    if(stops.length>=2)variants.push({headsign:v.headsign,stops});
   }
   if(!variants.length)return null;
   routes[id]={mode:original.mode,variants};
  }
  return routes;
 }
 function leadStop(variant,targetId){
  if(!variant||!Array.isArray(variant.stops))return null;
  const i=variant.stops.findIndex(s=>s.id===targetId);
  return i>0?variant.stops[i-1]:null;
 }
 function currentFix(pos,now=Date.now()){
  const c=pos&&pos.coords||{};
  const timestamp=Number(pos&&pos.timestamp);
  if(!Number.isFinite(timestamp)||timestamp>now+5000||now-timestamp>MAX_GPS_AGE||
    !Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
    !Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>50)return null;
  return {lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,timestamp};
 }
 function liveBus(v,expectedHead,now=Date.now()){
  if(!v||v.routeId!=='260'||typeof v.id!=='string'||!v.id||v.headsign!==expectedHead)return null;
  const timestamp=Date.parse(v.timestamp||'');
  if(!Number.isFinite(timestamp)||timestamp>now+10000||now-timestamp>MAX_BUS_AGE||
    !Number.isFinite(v.lat)||!Number.isFinite(v.lng))return null;
  return {lat:v.lat,lng:v.lng,id:v.id,timestamp};
 }
 function detection(oldDistance,newDistance,radius=RADIUS){
  // Require real approach from outside and a fresh inside fix, not an
  // initial position already near the stop or a repeated stationary reading.
  return Number.isFinite(oldDistance)&&Number.isFinite(newDistance)&&
    oldDistance>radius+35&&newDistance<=radius&&newDistance<oldDistance;
 }
 return {distance,validateRoutes,leadStop,currentFix,liveBus,detection,RADIUS};
});
