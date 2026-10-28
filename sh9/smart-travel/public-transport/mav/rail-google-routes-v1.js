/* MÁV Smart Rail B-plan: Google Routes API / public transit adapter.
 * Pure JS and inert until explicitly enabled with a secured server endpoint.
 * Google response => native journey cards. No API key, fetch or billing here.
 * This is Google journey information, NOT MÁV realtime delay/platform/GPS.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SH9_MAV_GOOGLE_ROUTES_V1=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const RAIL=new Set(['RAIL','TRAIN','HEAVY_RAIL','COMMUTER_TRAIN','HIGH_SPEED_TRAIN','LONG_DISTANCE_TRAIN','OTHER_RAIL','INTERCITY_BUS_RAIL']);
const MAX_RESULT=4;
const text=(v,max=100)=>String(v??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,max);
const parseTime=(v)=>{const d=new Date(v);return Number.isFinite(d.getTime())?d:null;};
function request(query){
 if(!query||!['now','depart','arrive'].includes(query.mode))return null;
 const from=text(query.from,120),to=text(query.to,120);
 const when=parseTime(query.when);
 if(from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu')||!when)return null;
 const req={origin:{address:from},destination:{address:to},travelMode:'TRANSIT',
  computeAlternativeRoutes:true,languageCode:'hu',units:'METRIC',
  transitPreferences:{routingPreference:'FEWER_TRANSFERS',allowedTravelModes:['RAIL','TRAIN']}};
 if(query.mode==='arrive')req.arrivalTime=when.toISOString();
 else req.departureTime=when.toISOString();
 return req;
}
function normalizeResponse(payload,query,now=new Date()){
 if(!request(query)||!payload||!Array.isArray(payload.routes)||payload.routes.length>16)return null;
 const journeys=[];
 for(const r of payload.routes.slice(0,MAX_RESULT)){
  if(!r||!Array.isArray(r.legs)||r.legs.length<1||r.legs.length>8)continue;
  const segments=[];
  let hasRail=false;
  for(const l of r.legs){
   if(!Array.isArray(l.steps)||l.steps.length>100){segments.length=0;break}
   for(const step of l.steps){
    const t=step?.transitDetails;
    const data=t?.stopDetails,vehicle=t?.transitLine?.vehicle?.type;
    if(!data||!step.travelMode||step.travelMode!=='TRANSIT')continue;
    const start=parseTime(data.departureTime),end=parseTime(data.arrivalTime);
    const from=text(data.departureStop?.name),to=text(data.arrivalStop?.name);
    if(!start||!end||end<=start||!from||!to)continue;
    const mode=text(vehicle,35);
    hasRail ||= RAIL.has(mode);
    const service=text(t.transitLine?.nameShort||t.transitLine?.name||mode||'Tömegközlekedés',55);
    const agency=text(t.transitLine?.agencies?.[0]?.name||'',55);
    segments.push({service,agency,vehicleType:mode,from,to,departure:start.toISOString(),arrival:end.toISOString(),
     headsign:text(t.headsign||'',75)});
   }
  }
  if(!hasRail||!segments.length||segments.length>12)continue;
  let valid=true;
  for(let k=1;k<segments.length;k++)if(Date.parse(segments[k].departure)<Date.parse(segments[k-1].arrival))valid=false;
  if(!valid)continue;
  const dep=segments[0].departure,arr=segments[segments.length-1].arrival;
  const duration=Math.round((Date.parse(arr)-Date.parse(dep))/60000);
  if(duration<1||duration>24*60)continue;
  journeys.push({legs:segments,departure:dep,arrival:arr,durationMinutes:duration,
   transfers:segments.length-1,live:false,platform:null,delayMinutes:null});
 }
 return {status:'ok',source:'Google Routes API · Google Maps',generatedAt:new Date(now).toISOString(),journeys,
  attribution:'© Google Maps',scheduleOnly:true};
}
return Object.freeze({RAIL,request,normalizeResponse});
});
