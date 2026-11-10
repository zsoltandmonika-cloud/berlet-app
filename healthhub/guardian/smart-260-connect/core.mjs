/* SH9 Smart Match v1: general target-first GTFS connection optimizer.
 * Read-only math; never modifies GPS, phones, Dropbox, Family Guard or databases.
 * Time evidence: BKK Zrt. CC BY 4.0 static GTFS, never pretend LIVE.
 */
import {active,validate,wallEpoch} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";

const DEFAULT=Object.freeze({
 schema:"sh9.smart-match.template/1",id:"monika-260",profile:"monika",
 title:"Mónika · Munkahely → Otthon",originLabel:"Bécsi Corner",destinationLabel:"Otthon",
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
   for(let i=0;i<events.length;i++){
    if(!boarding.has(events[i][0]))continue;
    const dep=wallEpoch(date,events[i][2]/60);
    if(dep<min||dep>=max)continue;
    // Next physical stop exists: never advertise a non-departing terminal record.
    if(!events[i+1])continue;
    targets.push({line,mode,headsign,departMs:dep,boardingId:events[i][0],
     nextStop:data.stops[events[i+1][0]]?.[0]||""});
   }
  }
  if(feedLines.has(line)){
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
 const unique=new Map();
 for(const t of targets){
  const k=[t.line,t.departMs,t.boardingId,t.headsign].join("|");
  if(!unique.has(k))unique.set(k,t);
 }
 const rows=[];
 for(const bus of [...unique.values()].sort((a,b)=>a.departMs-b.departMs)){
  const matches=[];
  for(const tram of feeders){
   const meters=dist(data.stops[tram.endId],data.stops[bus.boardingId]);
   if(meters>cfg.maxTransferMeters)continue;
   // 1.4x aerial separation / 65 m per minute is a conservative walk ESTIMATE.
   const transferWalkMin=Math.max(cfg.transferWalkMin,Math.ceil(meters*1.4/65));
   const waitMin=(bus.departMs-tram.arriveMs)/60000-transferWalkMin;
   if(waitMin<cfg.transferSafetyMin||waitMin>cfg.maxWaitMin)continue;
   const leaveOfficeMs=tram.departMs-(cfg.originWalkMin+cfg.originSafetyMin)*60000;
   matches.push({feederLine:tram.line,feederMode:tram.mode,feederHead:tram.headsign,
    feederDepartMs:tram.departMs,feederArriveMs:tram.arriveMs,leaveOfficeMs,
    transferWalkMin,transferMeters:meters,waitMin:Math.round(waitMin*10)/10});
  }
  matches.sort((a,b)=>Math.abs(a.waitMin-2)-Math.abs(b.waitMin-2)||
    b.leaveOfficeMs-a.leaveOfficeMs);
  rows.push({...bus,best:matches[0]||null,matchingCount:matches.length});
 }
 return {date,rows,matchingCount:rows.filter(r=>r.best).length,
  totalCount:rows.length,source:"BKK Zrt., CC BY 4.0",live:false,config:cfg};
}
function nextIndex(rows,now=Date.now()){
 return rows.findIndex(r=>r.best&&r.best.leaveOfficeMs>=now);
}
export {DEFAULT,clean,dist,validConfig,indexStops,options,nextIndex};
