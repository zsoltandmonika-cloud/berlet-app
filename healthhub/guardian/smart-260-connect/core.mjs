/* SH9 Smart Match v1: general target-first GTFS connection optimizer.
 * Read-only math; never modifies GPS, phones, Dropbox, Family Guard or databases.
 * Time evidence: BKK Zrt. CC BY 4.0 static GTFS, never pretend LIVE.
 */
import {active,validate,wallEpoch} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";

const DEFAULT=Object.freeze({
 schema:"sh9.smart-match.template/1",id:"monika-260",profile:"monika",
 title:"Mónika · Munkahely → Otthon",reverseId:"monika-home-to-office",originLabel:"Bécsi Corner",destinationLabel:"Otthon",
 originStop:"Kolosy tér",transferStop:"Bécsi út / Vörösvári út",
 targetStop:"Bécsi út / Vörösvári út",targetRoute:"260",targetHeadsign:"Harsánylejtő",
 feederRoutes:["17","19","41"],startHour:13,endHour:19,
 originWalkMin:10,originSafetyMin:1,transferWalkMin:2,transferSafetyMin:1,
 maxWaitMin:3,maxTransferMeters:350
});
const clean=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("hu-HU").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const normalizeLine=s=>String(s||"").trim();
function dist(a,b){
 const r=Math.PI/180,p=(b[1]-a[1])*r,q=(b[2]-a[2])*r;
 const z=Math.sin(p/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(q/2)**2;
 return Math.round(6371000*2*Math.asin(Math.min(1,Math.sqrt(z))));
}
function validConfig(c,allowed=[]){
 if(!c||typeof c!=="object"||!Array.isArray(c.feederRoutes)||
   !c.feederRoutes.length||c.feederRoutes.length>12||typeof c.targetRoute!=="string"||
   typeof c.originStop!=="string"||typeof c.transferStop!=="string"||
   typeof c.targetStop!=="string"||!c.originStop.trim()||!c.targetStop.trim()||
   !c.transferStop.trim()||!c.targetRoute.trim())return false;
 const lines=new Set(allowed.length?allowed:[...c.feederRoutes,c.targetRoute]);
 if(["targetAfterStop","feederHeadsign"].some(k=>c[k]!=null&&(typeof c[k]!=="string"||c[k].length>120)))return false;
 if(!lines.has(c.targetRoute)||c.feederRoutes.some(r=>!lines.has(r)||r===c.targetRoute))return false;
 const ranges={
  startHour:[0,23],endHour:[1,24],originWalkMin:[0,30],originSafetyMin:[0,10],
  transferWalkMin:[0,20],transferSafetyMin:[0,10],maxWaitMin:[1,10],maxTransferMeters:[40,600]
 };
 for(const [key,[min,max]] of Object.entries(ranges)){
  if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)return false;
 }
 if(c.endHour<=c.startHour)return false;
 return true;
}
function indexStops(data){
 const map=new Map();
 for(const [id,s] of Object.entries(data.stops)){
  const n=clean(s[0]); if(!map.has(n))map.set(n,[]);
  map.get(n).push(id);
 }
 return map;
}
function options(data,date,cfg=DEFAULT,clock=Date.now()){
 if(!validate(data,clock))throw Error("A hivatalos BKK-adat hiányzik vagy lejárt.");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<data.feedStart||date>data.feedEnd)
  throw Error("A kiválasztott nap nem szerepel a hitelesített menetrendben.");
 if(!validConfig(cfg,data.routes))throw Error("Hibás sablon vagy nem támogatott járat.");
 const stopMap=indexStops(data),stopIds=name=>new Set(stopMap.get(clean(name))||[]);
 const origins=stopIds(cfg.originStop),transfers=stopIds(cfg.transferStop),
  boarding=stopIds(cfg.targetStop);
 if(!origins.size||!transfers.size||!boarding.size)
  throw Error("A sablon egyik megállója nem szerepel a kiválasztott BKK-adatforrásban.");
 const min=wallEpoch(date,cfg.startHour*60),max=wallEpoch(date,cfg.endHour*60);
 const feeders=[],targets=[],feedLines=new Set(cfg.feederRoutes.map(normalizeLine));
 for(const trip of data.trips){
  const [line,service,headsign,events,mode]=trip;
  if(!active(data.services[service],date))continue;
  if(line===cfg.targetRoute&&(!cfg.targetHeadsign||clean(headsign).includes(clean(cfg.targetHeadsign)))){
   // One GTFS trip can serve multiple platforms with the SAME public stop name.
   // Keep all boarding choices for matching, but create only ONE bus opportunity.
   const boardingOptions=[];
   for(let i=0;i<events.length-1;i++){
    if(!boarding.has(events[i][0]))continue;
    // For reverse commutes, target must continue toward the REAL destination
    // after this boarding, not the opposite platform with the same name.
    if(cfg.targetAfterStop&&!events.slice(i+1).some(ev=>clean(data.stops[ev[0]]?.[0])===clean(cfg.targetAfterStop)))continue;
    const dep=wallEpoch(date,events[i][2]/60);
    if(dep<min||dep>=max)continue;
    boardingOptions.push({departMs:dep,boardingId:events[i][0],
     nextStop:data.stops[events[i+1][0]]?.[0]||""});
   }
   if(boardingOptions.length)targets.push({line,mode,headsign,boardingOptions});
  }
  if(feedLines.has(line)&&(!cfg.feederHeadsign||clean(headsign).includes(clean(cfg.feederHeadsign)))){
   for(let i=0;i<events.length-1;i++){
    if(!origins.has(events[i][0]))continue;
    for(let j=i+1;j<events.length;j++){
     if(!transfers.has(events[j][0]))continue;
     const dep=wallEpoch(date,events[i][2]/60),arr=wallEpoch(date,events[j][1]/60);
     if(arr<=dep||arr<min-90*60000||arr>=max)break;
     feeders.push({line,mode,headsign,departMs:dep,arriveMs:arr,
      startId:events[i][0],endId:events[j][0]});
     break;
    }
   }
  }
 }
 const rows=[],uniqueTrips=new Set();
 for(const bus of targets){
  const matches=[];
  for(const boardingOption of bus.boardingOptions){
   for(const tram of feeders){
    const meters=dist(data.stops[tram.endId],data.stops[boardingOption.boardingId]);
    if(meters>cfg.maxTransferMeters)continue;
    // 1.4x aerial separation / 65 m per minute is a conservative walk ESTIMATE.
    const transferWalkMin=Math.max(cfg.transferWalkMin,Math.ceil(meters*1.4/65));
    const waitMin=(boardingOption.departMs-tram.arriveMs)/60000-transferWalkMin;
    if(waitMin<cfg.transferSafetyMin||waitMin>cfg.maxWaitMin)continue;
    const leaveOfficeMs=tram.departMs-(cfg.originWalkMin+cfg.originSafetyMin)*60000;
    matches.push({...boardingOption,
     feederLine:tram.line,feederMode:tram.mode,feederHead:tram.headsign,
     feederDepartMs:tram.departMs,feederArriveMs:tram.arriveMs,leaveOfficeMs,
     transferWalkMin,transferMeters:meters,waitMin:Math.round(waitMin*10)/10});
   }
  }
  matches.sort((a,b)=>Math.abs(a.waitMin-2)-Math.abs(b.waitMin-2)||
    a.transferMeters-b.transferMeters||b.leaveOfficeMs-a.leaveOfficeMs);
  // Without a match, use the last same-named platform on this real GTFS trip.
  const selected=matches[0]||bus.boardingOptions[bus.boardingOptions.length-1];
  const key=[bus.line,selected.departMs,selected.boardingId,bus.headsign].join("|");
  if(uniqueTrips.has(key))continue;
  uniqueTrips.add(key);
  rows.push({line:bus.line,mode:bus.mode,headsign:bus.headsign,
   departMs:selected.departMs,boardingId:selected.boardingId,nextStop:selected.nextStop,
   best:matches[0]||null,matchingCount:matches.length,
   availablePlatforms:bus.boardingOptions.length});
 }
 rows.sort((a,b)=>a.departMs-b.departMs);
 return {date,rows,matchingCount:rows.filter(r=>r.best).length,
  totalCount:rows.length,source:"BKK Zrt., CC BY 4.0",live:false,config:cfg};
}
/* A bus-first, full-service-day timetable for the exact 260 stop and direction.
 * This is INDEPENDENT of which tram connections pass the user's constraints.
 * A genuine scheduled bus must never disappear just because no good transfer exists.
 */
const BUS_260_DIRECTIONS=Object.freeze({
 home:Object.freeze({stop:"Bécsi út / Vörösvári út",headsign:"Harsánylejtő",
  after:"Citronella utca",origin:"Munkahely",destination:"Otthon"}),
 work:Object.freeze({stop:"Citronella utca",headsign:"Óbudai rendelőintézet",
  after:"Bécsi út / Vörösvári út",origin:"Otthon",destination:"Munkahely"})
});
function bus260DirectionForTemplate(cfg){
 if(!cfg)return null;
 if(cfg.id==="monika-home-to-office"||
  cfg.targetRoute==="260"&&clean(cfg.targetStop)===clean("Citronella utca")&&
  clean(cfg.targetHeadsign).includes(clean("Óbudai")))return "work";
 if(cfg.id==="monika-260"||
  cfg.targetRoute==="260"&&clean(cfg.targetStop)===clean("Bécsi út / Vörösvári út")&&
  clean(cfg.targetHeadsign).includes(clean("Harsánylejtő")))return "home";
 return null;
}
function full260Timetable(data,date,direction,clock=Date.now()){
 if(!validate(data,clock))throw Error("A hivatalos BKK-adat hiányzik vagy lejárt.");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<data.feedStart||date>data.feedEnd)
  throw Error("A kiválasztott nap nem szerepel a hitelesített menetrendben.");
 const spec=BUS_260_DIRECTIONS[direction];
 if(!spec)throw Error("Ismeretlen 260-as irány.");
 const rows=[],dedup=new Set();
 const yesterday=new Date(date+"T12:00:00Z");yesterday.setUTCDate(yesterday.getUTCDate()-1);
 const prevDate=yesterday.toISOString().slice(0,10);
 const dateStart=wallEpoch(date,0),dateEnd=wallEpoch(date,24*60);
 for(const trip of data.trips){
  const [line,service,headsign,events,mode]=trip;
  if(line!=="260"||mode!=="bus"||!clean(headsign).includes(clean(spec.headsign)))continue;
  for(const serviceDate of [prevDate,date]){
   if(!active(data.services[service],serviceDate))continue;
   const candidate=[];
   for(let i=0;i<events.length-1;i++){
    if(clean(data.stops[events[i][0]]?.[0])!==clean(spec.stop))continue;
    // Require progress toward the right side of the 260 route, not merely
    // an identically named stop/platform traversed in the wrong direction.
    if(!events.slice(i+1).some(e=>clean(data.stops[e[0]]?.[0])===clean(spec.after)))continue;
    const dep=wallEpoch(serviceDate,events[i][2]/60);
    if(dep<dateStart||dep>=dateEnd)continue;
    candidate.push({departMs:dep,stopId:events[i][0],
     nextStop:data.stops[events[i+1][0]]?.[0]||"",headsign});
   }
   // One trip at the same public stop can pass several same-named platforms.
   // Select its final valid boarding platform; never count a loop as two buses.
   const selected=candidate.at(-1);
   if(!selected)continue;
   const key=selected.departMs+"|"+headsign;
   if(dedup.has(key))continue;
   dedup.add(key);
   rows.push({line:"260",mode:"bus",...selected,stop:spec.stop,direction,
    serviceDate,scheduled:true});
  }
 }
 rows.sort((a,b)=>a.departMs-b.departMs||a.stopId.localeCompare(b.stopId));
 return {date,direction,stop:spec.stop,headsign:spec.headsign,rows,
  source:"BKK Zrt., CC BY 4.0",live:false};
}

function pair260Connections(timetable,connections,cfg){
 if(!timetable||!Array.isArray(timetable.rows))throw Error("260-as menetrend nélkül nem kapcsolható csatlakozás.");
 const rows=connections?.rows||[],dir=timetable.direction;
 return {...timetable,rows:timetable.rows.map(bus=>{
  const match=rows.filter(r=>{
   if(!r.best)return false;
   if(cfg.type==="walk")return r.departMs===bus.departMs;
   return dir==="work"?r.best.feederLine==="260"&&
    r.best.feederDepartMs===bus.departMs:r.departMs===bus.departMs;
  }).sort((a,b)=>{
   const aw=Math.abs((a.best?.waitMin||0)-2),bw=Math.abs((b.best?.waitMin||0)-2);
   return aw-bw||a.departMs-b.departMs;
  })[0]||null;
  const leaveMs=match?.best?.leaveOfficeMs??(cfg.type==="walk"?
   bus.departMs-(cfg.originWalkMin+cfg.originSafetyMin)*60000:null);
  return {...bus,match,leaveMs,connectionOk:!!match};
 })};
}

function nextIndex(rows,now=Date.now()){
 return rows.findIndex(r=>r.best&&r.best.leaveOfficeMs>=now);
}

/* Second saved example: a walk-to-stop template, no fictional tram connection. */
const HOME=Object.freeze({
 schema:"sh9.smart-match.template/1",id:"home-citronella-260",profile:"monika",
 type:"walk",title:"Otthon → Citronella utca",originLabel:"Otthon",
 destinationLabel:"Óbudai rendelőintézet",originStop:"",
 targetStop:"Citronella utca",targetRoute:"260",targetHeadsign:"Óbudai rendelőintézet",
 feederRoutes:[],startHour:6,endHour:21,originWalkMin:6,originSafetyMin:2,
 maxWaitMin:3,transferWalkMin:0,transferSafetyMin:0,maxTransferMeters:350
});
/* Verified reverse of Mónika's work->home template, independent of the separate
 * "Otthon -> Citronella utca" walk-only favorite.
 * Two legs: 260 toward Óbudai rendelőintézet -> 17 toward Kolosy tér.
 * Only real active BKK trips with a forward Kolosy stop qualify.
 */
const REVERSE=Object.freeze({
 schema:"sh9.smart-match.template/1",id:"monika-home-to-office",profile:"monika",
 reverseId:"monika-260",type:"transfer",
 title:"Mónika · Otthon → Munkahely",originLabel:"Otthon",destinationLabel:"Bécsi Corner",
 originStop:"Citronella utca",transferStop:"Bécsi út / Vörösvári út",
 targetStop:"Bécsi út / Vörösvári út",targetRoute:"17",targetHeadsign:"",
 targetAfterStop:"Kolosy tér",
 feederRoutes:["260"],feederHeadsign:"Óbudai rendelőintézet",
 startHour:6,endHour:19,
 originWalkMin:6,originSafetyMin:2,transferWalkMin:2,transferSafetyMin:1,
 maxWaitMin:3,maxTransferMeters:350,destinationWalkMin:10
});
const SAMPLES=Object.freeze([DEFAULT,HOME,REVERSE]);
function walkOnlyOptions(data,date,cfg=HOME,clock=Date.now()){
 if(!validate(data,clock))throw Error("A hiteles BKK-menetrend hiányzik vagy lejárt.");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<data.feedStart||date>data.feedEnd)
  throw Error("Ezen a napon nincs ellenőrzött menetrend.");
 if(!data.routes.includes(cfg.targetRoute)||!Number.isInteger(cfg.startHour)||
  !Number.isInteger(cfg.endHour)||cfg.startHour<0||cfg.endHour>24||
  cfg.endHour<=cfg.startHour||!Number.isInteger(cfg.originWalkMin)||
  cfg.originWalkMin<0||cfg.originWalkMin>30||!Number.isInteger(cfg.originSafetyMin)||
  cfg.originSafetyMin<0||cfg.originSafetyMin>10)throw Error("Hibás gyalogos sablon.");
 const stopMap=indexStops(data),boarding=new Set(stopMap.get(clean(cfg.targetStop))||[]);
 if(!boarding.size)throw Error("A célmegálló hiányzik a BKK GTFS-ből.");
 const start=wallEpoch(date,cfg.startHour*60),end=wallEpoch(date,cfg.endHour*60);
 const found=new Map();
 for(const [line,service,headsign,events,mode] of data.trips){
  if(line!==cfg.targetRoute||!active(data.services[service],date)||
   (cfg.targetHeadsign&&!clean(headsign).includes(clean(cfg.targetHeadsign))))continue;
  for(let i=0;i<events.length-1;i++){
   if(!boarding.has(events[i][0]))continue;
   const dep=wallEpoch(date,events[i][2]/60);
   if(dep<start||dep>=end)continue;
   const k=dep+"|"+events[i][0]+"|"+headsign;
   if(found.has(k))continue;
   found.set(k,{line,mode,headsign,departMs:dep,boardingId:events[i][0],
    best:{feederLine:null,feederMode:"walk",
     leaveOfficeMs:dep-(cfg.originWalkMin+cfg.originSafetyMin)*60000,
     feederDepartMs:null,feederArriveMs:null,transferWalkMin:cfg.originWalkMin,
     transferMeters:null,waitMin:cfg.originSafetyMin},
    matchingCount:1});
  }
 }
 const rows=[...found.values()].sort((a,b)=>a.departMs-b.departMs);
 return {date,rows,matchingCount:rows.length,totalCount:rows.length,
  source:"BKK Zrt., CC BY 4.0",live:false,config:cfg};
}
function compute(data,date,cfg,clock=Date.now()){
 return cfg?.type==="walk"?walkOnlyOptions(data,date,cfg,clock):options(data,date,cfg,clock);
}
export {DEFAULT,HOME,REVERSE,SAMPLES,BUS_260_DIRECTIONS,bus260DirectionForTemplate,full260Timetable,pair260Connections,
 clean,dist,validConfig,indexStops,options,walkOnlyOptions,compute,nextIndex};
