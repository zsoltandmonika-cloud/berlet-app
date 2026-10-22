/* Smart Arrival v793: fail-closed BKK live position snapshot validation.
 * Input must come from a trusted server that holds the BKK API key.
 * This module never fetches BKK directly or manufactures positions.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_LIVE_V793=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ROUTES=new Set(['260','17','19']);
 const MAX_AGE_MS=90000;
 function validate(snapshot,now=Date.now()){
  if(!snapshot||snapshot.schemaVersion!==1||snapshot.source!=='BKK Zrt., CC BY 4.0'||snapshot.feedType!=='GTFS-RT VehiclePositions')return {ok:false,reason:'invalid-source',vehicles:[]};
  const stamp=Date.parse(snapshot.generatedAt);
  if(!Number.isFinite(stamp)||stamp>now+10000||now-stamp>MAX_AGE_MS)return {ok:false,reason:'stale',vehicles:[]};
  if(!Array.isArray(snapshot.vehicles))return {ok:false,reason:'invalid-vehicles',vehicles:[]};
  const vehicles=[];const seen=new Set();
  for(const v of snapshot.vehicles){
   if(!v||!ROUTES.has(String(v.routeId))||typeof v.id!=='string'||!v.id||seen.has(v.id))continue;
   if(!Number.isFinite(v.lat)||!Number.isFinite(v.lng)||Math.abs(v.lat)>90||Math.abs(v.lng)>180)continue;
   const timestamp=Date.parse(v.timestamp);
   if(!Number.isFinite(timestamp)||timestamp>now+10000||now-timestamp>MAX_AGE_MS)continue;
   seen.add(v.id);
   vehicles.push({id:v.id,routeId:String(v.routeId),lat:v.lat,lng:v.lng,timestamp:v.timestamp,headsign:typeof v.headsign==='string'?v.headsign.slice(0,120):''});
  }
  return {ok:true,reason:null,generatedAt:snapshot.generatedAt,vehicles};
 }
 return {validate,MAX_AGE_MS};
});
