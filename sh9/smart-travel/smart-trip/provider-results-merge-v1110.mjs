/* SH9 v1110 · ONE result aggregator for THREE existing engines.
 * No route graph, GTFS downloads, credentials or personal storage.
 * Takes already computed BKK (Guardian), MÁV Rail and Volán Smart outputs.
 * Statuses, provenance and unverified walking are never upgraded to facts.
 */
const MAX=30,TRANSIT=new Set(["bus","tram","train","metro","hev","other"]);
const clean=x=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,120);
const norm=x=>clean(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const parse=x=>x instanceof Date?x.getTime():typeof x==="number"?x:Date.parse(x);
const iso=x=>new Date(x).toISOString();
function validTime(start,end){
 const a=parse(start),b=parse(end);
 return Number.isFinite(a)&&Number.isFinite(b)&&b>a&&b-a<=24*3600000;
}
function names(l){return {
 from:clean(l.from),to:clean(l.to),
 departure:iso(parse(l.departure)),arrival:iso(parse(l.arrival)),
 line:clean(l.line),mode:l.mode||"other",status:"timetable"
}}
function base(provider,from,to,legs,{source,generatedAt,walkMeters=null,
 walkVerified=false,waitMinutes=null,waitVerified=false,confidence="timetable"}={}){
 if(!["bkk","mav","volan"].includes(provider)||!clean(from)||!clean(to)||
  norm(from)===norm(to)||!Array.isArray(legs)||legs.length<1||legs.length>6||
  !legs.every(x=>TRANSIT.has(x.mode)&&x.line&&x.from&&x.to&&validTime(x.departure,x.arrival)))
  return null;
 for(let i=1;i<legs.length;i++){
  if(parse(legs[i].departure)-parse(legs[i-1].arrival)<5*60000)return null;
  // Different stations are not silently treated as the same walking transfer.
  if(norm(legs[i].from)!==norm(legs[i-1].to))return null;
 }
 const start=parse(legs[0].departure),end=parse(legs.at(-1).arrival);
 if(!validTime(start,end))return null;
 const walk=Number.isFinite(walkMeters)&&walkMeters>=0?Math.round(walkMeters):null;
 const wait=Number.isFinite(waitMinutes)&&waitMinutes>=0?waitMinutes:null;
 return Object.freeze({
  provider,from:clean(from),to:clean(to),departure:iso(start),arrival:iso(end),
  legs:legs.map(l=>Object.freeze(names(l))),transfers:legs.length-1,
  durationMinutes:Math.round((end-start)/60000),
  source:clean(source)||provider,generatedAt:generatedAt||null,
  walkMeters:walk,walkVerified:walkVerified===true,
  waitMinutes:wait,waitVerified:waitVerified===true,
  confidence,realTime:false
 });
}
function mav(result,{from,to}={}){
 if(!result||result.status!=="ok"||!Array.isArray(result.journeys)||
  !/m[aá]v|rail|vasút|gtfs/i.test(String(result.source||"")))return [];
 return result.journeys.slice(0,MAX).map(j=>{
  if(!Array.isArray(j.legs)||!j.legs.length)return null;
  return base("mav",from||j.legs[0].from,to||j.legs.at(-1).to,
   j.legs.map(l=>({mode:"train",line:clean(l.service||l.tripId),
    from:l.from,to:l.to,departure:l.departure,arrival:l.arrival})),
   {source:result.source,generatedAt:result.generatedAt});
 }).filter(Boolean);
}
function volan(list,{from,to,stopById,source="Volán GTFS (helyi)",generatedAt}={}){
 if(!Array.isArray(list)||!stopById||!String(source).toLowerCase().includes("volán"))return [];
 const get=id=>{
  const s=stopById instanceof Map?stopById.get(id):stopById[id];
  return clean(s?.name);
 };
 return list.slice(0,MAX).map(j=>{
  if(!j||!j.trip||!Array.isArray(j.trip.stops)||
   !Number.isInteger(j.start)||!Number.isInteger(j.end)||
   j.start<0||j.end<=j.start||j.end>=j.trip.stops.length)return null;
  const origin=get(j.trip.stops[j.start][0]),dest=get(j.trip.stops[j.end][0]);
  const line=clean(j.route?.number||j.trip?.number||j.route?.name);
  if(!line||!origin||!dest)return null;
  return base("volan",from||origin,to||dest,[{
   mode:"bus",line,from:origin,to:dest,departure:j.depart,arrival:j.arrive
  }],{source,generatedAt});
 }).filter(Boolean);
}
function bkk(plans,{from,to,source="BKK Zrt., CC BY 4.0",generatedAt,
 timingValidator}={}){
 if(!Array.isArray(plans)||source!=="BKK Zrt., CC BY 4.0")return [];
 // Use Guardian's existing verifiedTiming() as the only authority for
 // real scheduled clocks, not the visual Trip Plan Flow's estimated times.
 if(typeof timingValidator!=="function")return [];
 return plans.slice(0,MAX).map(p=>{
  if(!p||!Array.isArray(p.legs)||!p.legs.length||p.legs.length>6)return null;
  const times=timingValidator(p);
  if(!times||!validTime(times.departure,times.arrival)||
   !Array.isArray(p.timing?.matchedLegs)||p.timing.matchedLegs.length!==p.legs.length)
   return null;
  // Verified matching metadata lacks per-leg exact clock values. Never
  // fabricate interchanges; a complete GTFS per-leg schedule is required.
  if(!Array.isArray(p.timing.legTimes)||p.timing.legTimes.length!==p.legs.length)return null;
  const legs=p.legs.map((leg,i)=>{
   const t=p.timing.legTimes[i];
   return {mode:leg.line?.mode||(/^260$/.test(String(leg.line?.id))?"bus":"tram"),
    line:clean(leg.line?.id),from:leg.enter?.name,to:leg.exit?.name,
    departure:t?.departure,arrival:t?.arrival};
  });
  return base("bkk",from||p.legs[0].enter?.name,
   to||p.legs.at(-1).exit?.name,legs,{
    source,generatedAt,
    walkMeters:p.walk,walkVerified:times.walkMinutes!==null,
    waitMinutes:times.waitMinutes,waitVerified:times.waitMinutes!==null
   });
 }).filter(Boolean);
}
function rating(x){
 if(!x||!Array.isArray(x.legs))return {stars:0,provisional:true,score:Infinity};
 const confidence=x.confidence==="timetable";
 const walkConfirmed=x.walkVerified&&x.walkMeters!==null;
 const waitConfirmed=x.waitVerified&&x.waitMinutes!==null;
 const verified=walkConfirmed&&waitConfirmed&&confidence;
 const ideal=verified&&x.transfers<=2&&x.walkMeters<=350&&x.waitMinutes<=5;
 const stars=ideal?5:Math.min(4,1+
  (confidence?1:0)+(x.transfers<=1?1:0)+(walkConfirmed&&x.walkMeters<=350?1:0));
 const cost=x.durationMinutes+x.transfers*15+
  (walkConfirmed?x.walkMeters/75:12)+(waitConfirmed?x.waitMinutes:12);
 return {stars,provisional:!verified,score:cost};
}
function combine({bkk:ba=[],mav:ma=[],volan:vo=[]},{from,to,travelDate}={}){
 const errors=[],eligible=[],excluded=[];
 if(!from||!to||!/^\d{4}-\d\d-\d\d$/.test(travelDate||""))
  return {status:"invalid_request",options:[],excluded:[],errors:["missing_query"]};
 for(const item of [...ba,...ma,...vo]){
  if(!item||!Array.isArray(item.legs))continue;
  const routeDay=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(item.departure));
  const p=Object.fromEntries(routeDay.map(y=>[y.type,y.value]));
  const day=[p.year,p.month,p.day].join("-");
  if(norm(item.from)!==norm(from)||norm(item.to)!==norm(to)||day!==travelDate){
   excluded.push({provider:item.provider,reason:"different_endpoints_or_day"});
   continue;
  }
  eligible.push(item);
 }
 const fingerprints=new Set();
 const sorted=eligible.sort((a,b)=>rating(a).score-rating(b).score||
  parse(a.arrival)-parse(b.arrival));
 const options=[];
 for(const x of sorted){
  const fingerprint=x.legs.map(l=>[l.line,l.departure,l.arrival,l.from,l.to].join("|")).join("~");
  if(fingerprints.has(fingerprint))continue;
  fingerprints.add(fingerprint);
  options.push({...x,evaluation:rating(x)});
  if(options.length===12)break;
 }
 return {status:options.length?"ok":"no_comparable_results",options,excluded,errors};
}
function toTripPack(choice,travelDate){
 if(!choice||choice.confidence!=="timetable"||!choice.legs?.length||
  !/^\d{4}-\d\d-\d\d$/.test(travelDate))throw Error("unverified_provider_choice");
 const hh=t=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(t));
 return {
  schema:"sh9.trip-pack/1",title:choice.from+" → "+choice.to,travelDate,
  from:choice.from,to:choice.to,departure:hh(choice.departure),arrival:hh(choice.arrival),
  arrivalStatus:"timetable",segments:choice.legs.map(l=>({
   mode:l.mode,line:l.line,from:l.from,to:l.to,departure:hh(l.departure),
   arrival:hh(l.arrival),status:"timetable",
   note:choice.source+"; késés és peron nem ellenőrzött."
  })),summary:"Forrás: "+choice.source+
   ". Nem élő menetrend. A gyaloglás/átszállás csak külön ellenőrzés esetén tekinthető biztosnak.",
  alerts:[{title:"Menetrend, nem valós idejű adat",
   text:"Indulás előtt ellenőrizd az aktuális eltéréseket az üzemeltetőnél."}],
  alternatives:[],sources:[{name:choice.source,url:choice.provider==="bkk"?
   "https://opendata.bkk.hu/data-sources":choice.provider==="mav"?
   "https://mavplusz.hu/":"https://www.mavcsoport.hu/"}]
 };
}
export {mav,volan,bkk,combine,rating,toTripPack};
