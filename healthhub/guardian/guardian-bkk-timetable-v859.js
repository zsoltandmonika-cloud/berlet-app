/* Smart Hub v859: official GTFS static stop-time matcher.
 * No manufactured trips or live ETAs; walking estimates are explicitly approximate.
 * The stop-pattern graph and selected GTFS trips must share exact stop IDs.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_TIMETABLE_V859=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SOURCE='BKK Zrt., CC BY 4.0';
 function validate(doc,now=Date.now()){
  if(!doc||doc.source!==SOURCE||doc.schemaVersion!==1||
   doc.feedType!=='BKK GTFS schedule - planned departures, NOT realtime'||
   !Array.isArray(doc.trips)||!Array.isArray(doc.days)||doc.days.length>5||
   doc.trips.length<50||doc.trips.length>250000)return null;
  const stamp=Date.parse(doc.generatedAt||'');
  if(!Number.isFinite(stamp)||stamp>now+60000||now-stamp>36*3600000)return null;
  const out=[];
  for(const row of doc.trips){
   if(!Array.isArray(row)||row.length!==3||typeof row[0]!=='string'||
    typeof row[1]!=='string'||!row[1]||!Array.isArray(row[2])||
    row[2].length<2||row[2].length>300)continue;
   if(!['260','17','19','1','41'].includes(row[0]))continue;
   let prev=-Infinity,stops=[];
   for(const stop of row[2]){
    if(!Array.isArray(stop)||stop.length!==3||typeof stop[0]!=='string'||
     !Number.isInteger(stop[1])||!Number.isInteger(stop[2])||
     stop[1]>stop[2]||stop[1]<prev){stops=[];break}
    prev=stop[2];stops.push(stop);
   }
   if(stops.length>1)out.push({line:row[0],tripId:row[1],stops});
  }
  return out.length>=30?{
   generatedAt:doc.generatedAt,trips:out,
   _index:new Map()
  }:null;
 }
 function walkingMinutes(meters){
  return Number.isFinite(meters)&&meters>=0
   ?Math.ceil(meters/70):null;
 }
 function legMatches(schedule,leg){
  if(!schedule||!leg||!leg.line)return [];
  const routeId=String(leg.line.id),boardId=String(leg.enter?.id||''),
   alightId=String(leg.exit?.id||'');
  if(!boardId||!alightId||boardId===alightId)return [];
  const key=routeId+':'+boardId+':'+alightId;
  if(schedule._index?.has(key))return schedule._index.get(key);
  const matched=[];
  for(const trip of schedule.trips){
   if(trip.line!==routeId)continue;
   let board=null;
   for(const stop of trip.stops){
    if(!board&&stop[0]===boardId){board=stop;continue}
    if(board&&stop[0]===alightId){
     if(stop[1]>board[2])matched.push({
      routeId,tripId:trip.tripId,boardId,alightId,
      board:board[2],alight:stop[1]});
     break;
    }
   }
  }
  matched.sort((a,b)=>a.board-b.board);
  if(schedule._index)schedule._index.set(key,matched);
  return matched;
 }
 function distance(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  const k=Math.PI/180;
  return Math.round(6371000*Math.hypot((a.lat-b.lat)*k,(a.lng-b.lng)*k*
   Math.cos(((a.lat+b.lat)/2)*k)));
 }
 function findTimings(schedule,itinerary,request={mode:'now'},limit=3,now=Date.now()){
  if(!schedule||!itinerary||!Array.isArray(itinerary.legs)||!itinerary.legs.length||
   itinerary.legs.length>5||!Number.isFinite(now))return [];
  const mode=request?.mode||'now';
  if(!['now','depart','arrive'].includes(mode))return [];
  const at=mode==='now'?now:Number(request?.at);
  if(!Number.isFinite(at)||at<now-60000||at>now+36*3600000)return [];
  const approach=walkingMinutes(itinerary.approach);
  const finish=walkingMinutes(itinerary.finish);
  if(approach===null||finish===null)return [];
  const transferWalks=[];
  for(let i=1;i<itinerary.legs.length;i++){
   const a=itinerary.legs[i-1],b=itinerary.legs[i],walk=walkingMinutes(distance(a.exit,b.enter));
   if(walk===null)return [];
   transferWalks.push(walk);
  }
  const choices=itinerary.legs.map(leg=>legMatches(schedule,leg));
  if(choices.some(a=>!a.length))return [];
  const nowMin=Math.ceil(now/60000),atMin=mode==='arrive'?Math.floor(at/60000):Math.ceil(at/60000);
  // Time-bound calculations are only possible for matching published GTFS trips.
  // Arrive-by searches backward up to 4 hours for a feasible connection.
  const minOrigin=mode==='arrive'?Math.max(nowMin,atMin-240):Math.max(nowMin,atMin);
  const maxOrigin=mode==='arrive'?atMin:atMin+90;
  const out=[];
  const first=choices[0].filter(a=>{
   const origin=a.board-approach-1;
   return origin>=minOrigin&&origin<=maxOrigin;
  });
  // For arrive-by, prefer the LATEST candidate departures if service is frequent.
  const candidates=mode==='arrive'?first.slice(-600):first.slice(0,600);
  for(const initial of candidates){
   let previous=initial,legs=[initial],waiting=0,possible=true;
   for(let i=1;i<choices.length;i++){
    const walk=transferWalks[i-1];
    const next=choices[i].find(t=>t.board>=previous.alight+walk+1&&
     t.board<=previous.alight+walk+90);
    if(!next){possible=false;break}
    waiting+=next.board-previous.alight-walk;
    previous=next;legs.push(next);
   }
   if(!possible)continue;
   const originMin=initial.board-approach-1,arrivalMin=previous.alight+finish;
   if(originMin<nowMin||arrivalMin<=originMin||
      (mode==='arrive'&&arrivalMin>atMin))continue;
   out.push({departure:new Date(originMin*60000).toISOString(),
    arrival:new Date(arrivalMin*60000).toISOString(),
    firstBoard:new Date(initial.board*60000).toISOString(),
    departureStop:itinerary.legs[0].enter.name,
    waitMinutes:waiting,
    walkMinutes:approach+finish+transferWalks.reduce((a,b)=>a+b,0),
    walkVerified:false,verified:true,source:'BKK_GTFS',
    generatedAt:schedule.generatedAt,
    matchedLegs:legs.map((t,i)=>({lineId:t.routeId,boardStopId:t.boardId,
     alightStopId:t.alightId,tripId:t.tripId}))
   });
  }
  out.sort((a,b)=>mode==='arrive'
   ?Date.parse(b.departure)-Date.parse(a.departure)||Date.parse(a.arrival)-Date.parse(b.arrival)
   :Date.parse(a.departure)-Date.parse(b.departure)||Date.parse(a.arrival)-Date.parse(b.arrival));
  const keep=Number.isInteger(limit)?Math.max(1,Math.min(5,limit)):3;
  return out.slice(0,keep);
 }
 function findTiming(schedule,itinerary,now=Date.now()){
  const matches=findTimings(schedule,itinerary,{mode:'now'},5,now);
  return matches.sort((a,b)=>Date.parse(a.arrival)-Date.parse(b.arrival)||
   Date.parse(a.departure)-Date.parse(b.departure))[0]||null;
 }
 /* v967: only the NEXT strictly later, verified journey for this exact
    line sequence, boarding stops and directions. Never query from 'now'
    when a valid itinerary is already displayed. Sparse 260 service may
    require more than one 90-minute window, so scan up to 12 hours. */
 function nextTiming(schedule,itinerary,afterDeparture,now=Date.now()){
  if(!schedule||!itinerary||!Number.isFinite(now))return null;
  const after=Number.isFinite(afterDeparture)?afterDeparture:now-60000;
  let cursor=Math.max(now,after+60000);
  const limit=Math.min(now+36*3600000,cursor+12*3600000);
  for(;cursor<=limit;cursor+=90*60000){
   const matches=findTimings(schedule,itinerary,{mode:'depart',at:cursor},5,now);
   const next=matches.find(t=>Date.parse(t.departure)>after&&
    Date.parse(t.departure)>=now-60000);
   if(next)return next;
  }
  return null;
 }
 return {validate,walkingMinutes,legMatches,findTiming,findTimings,nextTiming,version:'967'};
});
