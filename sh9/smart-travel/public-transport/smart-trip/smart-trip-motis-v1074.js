/* SH9 Smart Trip native MOTIS/Transitous adapter v1074.
 * PURE and INERT until explicitly wired and terms-approved.
 * No network access, no tracking, no guessed trips.
 * MOTIS v6 schema: https://github.com/motis-project/motis/blob/master/openapi.yaml
 * Transitous fair use: https://transitous.org/api/
 */
(function(root,factory){
 'use strict';
 const adapter=factory();
 if(typeof module==='object'&&module.exports)module.exports=adapter;
 if(root)root.SH9_SMART_TRIP_MOTIS_V1074=adapter;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_ITINERARIES=8;
 const TRANSPORT=new Set(['BUS','COACH','TRAM','SUBWAY','SUBURBAN','RAIL','REGIONAL_RAIL',
  'REGIONAL_FAST_RAIL','LONG_DISTANCE','HIGH_SPEED_RAIL','TROLLEYBUS','FERRY','FUNICULAR','AERIAL_LIFT','OTHER']);
 const text=(x,n=120)=>String(x??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
 const toTime=x=>{const t=Date.parse(x);return Number.isFinite(t)?t:NaN};
 const coords=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
  p.lat>=45&&p.lat<=49&&p.lng>=16&&p.lng<=23
  ?p.lat.toFixed(6)+','+p.lng.toFixed(6):null;
 function buildUrl(query,places){
  const from=coords(places?.origin),to=coords(places?.destination);
  const when=toTime(query?.when);
  if(!from||!to||from===to||!Number.isFinite(when)||
     !['now','depart','arrive'].includes(query?.mode))return null;
  const u=new URL('https://api.transitous.org/api/v6/plan');
  u.searchParams.set('fromPlace',from);
  u.searchParams.set('toPlace',to);
  u.searchParams.set('time',new Date(when).toISOString());
  u.searchParams.set('arriveBy',query.mode==='arrive'?'true':'false');
  u.searchParams.set('numItineraries','5');
  u.searchParams.set('timetableView','true');
  u.searchParams.set('preTransitModes','WALK');
  u.searchParams.set('postTransitModes','WALK');
  u.searchParams.set('maxPreTransitTime','1200');
  u.searchParams.set('maxPostTransitTime','1200');
  u.searchParams.set('maxTransfers','4');
  u.searchParams.set('language','hu');
  return u.toString();
 }
 function journey(itin,query){
  if(!itin||!Array.isArray(itin.legs)||itin.legs.length<1||itin.legs.length>24||
     itin.legs.some(l=>l?.cancelled===true))return null;
  const first=toTime(itin.startTime),last=toTime(itin.endTime);
  if(!Number.isFinite(first)||!Number.isFinite(last)||last<=first||last-first>24*3600000)return null;
  const legs=[];
  for(const leg of itin.legs){
   if(!leg)return null;
   const mode=text(leg.mode,35).toUpperCase();
   const start=toTime(leg.startTime),end=toTime(leg.endTime);
   const from=text(leg.from?.name||leg.from?.displayName,110);
   const to=text(leg.to?.name||leg.to?.displayName,110);
   if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||
      !from||!to||start<first||end>last||legs.length&&start<toTime(legs[legs.length-1].arrival))return null;
   if(mode==='WALK'){
    if(!Number.isFinite(leg.distance)||leg.distance<0||leg.distance>30000)return null;
    legs.push({kind:'walk',from,to,departure:new Date(start).toISOString(),arrival:new Date(end).toISOString(),
     distanceMeters:Math.round(leg.distance),walkingVerified:true});
   }else if(TRANSPORT.has(mode)){
    const service=text(leg.routeShortName||leg.displayName||leg.routeLongName||mode,55);
    legs.push({kind:'ride',from,to,departure:new Date(start).toISOString(),arrival:new Date(end).toISOString(),
     agency:text(leg.agencyName,90),vehicleType:mode,
     service,headsign:text(leg.headsign,90)});
   }else return null;
  }
  const rides=legs.filter(x=>x.kind==='ride');
  if(!rides.length)return null;
  if(Number.isInteger(itin.transfers)&&itin.transfers<0)return null;
  // Time and place come directly from provider results: never manufacture an
  // access/egress walk to get a five-star rating.
  return {segments:legs,departure:new Date(first).toISOString(),arrival:new Date(last).toISOString(),
   transfers:rides.length-1,sourceTransfers:itin.transfers,
   doorToDoor:legs[0].kind==='walk'&&legs[legs.length-1].kind==='walk'};
 }
 function score(j,priority='balanced',pivot){
  const duration=(toTime(j.arrival)-toTime(j.departure))/60000;
  const walk=j.segments.filter(x=>x.kind==='walk').reduce((n,s)=>n+(toTime(s.arrival)-toTime(s.departure))/60000,0);
  const wait=j.segments.slice(1).reduce((n,s,i)=>n+Math.max(0,(toTime(s.departure)-toTime(j.segments[i].arrival))/60000),0);
  const transfers=j.transfers;
  if(priority==='duration')return duration+transfers*5;
  if(priority==='wait')return wait*12+transfers*18+walk*.7+duration*.15;
  if(priority==='transfers')return transfers*200+duration*.4+walk;
  if(priority==='departure')return toTime(j.departure)/60000;
  return duration+walk*2+wait*.7+transfers*38;
 }
 function normalize(payload,query,renderer){
  if(!payload||!Array.isArray(payload.itineraries)||payload.itineraries.length>100)return null;
  const unique=new Map();
  for(const raw of payload.itineraries){
   const j=journey(raw,query);
   if(!j)continue;
   const key=j.segments.map(s=>s.kind+':'+s.service+':'+s.from+':'+s.departure+':'+s.to).join('|');
   if(!unique.has(key))unique.set(key,j);
   if(unique.size>=MAX_ITINERARIES)break;
  }
  const list=[...unique.values()].sort((a,b)=>score(a,query?.priority)-score(b,query?.priority)||
   toTime(a.arrival)-toTime(b.arrival));
  if(!list.length)return null;
  const doorToDoor=list.every(x=>x.doorToDoor);
  // If a source provides different completeness per itinerary, the renderer
  // must be conservative, never infer access walk for a missing segment.
  return renderer?.prepare?.(list,{verified:true,kind:'verified-multimodal',
   coverage:doorToDoor?'door-to-door':'station-to-station',
   name:'Transitous · MOTIS útvonaltervezés',
   attribution:'Transitous · OSM · szolgáltatói adatok',
   attributionUrl:'https://transitous.org/sources/',
   walkTimeEstimated:true,generatedAt:new Date().toISOString()})||null;
 }
 return Object.freeze({buildUrl,journey,score,normalize,TRANSPORT});
});
