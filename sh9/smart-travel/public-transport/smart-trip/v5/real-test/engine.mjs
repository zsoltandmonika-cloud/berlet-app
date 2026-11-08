/* Smart Trip V5 · deterministic, map-free REAL Google transit audit.
 * No demo fixtures. No LLM. Never save/merge provider content with GTFS.
 * Google result visibility is not independent verification of any operator.
 */
const TZ="Europe/Budapest";
const huTime=iso=>{
 const t=Date.parse(iso||"");
 return Number.isFinite(t)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:TZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).format(new Date(t)):null;
};
const duration=x=>{
 if(typeof x!=="string"||!/^[0-9]+(?:\.[0-9]+)?s$/.test(x))return null;
 const m=Number(x.slice(0,-1))/60;return Number.isFinite(m)&&m>=0&&m<1440?m:null;
};
const clean=x=>String(x??"").slice(0,120);
const fold=x=>clean(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase();
function classify(step){
 if(step?.travelMode!=="TRANSIT")return null;
 const t=step.transitDetails,line=t?.transitLine,veh=fold(line?.vehicle?.type);
 const agencyNames=Array.isArray(line?.agencies)?line.agencies.map(x=>clean(x?.name)):[];
 const agencies=fold(agencyNames.join(" "));
 const label=clean(line?.nameShort||line?.name||"Ismeretlen járat");
 const local=/bkk|bkv|budapesti kozlekedes|budapest transport/.test(agencies);
 const train=/rail|train|metro|subway/.test(veh);
 const bus=/bus|trolley/.test(veh);
 const mav=/mav|máv|gysev|vasut/.test(agencies)&&train;
 const volan=/volan|volán/.test(agencies)&&bus||
  /mav szemelyszallitas/.test(agencies)&&bus&&!local||
  /intercity_bus/.test(veh)&&/mav|volan/.test(agencies);
 const kind=local?"BKK":volan?"Volán":mav?"MÁV":train?"Vasút · szolgáltató nem igazolt":
   bus?"Busz · szolgáltató nem igazolt":"Ismeretlen szolgáltató";
 return {kind,line:label,agency:agencyNames.join(" / "),vehicle:clean(line?.vehicle?.type),
  departure:clean(t?.stopDetails?.departureTime),
  arrival:clean(t?.stopDetails?.arrivalTime),
  from:clean(t?.stopDetails?.departureStop?.name),
  to:clean(t?.stopDetails?.arrivalStop?.name),
  headsign:clean(t?.headsign)};
}
function candidate(route,variant){
 if(!route||!Array.isArray(route.legs)||route.legs.length!==1||
   !Array.isArray(route.legs[0].steps)||route.legs[0].steps.length<1||
   route.legs[0].steps.length>35)return null;
 const steps=route.legs[0].steps;
 const rides=steps.map(classify).filter(Boolean);
 if(!rides.length)return null;
 // User preference: 960 Telebusz is excluded, even if Google proposes it.
 if(rides.some(r=>r.line.trim()==="960"))return null;
 const dur=duration(route.duration);
 if(dur===null||dur<1)return null;
 const walks=steps.filter(s=>s?.travelMode==="WALK");
 const measured=walks.every(s=>Number.isFinite(s.distanceMeters)&&s.distanceMeters>=0);
 const walkMeters=measured?walks.reduce((sum,s)=>sum+s.distanceMeters,0):null;
 if(walkMeters!==null&&walkMeters>30000)return null;
 // Google transit gap includes the WALK between two vehicles. Only the
 // remaining time is a usable connection buffer, not the whole stop-to-stop gap.
 // Unknown or negative connection time cannot be sold as a safe interchange.
 const ridesWithIndices=steps.map((step,index)=>({step,index}))
  .filter(x=>x.step?.travelMode==="TRANSIT");
 if(ridesWithIndices.length!==rides.length)return null;
 const times=rides.map(r=>[Date.parse(r.departure),Date.parse(r.arrival)]);
 if(times.some(([start,end])=>!Number.isFinite(start)||!Number.isFinite(end)||
  end<=start))return null;
 const rideSpan=(times[times.length-1][1]-times[0][0])/60000;
 if(rideSpan>dur+2)return null;
 const gaps=[];
 for(let i=1;i<rides.length;i++){
  const previousEnd=times[i-1][1],nextStart=times[i][0];
  if(nextStart<previousEnd)return null;
  const between=steps.slice(ridesWithIndices[i-1].index+1,
   ridesWithIndices[i].index);
  let transferWalk=0;
  for(const step of between){
   if(step?.travelMode!=="WALK")continue;
   const minutes=duration(step.staticDuration);
   if(minutes===null)return null; // Unknown walking time = unsafe interchange.
   transferWalk+=minutes;
  }
  const buffer=(nextStart-previousEnd)/60000-transferWalk;
  if(buffer<-0.5)return null; // Impossible transfer according to supplied steps.
  gaps.push(Math.max(0,Math.round(buffer)));
 }
 const wait=gaps.length?gaps.reduce((a,b)=>a+b,0):0;
 const shortest=gaps.length?Math.min(...gaps):null;
 // The final walking section matters especially for an arrival close to home.
 const lastTransitIndex=ridesWithIndices[ridesWithIndices.length-1].index;
 const finalSteps=steps.slice(lastTransitIndex+1).filter(x=>x?.travelMode==="WALK");
 const finalWalkMeters=finalSteps.length&&finalSteps.every(x=>
  Number.isFinite(x.distanceMeters)&&x.distanceMeters>=0)?
  Math.round(finalSteps.reduce((total,x)=>total+x.distanceMeters,0)):
  finalSteps.length===0?0:null;
 const providers=[...new Set(rides.map(x=>x.kind))];
 const hasVolan=providers.includes("Volán"),hasMav=providers.includes("MÁV");
 const coach=hasVolan&&!rides.some(x=>/rail|train|metro|subway/.test(fold(x.vehicle)));
 const directVolan=coach&&rides.filter(r=>r.kind==="Volán").length===1;
 const sajo=hasMav&&rides.some(r=>/sajo|sajó/.test(fold(r.line+" "+r.headsign)));
 const transfers=Math.max(0,rides.length-1);
 const dep=rides[0].departure,arr=rides[rides.length-1].arrival;
 const key=rides.map(r=>[r.kind,r.line,r.from,r.to,r.departure,r.arrival].join("|")).join("||");
 if(!key)return null;
 return {key,variant,durationMinutes:Math.round(dur),walkMeters,
  finalWalkMeters,transfers,waitMinutes:wait,
  shortestMargin:shortest,boarding:huTime(dep),alighting:huTime(arr),
  rides,providers,directVolan,sajo};
}
function score(c,priority="balanced"){
 let points=c.durationMinutes*0.72+c.transfers*30+
  (c.walkMeters===null?65:c.walkMeters/70)+
  (c.waitMinutes===null?40:c.waitMinutes*0.6);
 // No risky interchange should win merely by being faster. Walking between
 // platforms has already been deducted from this actual buffer.
 if(c.shortestMargin!==null&&c.shortestMargin<10)points+=80;
 if(c.shortestMargin!==null&&c.shortestMargin<6)points+=95;
 if(c.finalWalkMeters!==null&&c.finalWalkMeters>300)
  points+=(c.finalWalkMeters-300)/30;
 if(c.directVolan)points-=32;
 else if(c.sajo)points-=18;
 if(priority==="walk")points+=(c.walkMeters===null?50:c.walkMeters/25);
 if(priority==="transfers")points+=c.transfers*55;
 if(priority==="wait")points+=(c.waitMinutes===null?60:c.waitMinutes*2);
 if(priority==="duration")points+=c.durationMinutes*0.7;
 return points;
}
function evaluate(payload,priority="balanced"){
 if(payload?.schema!=="sho.smart-trip.real-test/1"||
  payload?.source!=="google_routes"||payload?.attribution!=="Google Maps"||
  payload?.presentation!=="map_free_text_only"||
  payload?.ai_processing!=="disabled"||payload?.save!==false||
  !Number.isInteger(payload?.googleRequests)||payload.googleRequests<1||
  payload.googleRequests>3||
  !Array.isArray(payload?.variants)||payload.variants.length>3)return null;
 const errors=[],all=[],seen=new Set(),coverage=new Set(),variants=[];
 for(const group of payload.variants){
  if(!["all","bus","rail"].includes(group?.variant)||!Array.isArray(group.routes))return null;
  variants.push({id:group.variant,status:group.status,count:group.routes.length});
  if(group.status!=="ok")errors.push(group.variant+":"+(group.httpStatus||group.status));
  for(const route of group.routes.slice(0,4)){
   const c=candidate(route,group.variant);
   if(!c||seen.has(c.key))continue;
   seen.add(c.key);
   all.push(c);c.providers.forEach(x=>coverage.add(x));
  }
 }
 all.sort((a,b)=>score(a,priority)-score(b,priority));
 const reports=["BKK","MÁV","Volán"].map(name=>({
  provider:name,seen:coverage.has(name),
  note:coverage.has(name)?"Szerepel Google-alternatívában":
    "Nem szerepel a visszakapott alternatívákban, ez nem bizonyítja, hogy nincs járat"
 }));
 return {source:"Google Maps",candidates:all,best:all[0]||null,
  providerReports:reports,variantReports:variants,errors,
  googleRequests:payload.googleRequests,quotaReserved:payload.quotaReserved,
  fullCoverage:reports.every(r=>r.seen),
  independentVerified:false};
}
function lenaSummary(result,priority="balanced"){
 const c=result?.best;
 if(!c)return "Nem kaptunk olyan valódi Google-útvonalat, amely az ellenőrzéseken átment. Nem állítok elő kitalált A tervet.";
 const parts=c.rides.map(r=>r.line+" ("+r.kind+")").join(" → ");
 let s="Mónika, a Google által visszaadott lehetőségek közül ez az előzetes A-jelöltem: "+
  parts+". A teljes Google-útvonal becsült ideje "+c.durationMinutes+
  " perc, "+c.transfers+" átszállással.";
 if(c.walkMeters!==null)s+=" Teljes gyaloglás: "+Math.round(c.walkMeters)+" méter.";
 else s+=" A gyaloglási távolság nem minden szakaszon igazolt.";
 if(c.finalWalkMeters!==null&&c.finalWalkMeters>300)
  s+=" Figyelem: a célállomásnál még "+c.finalWalkMeters+
   " méter séta szerepel, ami eltérhet a kívánt rövid kazincbarcikai sétától.";
 if(c.shortestMargin!==null)s+=" Legszűkebb, gyaloglás levonása utáni csatlakozási tartalék: "+c.shortestMargin+" perc.";
 if(c.shortestMargin!==null&&c.shortestMargin<10)s+=" Ez szoros csatlakozás, indulás előtt külön ellenőrizd!";
 if(c.directVolan)s+=" A közvetlen helyközi Volán-jelölt előnyt kapott.";
 else if(c.sajo)s+=" A Sajó Expresszre utaló vasúti járat előnyt kapott.";
 s+=" A fő szempont: "+({walk:"kevés gyaloglás",wait:"kevés várakozás",
  transfers:"kevés átszállás",duration:"rövidebb idő"}[priority]||"kiegyensúlyozott utazás")+".";
 s+=" Ez előzetes, Google-találatokon alapuló rangsorolás, nem GPT-válasz."+
 " A közlekedési szolgáltatók saját menetrendje még nincs függetlenül visszaigazolva, ezért ez nem végleges A terv.";
 return s;
}
export {evaluate,score,candidate,classify,lenaSummary};
