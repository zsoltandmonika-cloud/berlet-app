/* SH9 v1105 · free, scheduled BKK pilot. Exact stop-to-stop journeys only.
 * BKK Zrt., CC BY 4.0 | no API key | no polling | no invented walking.
 * This module is source-agnostic; official ZIP is converted offline.
 */
const TZ="Europe/Budapest";
const fmt=new Intl.DateTimeFormat("en-GB",{timeZone:TZ,year:"numeric",
 month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const shift=(ymd,n)=>{const t=new Date(ymd+"T12:00:00Z");t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
function wallEpoch(ymd,minute){
 if(!/^\d{4}-\d\d-\d\d$/.test(ymd)||!Number.isFinite(minute)||minute<0||minute>=48*60)return NaN;
 const [y,m,d]=ymd.split("-").map(Number);
 const target=Date.UTC(y,m-1,d,0,0,0)+Math.round(minute*60000);
 let guess=target-3600000;
 for(let i=0;i<4;i++){
  const p={};for(const part of fmt.formatToParts(new Date(guess)))if(part.type!=="literal")p[part.type]=Number(part.value);
  const delta=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
  if(!delta)break;
  guess+=delta;
 }
 return guess;
}
const date=s=>typeof s==="string"&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 Number.isFinite(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
function active(s,ymd){
 if(!s||!date(ymd))return false;
 if(Object.prototype.hasOwnProperty.call(s.exceptions||{},ymd))return s.exceptions[ymd]===true;
 if(!date(s.start)||!date(s.end)||ymd<s.start||ymd>s.end||
  !Array.isArray(s.days)||s.days.length!==7)return false;
 const day=(new Date(ymd+"T12:00:00Z").getUTCDay()+6)%7;
 return s.days[day]===1;
}
function validate(data,at=Date.now()){
 if(!data||data.schema!=="sh9.bkk.gtfs/1"||data.source!=="BKK Zrt., CC BY 4.0"||
  data.license!=="CC-BY-4.0"||data.coverage!=="stop-to-stop"||data.live!==false||
  data.sourceUrl!=="https://bkk.hu/gtfs/budapest_gtfs.zip"||
  !date(data.feedStart)||!date(data.feedEnd)||data.feedEnd<data.feedStart||
  !Array.isArray(data.routes)||!data.routes.length||data.routes.length>24||
  typeof data.stops!=="object"||!data.stops||Array.isArray(data.stops)||
  typeof data.services!=="object"||!data.services||Array.isArray(data.services)||
  !Array.isArray(data.trips)||!data.trips.length||data.trips.length>20000)return false;
 const generated=Date.parse(data.generatedAt);
 if(!Number.isFinite(generated)||generated>at+60000||at-generated>14*86400000)return false;
 const stops=Object.entries(data.stops);
 if(stops.length>15000||stops.length<2)return false;
 for(const [id,s] of stops)
  if(!id||!Array.isArray(s)||s.length!==3||typeof s[0]!=="string"||s[0].length>130||
   !Number.isFinite(s[1])||s[1]<45||s[1]>49||!Number.isFinite(s[2])||s[2]<16||s[2]>23)return false;
 const stopIDs=new Set(stops.map(([id])=>id));
 // The extra names expand only predictive typing, never routing.
 if(data.searchStops!==undefined){
  if(!Array.isArray(data.searchStops)||data.searchStops.length<2||
   data.searchStops.length>12000)return false;
  const names=new Set();
  for(const name of data.searchStops){
   if(typeof name!=="string"||name.length<2||name.length>120)return false;
   const key=norm(name);
   if(names.has(key))return false;
   names.add(key);
  }
  if(stops.some(([,stop])=>!names.has(norm(stop[0]))))return false;
 }
 const routes=new Set(data.routes);
 for(const trip of data.trips){
  if(!Array.isArray(trip)||trip.length!==5||!routes.has(trip[0])||
   !["bus","tram","metro","train"].includes(trip[4])||
   !Object.prototype.hasOwnProperty.call(data.services,trip[1])||
   !Array.isArray(trip[3])||trip[3].length<2||trip[3].length>500)return false;
  let prev=-1;
  for(const ev of trip[3]){
   if(!Array.isArray(ev)||ev.length!==3||!stopIDs.has(ev[0])||
    !Number.isInteger(ev[1])||!Number.isInteger(ev[2])||
    ev[1]<0||ev[2]<ev[1]||ev[2]>=48*3600||ev[1]<prev)return false;
   prev=ev[2];
  }
 }
 return true;
}
function stopIds(stops,name){
 const needle=norm(name);
 if(needle.length<3)return [];
 // Avoid partial matching: a generic "Bécsi út" must NOT silently select
 // an unrelated station or platform.
 return Object.entries(stops).filter(([,item])=>norm(item[0])===needle).map(([id])=>id);
}
function find(data,q,at=Date.now()){
 if(!validate(data,at)||!date(q?.date)||!["depart","now","arrive"].includes(q.mode)||
  !Number.isFinite(Date.parse(q.when))||q.date<data.feedStart||q.date>data.feedEnd)return [];
 const starts=new Set(stopIds(data.stops,q.from)),goals=new Set(stopIds(data.stops,q.to));
 if(!starts.size||!goals.size)return [];
 const pivot=Date.parse(q.when),results=[];
 for(const trip of data.trips){
  // The previous service day can legitimately have departure times 24:xx.
  for(const serviceDay of [shift(q.date,-1),q.date]){
   if(!active(data.services[trip[1]],serviceDay))continue;
   const events=trip[3];
   for(let i=0;i<events.length-1;i++){
    if(!starts.has(events[i][0]))continue;
    const depart=wallEpoch(serviceDay,events[i][2]/60);
    if(!Number.isFinite(depart)||q.mode!=="arrive"&&depart<pivot||
     depart>pivot+8*3600000||depart<pivot-8*3600000)continue;
    for(let j=i+1;j<events.length;j++){
     if(!goals.has(events[j][0]))continue;
     const arrival=wallEpoch(serviceDay,events[j][1]/60);
     if(!Number.isFinite(arrival)||arrival<=depart||
      arrival-depart>4*3600000||q.mode==="arrive"&&arrival>pivot)continue;
     const origin=data.stops[events[i][0]][0],destination=data.stops[events[j][0]][0];
     results.push({line:trip[0],mode:trip[4],headsign:trip[2],
      from:origin,to:destination,departure:new Date(depart).toISOString(),
      arrival:new Date(arrival).toISOString(),status:"timetable",
      source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop"});
     break;
    }
   }
  }
 }
 results.sort((a,b)=>q.mode==="arrive"?
  Date.parse(b.departure)-Date.parse(a.departure):
  Date.parse(a.departure)-Date.parse(b.departure));
 return results.slice(0,10);
}
const HH=iso=>new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",minute:"2-digit",
 hourCycle:"h23"}).format(new Date(iso));
 function toTripPack(q,route){
 if(!route||route.source!=="BKK Zrt., CC BY 4.0"||route.coverage!=="stop-to-stop"||
  !["bus","tram","metro","train"].includes(route.mode)||
  !q||norm(route.from)!==norm(q.from)||norm(route.to)!==norm(q.to))
  throw Error("not_exact_stop_to_stop");
 return {
  schema:"sh9.trip-pack/1",title:route.from+" → "+route.to,
  travelDate:q.date,from:route.from,to:route.to,
  departure:HH(route.departure),arrival:HH(route.arrival),arrivalStatus:"timetable",
  summary:"BKK GTFS tervezett indulás, kizárólag megállótól megállóig. Nem ajtótól ajtóig tartó útiterv; gyaloglás, késés és valós idejű forgalom nincs ellenőrizve.",
  segments:[{
   mode:route.mode,line:route.line,from:route.from,to:route.to,
   departure:HH(route.departure),arrival:HH(route.arrival),status:"timetable",
   note:"BKK Zrt. GTFS: menetrend szerinti adat, nem élő járatkövetés."
  }],
  alerts:[{title:"Csak menetrendi útiterv",text:"Indulás előtt ellenőrizd az aktuális változásokat a BudapestGO-ban."}],
  alternatives:[],sources:[{name:"BKK Zrt., CC BY 4.0",url:"https://opendata.bkk.hu/data-sources"}]
 };
}
export {validate,active,find,toTripPack,wallEpoch,stopIds};
