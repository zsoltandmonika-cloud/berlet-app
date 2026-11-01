/* SH9 Léna Native AI Search v1104 · pure verified-route adaptor.
 * Grounded Google Routes provider data only. Model may SELECT an existing index;
 * it cannot add a transit leg or modify departure/arrival/stop facts.
 */
const TZ='Europe/Budapest';
const safe=(x,n=120)=>typeof x==='string'?x.replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n):'';
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const hhmm=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x));
function validateQuery(raw,now=Date.now()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid_query');
 const from=safe(raw.from),to=safe(raw.to),profile=raw.profile;
 if(from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu'))
  throw Error('invalid_endpoints');
 if(!day(raw.date)||!hhmm(raw.time)||!['now','depart','arrive'].includes(raw.mode))
  throw Error('invalid_date_or_mode');
 if(!['balanced','wait','walk','transfers','duration','departure'].includes(raw.priority))
  throw Error('invalid_priority');
 if(!['m','z'].includes(profile))throw Error('invalid_profile');
 if(!iso(raw.when)||Math.abs(Date.parse(raw.when)-now)>40*86400000)
  throw Error('invalid_time_window');
 const coords={};
 for(const key of ['origin','destination']){
  const p=raw[key];
  if(p==null)continue;
  if(typeof p!=='object'||Array.isArray(p)||
   safe(p.name)!==(key==='origin'?from:to)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||
   p.lat<45||p.lat>49||p.lng<16||p.lng>23)throw Error('invalid_selected_point');
  coords[key]={name:safe(p.name),lat:p.lat,lng:p.lng};
 }
 return {from,to,date:raw.date,time:raw.time,mode:raw.mode,priority:raw.priority,
  when:raw.when,profile,...coords};
}
function location(point,typed){
 return point?{location:{latLng:{latitude:point.lat,longitude:point.lng}}}:{address:typed};
}
function providerRequest(q){
 const request={origin:location(q.origin,q.from),destination:location(q.destination,q.to),
  travelMode:'TRANSIT',computeAlternativeRoutes:true,
  languageCode:'hu',units:'METRIC',
  transitPreferences:{allowedTravelModes:['BUS','SUBWAY','TRAIN','LIGHT_RAIL'],
   routingPreference:q.priority==='transfers'?'FEWER_TRANSFERS':'LESS_WALKING'}
 };
 if(q.mode==='arrive')request.arrivalTime=q.when;
 else request.departureTime=q.when;
 return request;
}
function providerType(raw){
 const x=safe(raw,60).toUpperCase();
 if(/BUS|TROLLEYBUS/.test(x))return 'bus';
 if(/SUBWAY|METRO/.test(x))return 'metro';
 if(/TRAM/.test(x))return 'tram';
 if(/RAIL|TRAIN|HEAVY_RAIL|HIGH_SPEED/.test(x))return 'train';
 return 'other';
}
function timeHU(x){
 if(!iso(x))throw Error('invalid_provider_time');
 return new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',
  hour12:false,hourCycle:'h23'}).format(new Date(x));
}
function localDay(x){
 if(!iso(x))throw Error('invalid_provider_date');
 const d=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(new Date(x));
 const p=Object.fromEntries(d.map(v=>[v.type,v.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function durMs(x){
 if(typeof x!=='string'||!/^\d+(?:\.\d+)?s$/.test(x))return null;
 const n=Number(x.slice(0,-1))*1000;
 return Number.isFinite(n)&&n>0&&n<3*3600000?n:null;
}
function extractRoutes(payload,q){
 if(!payload||!Array.isArray(payload.routes))return [];
 const arr=[];
 for(const route of payload.routes.slice(0,4)){
  if(!Array.isArray(route?.legs)||route.legs.length!==1)continue;
  const steps=route.legs[0]?.steps;
  if(!Array.isArray(steps)||!steps.length||steps.length>24)continue;
  const raw=[];let bad=false;
  for(const step of steps){
   if(step.travelMode==='TRANSIT'){
    const t=step.transitDetails,sd=t?.stopDetails;
    const dep=sd?.departureTime,arrival=sd?.arrivalTime;
    const start=safe(sd?.departureStop?.name),end=safe(sd?.arrivalStop?.name);
    if(!iso(dep)||!iso(arrival)||Date.parse(arrival)<=Date.parse(dep)||!start||!end){bad=true;break}
    raw.push({mode:providerType(t?.transitLine?.vehicle?.type),
     line:safe(t?.transitLine?.nameShort||t?.transitLine?.name||t?.tripShortText,55),
     from:start,to:end,departure:dep,arrival,status:'timetable',note:'Szolgáltatói menetrendi adat, nem valós idejű indulás.'});
   }else if(step.travelMode==='WALK'){
    const ms=durMs(step.staticDuration||step.duration),meters=Number(step.distanceMeters);
    if(ms===null||!Number.isFinite(meters)||meters<0||meters>20000){bad=true;break}
    raw.push({mode:'walk',ms,meters});
   }else {bad=true;break}
  }
  if(bad||!raw.some(s=>s.mode!=='walk'))continue;
  // Anchor walking legs to neighboring scheduled vehicle legs. No invented
  // walking times or locations when provider did not supply the walk step.
  for(let i=0;i<raw.length;i++){
   const s=raw[i];
   if(s.mode!=='walk')continue;
   const prev=raw.slice(0,i).reverse().find(x=>x.mode!=='walk');
   const next=raw.slice(i+1).find(x=>x.mode!=='walk');
   if(!prev&&!next){bad=true;break}
   const earlier=raw.slice(0,i).filter(x=>x.mode==='walk');
   const start=prev?Date.parse(prev.arrival)+
    raw.slice(raw.lastIndexOf(prev)+1,i).filter(x=>x.mode==='walk').reduce((a,x)=>a+x.ms,0):
    Date.parse(next.departure)-raw.slice(0,raw.indexOf(next)).filter(x=>x.mode==='walk').reduce((a,x)=>a+x.ms,0)+earlier.reduce((a,x)=>a+x.ms,0);
   const end=start+s.ms;
   if(!Number.isFinite(start)||next&&end>Date.parse(next.departure)){bad=true;break}
   s.departure=new Date(start).toISOString();s.arrival=new Date(end).toISOString();
   s.from=i===0?q.from:prev?.to||q.from;
   s.to=i===raw.length-1?q.to:next?.from||q.to;
   s.status='estimated';s.line='';
   s.note='Szolgáltatói gyaloglási idő: kb. '+Math.round(s.ms/60000)+' perc / '+Math.round(s.meters)+' m.';
  }
  if(bad)continue;
  if(raw.some((x,i)=>i>0&&Date.parse(x.departure)<Date.parse(raw[i-1].arrival)))continue;
  const dep=raw[0].departure,arrive=raw[raw.length-1].arrival;
  if(Date.parse(arrive)-Date.parse(dep)>20*3600000||
   Date.parse(arrive)<=Date.parse(dep))continue;
  if(localDay(dep)!==q.date)continue;
  if(!raw[0]?.from||!raw[raw.length-1]?.to)continue;
  arr.push({departure:dep,arrival:arrive,segments:raw.map(s=>({
   mode:s.mode,line:s.line,from:s.from,to:s.to,departure:s.departure,
   arrival:s.arrival,status:s.status,note:s.note
  }))});
 }
 return arr;
}
function score(r,priority){
 const a=Date.parse(r.departure),b=Date.parse(r.arrival);
 const walk=r.segments.filter(x=>x.mode==='walk').reduce((s,x)=>s+(Date.parse(x.arrival)-Date.parse(x.departure))/60000,0);
 const rides=r.segments.filter(x=>x.mode!=='walk').length;
 const wait=r.segments.reduce((s,x,i)=>i?s+Math.max(0,(Date.parse(x.departure)-Date.parse(r.segments[i-1].arrival))/60000):s,0);
 const transfers=Math.max(0,rides-1),total=(b-a)/60000;
 if(priority==='wait')return wait*12+transfers*20+walk+total*.2;
 if(priority==='transfers')return transfers*170+walk+wait+total*.2;
 if(priority==='walk')return walk*20+transfers*10+wait*.6+total*.2;
 if(priority==='duration')return total+transfers*5;
 if(priority==='departure')return a/60000;
 return total+transfers*30+walk*3+wait;
}
function rankRoutes(routes,priority){
 return routes.slice().sort((a,b)=>score(a,priority)-score(b,priority));
}
function mapsLink(q){
 const u=new URL('https://www.google.com/maps/dir/');
 u.searchParams.set('api','1');u.searchParams.set('origin',q.from);
 u.searchParams.set('destination',q.to);u.searchParams.set('travelmode','transit');
 return u.href;
}
function toTripPack(q,route,why=''){
 const rides=route.segments.filter(x=>x.mode!=='walk');
 if(!rides.length)throw Error('no_provider_ride');
 const first=route.segments[0],last=route.segments[route.segments.length-1];
 const only=q.from+' → '+q.to;
 return {schema:'sh9.trip-pack/1',
  title:only,travelDate:q.date,from:q.from,to:q.to,
  departure:timeHU(route.departure),arrival:timeHU(route.arrival),
  arrivalStatus:'timetable',
  summary:safe(why,400)||'Szolgáltatói menetrend alapján kiválasztott útvonal. Indulás előtt ellenőrizd az aktuális változásokat.',
  segments:route.segments.map(s=>({
   mode:s.mode,line:s.line,from:s.from,to:s.to,
   departure:timeHU(s.departure),arrival:timeHU(s.arrival),status:s.status,note:s.note
  })),
  alerts:[{title:'Élő forgalom',text:'A menetrendi útiterv nem igazolja az aktuális járatkésést, vágányt vagy útlezárást. Indulás előtt ellenőrizd a BKK/MÁV/Volán forrását.'}],
  alternatives:[],sources:[{name:'Google Maps · tömegközlekedési útvonal',url:mapsLink(q)}]
 };
}
export {validateQuery,providerRequest,extractRoutes,rankRoutes,toTripPack,timeHU,localDay,mapsLink};
