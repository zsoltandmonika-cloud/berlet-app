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
 const ROUTE_KEY=/^(?:bus|tram|trolley|metro|hev|other):[A-Za-z0-9_-]{1,16}$/;
 const LEGACY={260:'bus:260',17:'tram:17',19:'tram:19',1:'tram:1',41:'tram:41'};
 const MAX_AGE_MS=90000;
 function validate(snapshot,now=Date.now(),maxVehicles=1200){
  if(!snapshot||snapshot.schemaVersion!==1||snapshot.source!=='BKK Zrt., CC BY 4.0'||snapshot.feedType!=='GTFS-RT VehiclePositions')return {ok:false,reason:'invalid-source',vehicles:[]};
  const stamp=Date.parse(snapshot.generatedAt);
  if(!Number.isFinite(stamp)||stamp>now+10000||now-stamp>MAX_AGE_MS)return {ok:false,reason:'stale',vehicles:[]};
  if(!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>3500||!Array.isArray(snapshot.vehicles)||snapshot.vehicles.length>maxVehicles)return {ok:false,reason:'invalid-vehicles',vehicles:[]};
  const vehicles=[];const seen=new Set();
  for(const v of snapshot.vehicles){
   if(!v||typeof v.routeId!=='string'||v.routeId.length>16||typeof v.id!=='string'||!v.id||v.id.length>128||seen.has(v.id))continue;
   const key=typeof v.routeKey==='string'?v.routeKey:LEGACY[v.routeId];
   if(!key||!ROUTE_KEY.test(key)||key.split(':')[1]!==v.routeId||(v.mode!==undefined&&v.mode!==key.split(':')[0]))continue;
   if(!Number.isFinite(v.lat)||!Number.isFinite(v.lng)||Math.abs(v.lat)>90||Math.abs(v.lng)>180)continue;
   const timestamp=Date.parse(v.timestamp);
   if(!Number.isFinite(timestamp)||timestamp>now+10000||now-timestamp>MAX_AGE_MS)continue;
   seen.add(v.id);
   // Public GTFS-RT vehicle descriptors, not arbitrary marker/entity IDs.
   const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
   vehicles.push({id:v.id,routeId:v.routeId,routeKey:key,mode:key.split(':')[0],
    lat:v.lat,lng:v.lng,timestamp:v.timestamp,headsign:clean(v.headsign,120),
    vehicleLabel:clean(v.vehicleLabel,64),vehicleNumber:clean(v.vehicleNumber,64),
    licensePlate:clean(v.licensePlate,32)});
  }
  return {ok:true,reason:null,generatedAt:snapshot.generatedAt,vehicles};
 }
 return {validate,MAX_AGE_MS};
});
