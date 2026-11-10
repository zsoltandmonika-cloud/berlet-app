/* SHO Biztonság · Smart 260 Connect · v1 (read-only pilot).
 * Official BKK GTFS snapshot, no GPS, device token, Dropbox or Supabase writes.
 * All times are TIMETABLE only. Estimated walking is not a verified footpath.
 */
import {active,validate,wallEpoch} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
const normal=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const isTerminal=s=>normal(s)==="becsi ut vorosvari ut";
const isKolosy=s=>normal(s)==="kolosy ter";
const isOutbound=s=>normal(s).startsWith("orban balazs ut");
function meters(a,b) {
 const r=Math.PI/180,p=(b[1]-a[1])*r,q=(b[2]-a[2])*r;
 const z=Math.sin(p/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(q/2)**2;
 return Math.round(6371000*2*Math.asin(Math.min(1,Math.sqrt(z))));
}
function routeList(data,date) {
 const trams=[],buses=[];
 for(const trip of data.trips) {
  const [line,service,headsign,events,mode]=trip;
  if(!active(data.services[service],date))continue;
  if(["17","19","41"].includes(line)&&mode==="tram") {
   for(let i=0;i<events.length-1;i++) {
    const start=data.stops[events[i][0]];
    if(!start||!isKolosy(start[0]))continue;
    for(let j=i+1;j<events.length;j++) {
     const end=data.stops[events[j][0]];
     if(!end||!isTerminal(end[0]))continue;
     const dep=wallEpoch(date,events[i][2]/60),arr=wallEpoch(date,events[j][1]/60);
     if(arr>dep&&dep>=wallEpoch(date,14*60)&&dep<=wallEpoch(date,19*60)) {
      trams.push({line,headsign,departMs:dep,arriveMs:arr,arrivalStop:events[j][0]});
     }
     break;
    }
   }
  }
  if(line==="260"&&mode==="bus") {
   const boarding=[];
   for(let i=0;i<events.length-1;i++) {
    const stop=data.stops[events[i][0]];
    if(!stop||!isTerminal(stop[0]))continue;
    // Only journeys going toward Testvérhegy, NOT Óbudai rendelőintézet.
    const next=events.slice(i+1,Math.min(i+5,events.length));
    if(!next.some(e=>isOutbound(data.stops[e[0]]?.[0])))continue;
    const dep=wallEpoch(date,events[i][2]/60);
    if(dep<wallEpoch(date,16*60)||dep>=wallEpoch(date,19*60))continue;
    const d=Math.min(...trams.map(t=>meters(data.stops[t.arrivalStop],stop)));
    boarding.push({line,headsign,departMs:dep,boardingStop:events[i][0],distance:d});
   }
   if(boarding.length) {
    boarding.sort((a,b)=>a.distance-b.distance||a.departMs-b.departMs);
    buses.push(boarding[0]);
   }
  }
 }
 return {trams,buses};
}
function plan(data,date,{officeWalk=5,maxWait=3}={}) {
 if(!validate(data)||date<data.feedStart||date>data.feedEnd)throw Error("Nem használható vagy lejárt BKK GTFS adat.");
 const walkToTram=Math.max(2,Math.min(15,Number(officeWalk)||5));
 const maxStopWait=Math.max(1,Math.min(3,Number(maxWait)||3));
 const {trams,buses}=routeList(data,date);
 const rows=[],seen=new Set();
 for(const bus of buses.sort((a,b)=>a.departMs-b.departMs)){
  const key=bus.departMs+"/"+bus.boardingStop;
  if(seen.has(key))continue;
  seen.add(key);
  const matches=[];
  for(const tram of trams){
   const direct=meters(data.stops[tram.arrivalStop],data.stops[bus.boardingStop]);
   if(direct>400)continue;
   // 1.5 x straight line / 70 m/min, >=2 min. Estimate only.
   const footMin=Math.max(2,Math.ceil(direct*1.5/70));
   const stopWait=(bus.departMs-tram.arriveMs)/60000-footMin;
   if(stopWait<1||stopWait>maxStopWait||tram.departMs>=bus.departMs)continue;
   matches.push({tramLine:tram.line,tramDepMs:tram.departMs,tramArrMs:tram.arriveMs,
    leaveOfficeMs:tram.departMs-(walkToTram+1)*60000,
    footMin,footMeters:direct,stopWait:Math.round(stopWait*10)/10});
  }
  matches.sort((a,b)=>Math.abs(a.stopWait-2)-Math.abs(b.stopWait-2)||
   b.leaveOfficeMs-a.leaveOfficeMs);
  rows.push({busDepMs:bus.departMs,headsign:bus.headsign,best:matches[0]||null,
   options:matches.length});
 }
 return {date,rows,source:"BKK Zrt., CC BY 4.0",live:false,officeWalk:walkToTram,
  maxStopWait,tramCount:trams.length};
}
export {plan,meters,routeList};
