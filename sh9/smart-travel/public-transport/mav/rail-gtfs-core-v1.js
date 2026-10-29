/* SH9 MÁV Phase 2C · local GTFS timetable engine.
 * Schedule-only, zero polling. No live delay, platform or GPS assertions.
 * Dataset is generated from an authorized GTFS archive, never hardcoded demo data.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SH9_MAV_GTFS_CORE_V1=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const TZ='Europe/Budapest',MAX_TRIPS=40000,MAX_STOPS=9000;
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const short=x=>normalize(x).replace(/\b(palyaudvar|vasutallomas|megallohely|allomas)\b/g,'').trim();
function localParts(time){
 const parts={};for(const p of clock.formatToParts(time))if(p.type!=='literal')parts[p.type]=Number(p.value);
 return parts;
}
function budapestDay(date){const p=localParts(date);return [p.year,p.month,p.day].map((x,i)=>String(x).padStart(i?2:4,'0')).join('-')}
function dayShift(ymd,days){const t=new Date(ymd+'T12:00:00Z');if(!Number.isFinite(t.getTime()))return null;t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10)}
function wallEpoch(ymd,minute){
 if(!/^\d{4}-\d\d-\d\d$/.test(ymd)||!Number.isFinite(minute)||minute<0||minute>=48*60)return NaN;
 const [y,m,d]=ymd.split('-').map(Number);
 const target=Date.UTC(y,m-1,d,0,0,0)+Math.round(minute*60000);
 let guess=target-3600000;
 // Resolve actual Budapest DST offset using its timezone database.
 for(let i=0;i<4;i++){
  const p=localParts(new Date(guess));
  const observed=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
  const delta=target-observed;
  if(!delta)break;guess+=delta;
 }
 return guess;
}
function serviceActive(s,ymd){
 if(!s||typeof s!=='object')return false;
 const day=ymd.replace(/-/g,'');
 if(Object.prototype.hasOwnProperty.call(s.exceptions||{},day))return s.exceptions[day]===1;
 if(!/^\d{8}$/.test(s.from||'')||!/^\d{8}$/.test(s.to||'')||day<s.from||day>s.to)return false;
 if(!/^[01]{7}$/.test(s.days||''))return false;
 const dayOfWeek=(new Date(ymd+'T12:00:00Z').getUTCDay()+6)%7;
 return s.days[dayOfWeek]==='1';
}
function validate(data,{allowPrivate=false}={}){
 if(!data||data.schema!=='sh9-mav-gtfs-v1'||data.timezone!==TZ||
    !Array.isArray(data.stops)||!Array.isArray(data.trips)||
    data.stops.length<2||data.stops.length>MAX_STOPS||data.trips.length>MAX_TRIPS||
    !data.services||typeof data.services!=='object'||Array.isArray(data.services)||
    typeof data.source!=='string'||data.source.length>180||
    !/^\d{4}-\d{2}-\d{2}T/.test(data.generatedAt||'')||
    !(data.rightsConfirmed===true||(allowPrivate===true&&data.rightsConfirmed===false&&data.localOnly===true)))return null;
 const stopMap=new Map(),trips=[];
 for(const row of data.stops){
  if(!Array.isArray(row)||row.length<2||typeof row[0]!=='string'||typeof row[1]!=='string'||!row[0]||!row[1]||row[0].length>100||row[1].length>160)return null;
  stopMap.set(row[0],row[1]);
 }
 for(const t of data.trips){
  if(!t||typeof t.id!=='string'||typeof t.service!=='string'||typeof t.route!=='string'||
     !Array.isArray(t.stops)||t.stops.length<2||t.stops.length>400)return null;
  if(!Object.prototype.hasOwnProperty.call(data.services,t.service))return null;
  let last=-1;
  const events=[];
  for(const pair of t.stops){
   if(!Array.isArray(pair)||pair.length!==3||!stopMap.has(pair[0])||
      !Number.isInteger(pair[1])||!Number.isInteger(pair[2])||
      pair[1]<0||pair[2]<pair[1]||pair[2]>2879||pair[1]<last)return null;
   last=pair[2];events.push(pair);
  }
  trips.push(t);
 }
 return {stops:stopMap,trips,services:data.services,source:data.source,generatedAt:data.generatedAt};
}
function stationIds(data,value){
 const needle=short(value);if(needle.length<3)return [];
 const all=[...data.stops].map(([id,name])=>({id,name:short(name)}));
 const exact=all.filter(x=>x.name===needle);
 if(exact.length)return exact.map(x=>x.id);
 const partial=all.filter(x=>x.name.includes(needle)||needle.includes(x.name));
 // Ambiguous generic station-name matches should not silently choose one.
 const groups=new Set(partial.map(x=>x.name));
 return groups.size===1?partial.map(x=>x.id):[];
}
function instances(data,startDay,endDay){
 const all=[];
 for(let off=-1;off<=2;off++){
  const ymd=dayShift(startDay,off);
  if(!ymd||ymd>endDay&&off>0)continue;
  for(const t of data.trips){
   if(!serviceActive(data.services[t.service],ymd))continue;
   const events=t.stops.map(([id,arr,dep])=>({id,arrival:wallEpoch(ymd,arr),departure:wallEpoch(ymd,dep)}));
   all.push({trip:t,events});
  }
 }
 return all;
}
function route(data,query,{limit=3,maxTransfers=1,localOnly=false}={}){
 const parsed=validate(data,{allowPrivate:localOnly===true});
 if(!parsed||!query||!['now','depart','arrive'].includes(query.mode))return {status:'invalid-feed',journeys:[]};
 const date=new Date(query.when);
 if(!Number.isFinite(date.getTime()))return {status:'invalid-query',journeys:[]};
 const origin=new Set(stationIds(parsed,query.from)),dest=new Set(stationIds(parsed,query.to));
 if(!origin.size||!dest.size)return {status:'station-not-in-feed',journeys:[],source:parsed.source};
 const pivot=date.getTime(),earliest=query.mode==='arrive'?pivot-12*3600000:pivot,latest=query.mode==='arrive'?pivot:pivot+12*3600000;
 const day=budapestDay(date),all=instances(parsed,day,dayShift(day,2));
 const starts=[],byStop=new Map();
 for(const x of all){
  for(let i=0;i<x.events.length;i++){
   const e=x.events[i];
   if(e.departure>latest||e.departure<earliest-6*3600000)continue;
   const item={x,i};
   if(!byStop.has(e.id))byStop.set(e.id,[]);
   byStop.get(e.id).push(item);
   if(origin.has(e.id)&&e.departure>=earliest&&e.departure<=latest)starts.push(item);
  }
 }
 for(const v of byStop.values())v.sort((a,b)=>a.x.events[a.i].departure-b.x.events[b.i].departure);
 const results=[],keys=new Set();
 function leg(x,i,j){
  const a=x.events[i],b=x.events[j];
  return {tripId:x.trip.id,service:x.trip.route,headsign:String(x.trip.headsign||'').slice(0,100),
   from:dataStop(a.id),to:dataStop(b.id),departure:new Date(a.departure).toISOString(),arrival:new Date(b.arrival).toISOString()};
 }
 function dataStop(id){return parsed.stops.get(id)||id}
 function add(legs){
  const first=Date.parse(legs[0].departure),last=Date.parse(legs[legs.length-1].arrival);
  if(first<earliest||last>latest||last<=first||last-first>12*3600000)return;
  const key=legs.map(l=>l.tripId).join('|')+'|'+first+'|'+last;
  if(keys.has(key))return;keys.add(key);
  results.push({legs,departure:new Date(first).toISOString(),arrival:new Date(last).toISOString(),
   durationMinutes:Math.round((last-first)/60000),transfers:legs.length-1,live:false,platform:null,delayMinutes:null});
 }
 // Arrive-by needs a departure window before the requested arrival time.
 // First legs do not need to arrive at the goal in this phase.
 for(const {x,i} of starts){
  const hops=x.events;
  for(let j=i+1;j<hops.length;j++){
   const stop=hops[j],start=hops[i];
   if(stop.arrival<=start.departure||stop.arrival>latest)continue;
   if(dest.has(stop.id))add([leg(x,i,j)]);
   if(maxTransfers<1||stop.arrival>latest-5*60000)continue;
   const onward=byStop.get(stop.id)||[];
   let examined=0;
   for(const {x:y,i:k} of onward){
    const dep=y.events[k].departure;
    if(dep<stop.arrival+5*60000)continue;
    if(dep>stop.arrival+180*60000||dep>latest)break;
    if(y.trip.id===x.trip.id)continue;
    if(++examined>120)break;
    for(let m=k+1;m<y.events.length;m++){
     if(y.events[m].arrival>latest)break;
     if(dest.has(y.events[m].id))add([leg(x,i,j),leg(y,k,m)]);
    }
   }
  }
 }
 results.sort((a,b)=>query.mode==='arrive'
   ?Date.parse(b.arrival)-Date.parse(a.arrival)||Date.parse(b.departure)-Date.parse(a.departure)||a.transfers-b.transfers
   :Date.parse(a.departure)-Date.parse(b.departure)||a.transfers-b.transfers||Date.parse(a.arrival)-Date.parse(b.arrival));
 return {status:'ok',source:parsed.source,generatedAt:parsed.generatedAt,
   journeys:results.slice(0,Math.max(1,Math.min(10,limit)))};
}
return Object.freeze({TZ,normalize,short,budapestDay,dayShift,wallEpoch,serviceActive,validate,stationIds,route});
});
