/* SHO Smart Trip V5 · Google-first read-only scoring pilot.
 * Pure analysis of a Google Routes-shaped response. Never calls Google/LLM
 * and never writes Maps-derived data into My Trips or persistent storage.
 * Source payload must come from approved server-side gateway in later phase.
 */
const clean=s=>typeof s==="string"?s.replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,140):"";
const epoch=s=>typeof s==="string"?Date.parse(s):NaN;
const finite=n=>Number.isFinite(n);
function stat(j){
 const segments=j?.segments||[];
 const rides=segments.filter(x=>x.kind==="ride");
 const walking=segments.filter(x=>x.kind==="walk");
 const min=(epoch(j.arrival)-epoch(j.departure))/60000;
 const walkMeters=walking.reduce((s,x)=>s+(Number(x.distanceMeters)||0),0);
 const walkMinutes=walking.reduce((s,x)=>s+(epoch(x.arrival)-epoch(x.departure))/60000,0);
 const busSingle=rides.length===1&&/vol[aá]n|volanbusz|m[aá]v szem[eé]lysz[aá]ll[ií]t[aá]s/i.test(rides[0].agency||"")&&
  /bus/i.test(rides[0].vehicleType||"");
 const sajo=rides.some(x=>/saj[oó]\s*(expressz|express|exp)/i.test(x.service||""));
 const train=rides.some(x=>/rail|train|vas[uú]t/i.test(x.vehicleType||""));
 const transferMargins=[];
 for(let i=1;i<rides.length;i++){
  const prev=rides[i-1],next=rides[i];
  const between=segments.slice(segments.indexOf(prev)+1,segments.indexOf(next));
  const walk=between.filter(x=>x.kind==="walk").reduce((s,x)=>s+(epoch(x.arrival)-epoch(x.departure))/60000,0);
  const margin=(epoch(next.departure)-epoch(prev.arrival))/60000-walk;
  transferMargins.push(margin);
 }
 const shortestMargin=transferMargins.length?Math.min(...transferMargins):null;
 return {durationMin:Math.round(min),walkMeters:Math.round(walkMeters),
  walkMin:Math.round(walkMinutes),transfers:Math.max(0,rides.length-1),
  shortestMargin:shortestMargin===null?null:Math.round(shortestMargin),
  directVolan:busSingle,sajoExpress:sajo,hasTrain:train,doorToDoor:!!j.doorToDoor};
}
function evaluateRoutes(payload,query,adapter,{max=4}={}){
 if(!adapter||typeof adapter.normalizeRoutes!=="function")throw Error("missing_existing_google_adapter");
 const routes=adapter.normalizeRoutes(payload,query).slice(0,Math.min(4,Math.max(1,max)));
 const candidates=[];
 for(let i=0;i<routes.length;i++){
  const route=routes[i],metrics=stat(route);
  if(!finite(metrics.durationMin)||metrics.durationMin<1||metrics.durationMin>1440||
    !finite(metrics.walkMin)||metrics.walkMin<0||!finite(metrics.walkMeters)||
    !Array.isArray(route.segments)||!route.segments.length)continue;
  const buffer=metrics.shortestMargin;
  // For train/intercity allow >=8 min, local-only >=5 min. Do not label
  // a Google route guaranteed: train delays and connection protection unknown.
  const threshold=metrics.hasTrain?8:5;
  const risky=buffer!==null&&buffer<threshold;
  const priority=metrics.directVolan?0:metrics.sajoExpress?1:
   metrics.hasTrain?2:3;
  const penalty=(risky?100000:0)+(metrics.doorToDoor?0:2500);
  // Apply explicit user choice without discarding the user-specific provider order.
  const walkWeight=query?.priority==="walk"?8:2.5;
  const transferWeight=query?.priority==="transfers"?115:35;
  const score=penalty+priority*300+metrics.durationMin+
   metrics.walkMin*walkWeight+metrics.transfers*transferWeight+
   (buffer!==null&&buffer<12?40:0);
  candidates.push(Object.freeze({ordinal:i+1,route,metrics,
   score:Math.round(score*10)/10,
   risk:risky?"tight_connection":"normal",priority,
   source:"google-routes",attribution:"© Google Maps"}));
 }
 return candidates.sort((a,b)=>a.score-b.score||
  epoch(a.route.arrival)-epoch(b.route.arrival)||a.ordinal-b.ordinal);
}
function explainChoice(candidate,{profile="m",demo=false}={}){
 if(!candidate)return "Nincs ellenőrzött, megfelelő útvonal. Nem találok ki járatot.";
 const m=candidate.metrics;
 const name=profile==="m"?"Mónika":"Zsolt";
 const mode=m.directVolan?"egy közvetlen Volán-járat":
  m.sajoExpress?"egy Sajó Expressz-kapcsolat":
  m.hasTrain?"egy vasúti kapcsolat":"egy tömegközlekedési kapcsolat";
 const walk=Number.isFinite(m.walkMeters)?m.walkMeters+" méter":"ismeretlen hosszúságú";
 const caution=m.shortestMargin!==null&&m.shortestMargin<12?
  " Az átszállási tartalékot még külön ellenőrizném.":"";
 return (demo?"Szemléltető minta, nem valós menetrendi ajánlás. ":"")+
  name+", a jelenlegi beállítások alapján "+mode+" került az első helyre. "+
  "Becsült gyaloglás: "+walk+", átszállás: "+m.transfers+"."+caution;
}
function buildMapsUrl(query){
 if(!query||!clean(query.to)||clean(query.from)===clean(query.to))return null;
 const u=new URL("https://www.google.com/maps/dir/");
 u.searchParams.set("api","1");u.searchParams.set("travelmode","transit");
 if(clean(query.from))u.searchParams.set("origin",clean(query.from));
 u.searchParams.set("destination",clean(query.to));
 return u.toString();
}
export {stat,evaluateRoutes,explainChoice,buildMapsUrl};
