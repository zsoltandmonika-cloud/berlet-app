/* SH9 v1109: real one-transfer BKK GTFS timetable search.
 * Same-named official interchange stops within 250m straight-line.
 * No fabricated walking path or live BKK tracking. BKK Zrt., CC BY 4.0.
 */
import {validate,active,find,stopIds,wallEpoch} from "./bkk-gtfs-core-v1105.mjs";
const TZ="Europe/Budapest",MAX_WALK_AIR=250,MIN_BUFFER=5*60000,
 MAX_WAIT=40*60000,MAX_JOURNEY=5*3600000,MAX_ITEMS=6;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const shift=(day,n)=>{const x=new Date(day+"T12:00:00Z");
 x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
function distance(a,b){
 const r=6371000,k=Math.PI/180,df=(b[1]-a[1])*k,dl=(b[2]-a[2])*k;
 const h=Math.sin(df/2)**2+Math.cos(a[1]*k)*Math.cos(b[1]*k)*Math.sin(dl/2)**2;
 return r*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
const hm=iso=>new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",
 minute:"2-digit",hourCycle:"h23"}).format(new Date(iso));
const iso=x=>new Date(x).toISOString();
function findConnections(data,q,at=Date.now()){
 if(!validate(data,at)||!q||!["now","depart","arrive"].includes(q.mode)||
  !/^\d{4}-\d\d-\d\d$/.test(q.date)||!Number.isFinite(Date.parse(q.when))||
  q.date<data.feedStart||q.date>data.feedEnd)return [];
 const origin=new Set(stopIds(data.stops,q.from)),dest=new Set(stopIds(data.stops,q.to));
 if(!origin.size||!dest.size)return [];
 const pivot=Date.parse(q.when);
 const earliest=q.mode==="arrive"?pivot-8*3600000:pivot;
 const latest=q.mode==="arrive"?pivot:pivot+8*3600000;
 const sourceFirst=[],destSecond=[],names={};
 for(const [key,stop] of Object.entries(data.stops))names[key]=norm(stop[0]);
 for(const trip of data.trips){
  const events=trip[3],line=trip[0],mode=trip[4],headsign=trip[2];
  const first=[],last=[];
  for(let i=0;i<events.length;i++){
   if(origin.has(events[i][0]))first.push(i);
   if(dest.has(events[i][0]))last.push(i);
  }
  if(!first.length&&!last.length)continue;
  for(const serviceDay of [shift(q.date,-1),q.date]){
   if(!active(data.services[trip[1]],serviceDay))continue;
   const stamp=new Map();
   const when=(idx,departure)=>{
    const ev=events[idx],key=idx*2+Number(departure);
    if(!stamp.has(key))stamp.set(key,wallEpoch(serviceDay,ev[departure?2:1]/60));
    return stamp.get(key);
   };
   for(const i of first){
    if(i>=events.length-1)continue;
    const dep=when(i,true);
    if(!Number.isFinite(dep)||dep<earliest||dep>latest)continue;
    for(let j=i+1;j<events.length;j++){
     const arr=when(j,false);
     if(!Number.isFinite(arr)||arr<=dep||arr-dep>MAX_JOURNEY)continue;
     const id=events[j][0];
     sourceFirst.push({line,mode,headsign,from:q.from,to:data.stops[id][0],
      startId:events[i][0],endId:id,departureMs:dep,arrivalMs:arr});
    }
   }
   for(const j of last){
    if(j<1)continue;
    const arr=when(j,false);
    if(!Number.isFinite(arr)||arr<=earliest||arr>latest)continue;
    for(let i=0;i<j;i++){
     const dep=when(i,true);
     if(!Number.isFinite(dep)||dep>=arr||arr-dep>MAX_JOURNEY)continue;
     const id=events[i][0];
     destSecond.push({line,mode,headsign,from:data.stops[id][0],to:q.to,
      startId:id,endId:events[j][0],departureMs:dep,arrivalMs:arr});
    }
   }
  }
 }
 const byStop=new Map();
 for(const b of destSecond){
  const key=names[b.startId];
  if(!byStop.has(key))byStop.set(key,[]);
  byStop.get(key).push(b);
 }
 for(const arr of byStop.values())arr.sort((a,b)=>a.departureMs-b.departureMs);
 const candidates=[];
 const direct=find(data,q,at).map(x=>({...x,legs:[x],transfers:0}));
 for(const a of sourceFirst){
  const opts=byStop.get(names[a.endId])||[];
  for(const b of opts){
   if(b.line===a.line||b.departureMs<a.arrivalMs+MIN_BUFFER||
    b.departureMs-a.arrivalMs>MAX_WAIT||
    b.arrivalMs-a.departureMs>MAX_JOURNEY)continue;
   const straight=distance(data.stops[a.endId],data.stops[b.startId]);
   if(!Number.isFinite(straight)||straight>MAX_WALK_AIR)continue;
   // Extra buffer relative to straight-line distance is a conservative
   // connection allowance, NOT evidence of verified pedestrian access.
   const buffer=Math.max(MIN_BUFFER,
    Math.ceil(straight*1.5/1.1/60)*60000+3*60000);
   if(b.departureMs-a.arrivalMs<buffer)continue;
   const first={line:a.line,mode:a.mode,headsign:a.headsign,from:a.from,to:a.to,
    departure:iso(a.departureMs),arrival:iso(a.arrivalMs),status:"timetable",
    source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop"};
   const second={line:b.line,mode:b.mode,headsign:b.headsign,from:b.from,to:b.to,
    departure:iso(b.departureMs),arrival:iso(b.arrivalMs),status:"timetable",
    source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop"};
   candidates.push({from:q.from,to:q.to,departure:first.departure,
    arrival:second.arrival,source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop",
    transfers:1,legs:[first,second],
    transfer:{from:a.to,to:b.from,airMeters:Math.round(straight),
     waitMinutes:Math.floor((b.departureMs-a.arrivalMs)/60000),
     footpathVerified:false}});
  }
 }
 const sorted=direct.concat(candidates).sort((a,b)=>
  q.mode==="arrive"?Date.parse(b.departure)-Date.parse(a.departure):
  Date.parse(a.arrival)-Date.parse(b.arrival)||a.transfers-b.transfers);
 const seen=new Set(),found=[];
 for(const result of sorted){
  const key=result.legs.map(x=>[x.line,x.departure,x.arrival,x.from,x.to].join("/")).join("|");
  if(seen.has(key))continue;
  seen.add(key);found.push(result);
  if(found.length>=MAX_ITEMS)break;
 }
 return found;
}
function toConnectionPack(q,journey){
 if(!journey||journey.source!=="BKK Zrt., CC BY 4.0"||
  journey.coverage!=="stop-to-stop"||!Array.isArray(journey.legs)||
  ![1,2].includes(journey.legs.length)||norm(q.from)!==norm(journey.from)||
  norm(q.to)!==norm(journey.to))throw Error("unverified_bkk_connection");
 const legs=journey.legs;
 if(legs.length===2){
  if(journey.transfers!==1||!journey.transfer||
   journey.transfer.footpathVerified!==false||
   journey.transfer.airMeters>MAX_WALK_AIR||
   Date.parse(legs[1].departure)-Date.parse(legs[0].arrival)<MIN_BUFFER)
   throw Error("unverified_transfer");
 }else if(journey.transfers!==0)throw Error("mismatched_transfer_count");
 if(legs.some(x=>x.source!=="BKK Zrt., CC BY 4.0"||
  x.coverage!=="stop-to-stop"||!["bus","tram","metro","train"].includes(x.mode)||
  !Number.isFinite(Date.parse(x.departure))||
  Date.parse(x.arrival)<=Date.parse(x.departure)))throw Error("invalid_connection_leg");
 const segments=legs.map((x,i)=>({
  mode:x.mode,line:x.line,from:x.from,to:x.to,
  departure:hm(x.departure),arrival:hm(x.arrival),status:"timetable",
  note:i===0&&legs.length>1?
   "GTFS menetrend; az átszállás gyalogos útja nincs ellenőrizve.":
   "BKK GTFS menetrend szerinti időpont, nem élő indulás."
 }));
 const transferText=legs.length===2?
  "1 átszállás: "+journey.transfer.from+" → "+journey.transfer.to+
  ". Peronok távolsága kb. "+journey.transfer.airMeters+
  " m légvonalban, tényleges séta nincs ellenőrizve. Menetrendi csatlakozási idő "+
  journey.transfer.waitMinutes+" perc. ":"";
 return {schema:"sh9.trip-pack/1",title:journey.from+" → "+journey.to,
  travelDate:q.date,from:journey.from,to:journey.to,
  departure:hm(journey.departure),arrival:hm(journey.arrival),
  arrivalStatus:"timetable",segments,
  summary:transferText+
   "BKK Zrt. CC BY 4.0 statikus menetrend; nem valós idejű, nem ajtótól ajtóig tartó útiterv.",
  alerts:[{title:"Menetrendi adat, nem élő",
   text:"Indulás előtt ellenőrizd az aktuális forgalmat és az átszállás gyalogos útját BudapestGO-ban."}],
  alternatives:[],sources:[{name:"BKK Zrt., CC BY 4.0",
   url:"https://opendata.bkk.hu/data-sources"}]
 };
}
export {findConnections,toConnectionPack};
