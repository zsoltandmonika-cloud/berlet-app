/* SH9 Smart Trip multimodal v1073.
 * Pure adapter for official, authenticated Google Routes transit response.
 * Remains OFF until explicit server-side quota/billing/legal approval.
 * Free Google Maps handoff is ONLY a user-clicked fallback, no paid API.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_MULTIMODAL_V1073=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_ROUTES=4,MAX_STEPS=60;
 const clamp=(s,n=140)=>String(s||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
 const time=x=>{const v=Date.parse(x||'');return Number.isFinite(v)?v:NaN};
 const iso=t=>new Date(t).toISOString();
 function position(point,typed){
  const p=point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&
   Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180&&
   clamp(point.name)===clamp(typed)?point:null;
  return p?{location:{latLng:{latitude:p.lat,longitude:p.lng}}}:{address:clamp(typed)};
 }
 function request(query,points){
  if(!query||!['now','depart','arrive'].includes(query.mode))return null;
  const from=clamp(query.from),to=clamp(query.to);
  const instant=time(query.when);
  if(from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu')||!Number.isFinite(instant))return null;
  // Google Transit route time window is bounded. Use the server's clock to check again.
  if(instant<Date.now()-7*86400000||instant>Date.now()+100*86400000)return null;
  const req={
   origin:position(points?.origin,from),destination:position(points?.destination,to),
   travelMode:'TRANSIT',computeAlternativeRoutes:true,
   languageCode:'hu',units:'METRIC',
   transitPreferences:{
    allowedTravelModes:['BUS','SUBWAY','TRAIN','LIGHT_RAIL'],
    routingPreference:query.priority==='transfers'?'FEWER_TRANSFERS':'LESS_WALKING'
   }
  };
  if(query.mode==='arrive')req.arrivalTime=iso(instant);
  else req.departureTime=iso(instant);
  return req;
 }
 function mapsUrl(query,points){
  const from=clamp(query?.from),to=clamp(query?.to);
  if(!to||from&&from===to)return null;
  const u=new URL('https://www.google.com/maps/dir/');
  u.searchParams.set('api','1');
  if(from){
   const p=position(points?.origin,from);
   u.searchParams.set('origin',p.location?p.location.latLng.latitude+','+p.location.latLng.longitude:from);
  }
  const p=position(points?.destination,to);
  u.searchParams.set('destination',p.location?p.location.latLng.latitude+','+p.location.latLng.longitude:to);
  u.searchParams.set('travelmode','transit');
  return u.toString();
 }
 function duration(step){
  const x=step?.staticDuration||step?.duration;
  if(typeof x!=='string'||!/^\d+(?:\.\d+)?s$/.test(x))return NaN;
  const sec=Number(x.slice(0,-1));return Number.isFinite(sec)&&sec>0&&sec<4*3600?Math.ceil(sec/60)*60000:NaN;
 }
 function normalizeRoutes(payload,query){
  if(!payload||!Array.isArray(payload.routes)||payload.routes.length>16||!query?.from||!query?.to)return [];
  const found=[];
  for(const route of payload.routes.slice(0,MAX_ROUTES)){
   if(!Array.isArray(route?.legs)||route.legs.length!==1||!Array.isArray(route.legs[0].steps))continue;
   const steps=route.legs[0].steps;
   if(!steps.length||steps.length>MAX_STEPS)continue;
   const parsed=[];let broken=false;
   for(const step of steps){
    const kind=step?.travelMode;
    if(kind==='TRANSIT'){
     const t=step.transitDetails,stop=t?.stopDetails,line=t?.transitLine;
     const departure=time(stop?.departureTime),arrival=time(stop?.arrivalTime);
     const from=clamp(stop?.departureStop?.name),to=clamp(stop?.arrivalStop?.name);
     if(!Number.isFinite(departure)||!Number.isFinite(arrival)||arrival<=departure||!from||!to){broken=true;break}
     parsed.push({kind:'ride',from,to,departure,arrival,
      service:clamp(line?.nameShort||line?.name||t?.tripShortText||'Tömegközlekedés',55),
      agency:clamp(line?.agencies?.[0]?.name,90),
      vehicleType:clamp(line?.vehicle?.type,50),
      headsign:clamp(t?.headsign,90)});
    }else if(kind==='WALK'){
     const ms=duration(step),meters=Number(step?.distanceMeters);
     if(!Number.isFinite(ms)||!Number.isFinite(meters)||meters<0||meters>30000){broken=true;break}
     parsed.push({kind:'walk',ms,meters:Math.round(meters)});
    }else{broken=true;break}
   }
   if(broken||!parsed.some(x=>x.kind==='ride'))continue;
   const originalWalk=parsed.filter(x=>x.kind==='walk').length;
   // Assign scheduled transit times first; estimate walk durations exclusively
   // from provider step durations anchored to official transit stop times.
   // No estimate is labeled as real-time GPS or an exact departure.
   for(let i=0;i<parsed.length;i++){
    const s=parsed[i];if(s.kind!=='walk')continue;
    const preceding=parsed.slice(0,i).reverse().find(x=>x.kind==='ride');
    const following=parsed.slice(i+1).find(x=>x.kind==='ride');
    const earlierWalks=parsed.slice(0,i).filter(x=>x.kind==='walk');
    const earlierRide=preceding;
    if(earlierRide){
     const groupStart=parsed.findIndex(x=>x===earlierRide)+1;
     const between=parsed.slice(groupStart,i).filter(x=>x.kind==='walk').reduce((sum,x)=>sum+x.ms,0);
     s.departure=earlierRide.arrival+between;
     s.arrival=s.departure+s.ms;
    }else if(following){
     const nextRideIndex=parsed.findIndex(x=>x.kind==='ride');
     const before=parsed.slice(i,nextRideIndex).filter(x=>x.kind==='walk');
     const total=before.reduce((sum,x)=>sum+x.ms,0);
     const used=earlierWalks.reduce((sum,x)=>sum+x.ms,0);
     // before[] covers all pre-first-ride walks; anchor latest arrival to first boarding.
     s.departure=following.departure-total+used;
     s.arrival=s.departure+s.ms;
    }else{broken=true;break}
    if(following&&s.arrival>following.departure)broken=true;
    if(broken)break;
    const prev=parsed.slice(0,i).reverse().find(x=>x.kind==='ride');
    const next=parsed.slice(i+1).find(x=>x.kind==='ride');
    s.from=i===0?clamp(query.from):prev?.to||clamp(query.from);
    s.to=i===parsed.length-1?clamp(query.to):next?.from||clamp(query.to);
   }
   if(broken)continue;
   const legs=parsed.map(s=>s.kind==='walk'?{
    kind:'walk',from:s.from,to:s.to,departure:iso(s.departure),arrival:iso(s.arrival),
    distanceMeters:s.meters,walkingVerified:true
   }:{
    kind:'ride',from:s.from,to:s.to,departure:iso(s.departure),arrival:iso(s.arrival),
    service:s.service,agency:s.agency,vehicleType:s.vehicleType,headsign:s.headsign
   });
   if(legs.some((x,i)=>i>0&&time(x.departure)<time(legs[i-1].arrival)))continue;
   const rides=legs.filter(x=>x.kind==='ride');
   const start=time(legs[0].departure),end=time(legs[legs.length-1].arrival);
   if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end-start>24*3600000)continue;
   found.push({segments:legs,departure:iso(start),arrival:iso(end),transfers:rides.length-1,
    walkingSource:'Google Maps route step distance and staticDuration, time anchored to timetable',
    doorToDoor:originalWalk>=2&&parsed[0].kind==='walk'&&parsed[parsed.length-1].kind==='walk'});
  }
  return found;
 }
 function rank(journeys,preference){
  const list=Array.isArray(journeys)?journeys.slice():[];
  const score=j=>{
   const legs=j.segments||[];
   const duration=(time(j.arrival)-time(j.departure))/60000;
   const walking=legs.filter(x=>x.kind==='walk').reduce((sum,x)=>sum+(time(x.arrival)-time(x.departure))/60000,0);
   const wait=legs.reduce((sum,s,i)=>i?sum+Math.max(0,(time(s.departure)-time(legs[i-1].arrival))/60000):sum,0);
   const transfers=j.transfers||0;
   if(preference==='transfers')return transfers*160+walking+duration*.25+wait*.35;
   if(preference==='wait')return wait*12+transfers*15+walking+duration*.2;
   if(preference==='duration')return duration+transfers*4;
   if(preference==='departure')return time(j.departure)/60000;
   return duration+transfers*27+walking*2+wait*.8;
  };
  return list.sort((a,b)=>score(a)-score(b)||time(a.arrival)-time(b.arrival)).slice(0,8);
 }
 function verifiedPackage(payload,query,renderer,now=new Date()){
  const rows=rank(normalizeRoutes(payload,query),query.priority);
  // Full door-to-door rating only if the provider actually supplies both access walks.
  // Partial itineraries are honestly station-to-station, even if one walking step exists.
  const full=rows.filter(x=>x.doorToDoor);
  const list=full.length?full:rows;
  const src={kind:'verified-multimodal',verified:true,coverage:full.length?'door-to-door':'station-to-station',
   name:'Google Maps · tömegközlekedési útvonal',generatedAt:now.toISOString(),attribution:'© Google Maps'};
  return renderer?.prepare?.(list,src)||null;
 }
 return Object.freeze({request,mapsUrl,normalizeRoutes,rank,verifiedPackage});
});
