/* SHO Smart 260 Connect: independently readable BKK GTFS transfer matcher.
 * No GPS, accounts, phone pairing, Supabase, Dropbox writes or backend polling.
 * BKK Zrt., CC BY 4.0; timetable departures, NOT real-time data.
 */
import {active,validate,wallEpoch} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const TERMINAL="becsi ut vorosvari ut";
const KOLOSY="kolosy ter";
const DESTINATION="harsanylejto";
const ROAD="orban balazs ut";
const isTerminal=s=>norm(s)===TERMINAL;
const isKolosy=s=>norm(s)===KOLOSY;
const isDestination=s=>norm(s).includes(DESTINATION);
function meters(a,b){
 const r=Math.PI/180,p=(b[1]-a[1])*r,q=(b[2]-a[2])*r;
 const z=Math.sin(p/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(q/2)**2;
 return Math.round(6371000*2*Math.asin(Math.min(1,Math.sqrt(z))));
}
function validHour(x){return Number.isInteger(x)&&x>=0&&x<=24;}
function routeList(data,date,{startHour=16,endHour=19}={}){
 const tramCandidates=[],busCandidates=[];
 const lower=wallEpoch(date,startHour*60),upper=wallEpoch(date,endHour*60);
 for(const trip of data.trips){
  const [line,service,headsign,events,mode]=trip;
  if(!active(data.services[service],date))continue;
  if(["17","19","41"].includes(line)&&mode==="tram"){
   for(let i=0;i<events.length-1;i++){
    const origin=data.stops[events[i][0]];
    if(!origin||!isKolosy(origin[0]))continue;
    for(let j=i+1;j<events.length;j++){
     const target=data.stops[events[j][0]];
     if(!target||!isTerminal(target[0]))continue;
     const departMs=wallEpoch(date,events[i][2]/60),arriveMs=wallEpoch(date,events[j][1]/60);
     if(arriveMs>departMs&&arriveMs>=lower-30*60000&&arriveMs<upper){
      tramCandidates.push({line,headsign,departMs,arriveMs,arrivalStop:events[j][0]});
     }
     break;
    }
   }
  }
  if(line==="260"&&mode==="bus"&&isDestination(headsign)){
   for(let i=0;i<events.length-1;i++){
    const at=data.stops[events[i][0]];
    if(!at||!isTerminal(at[0]))continue;
    // The circular 260 visits similar-named stops in both directions.
    // To qualify, an outbound Orbán Balázs út stop MUST follow this boarding.
    const after=events.slice(i+1);
    if(!after.some(e=>norm(data.stops[e[0]]?.[0])===ROAD))continue;
    const departMs=wallEpoch(date,events[i][2]/60);
    if(departMs>=lower&&departMs<upper)
     busCandidates.push({line,headsign,departMs,boardingStop:events[i][0]});
   }
  }
 }
 return {trams:tramCandidates,buses:busCandidates};
}
function plan(data,date,{officeWalk=5,maxWait=3,startHour=16,endHour=19}={}){
 if(!validate(data)||date<data.feedStart||date>data.feedEnd)
  throw Error("A BKK GTFS hiányzik, sérült vagy lejárt.");
 if(!validHour(startHour)||!validHour(endHour)||endHour<=startHour)
  throw Error("Hibás időintervallum.");
 const workWalk=Math.max(2,Math.min(15,Number(officeWalk)||5));
 const maxStopWait=Math.max(1,Math.min(3,Number(maxWait)||3));
 const {trams,buses}=routeList(data,date,{startHour,endHour});
 const uniq=new Set(),rows=[];
 for(const bus of buses.sort((a,b)=>a.departMs-b.departMs)){
  const key=bus.departMs+"/"+bus.boardingStop;
  if(uniq.has(key))continue;
  uniq.add(key);
  const matching=[];
  for(const tram of trams){
   const straight=meters(data.stops[tram.arrivalStop],data.stops[bus.boardingStop]);
   if(straight>400)continue;
   // Footpath is NOT surveyed. Approximate walking distance = 1.5x air distance,
   // 70m/min, at least 2 minutes. Never label this transfer "guaranteed".
   const transferWalkMin=Math.max(2,Math.ceil(straight*1.5/70));
   const waitMin=(bus.departMs-tram.arriveMs)/60000-transferWalkMin;
   if(waitMin<1||waitMin>maxStopWait)continue;
   matching.push({tramLine:tram.line,tramHead:tram.headsign,tramDepMs:tram.departMs,
    tramArrMs:tram.arriveMs,leaveOfficeMs:tram.departMs-(workWalk+1)*60000,
    transferWalkMin,transferMeters:straight,waitMin:Math.round(waitMin*10)/10});
  }
  matching.sort((a,b)=>Math.abs(a.waitMin-2)-Math.abs(b.waitMin-2)||
   b.leaveOfficeMs-a.leaveOfficeMs);
  rows.push({busDepMs:bus.departMs,headsign:bus.headsign,
   recommended:matching[0]||null,choices:matching.length});
 }
 return {date,rows,source:"BKK Zrt., CC BY 4.0",live:false,
  officeWalk:workWalk,maxWait:maxStopWait,startHour,endHour,tramsObserved:trams.length};
}
export {plan,routeList,meters};
