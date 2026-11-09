/*
 * SHO Léna V5 · independent, licensed/private MÁV GTFS A-plan.
 * Input exclusively from SH9_MAV_GTFS_CORE_V1.route over an on-device,
 * previously validated local GTFS dataset. Never receives Google content.
 * No network, model call, personal data transfer or cloud write.
 */
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const time=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
const day=t=>{
 const x=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date(t)).map(p=>[p.type,p.value]));
 return x.year+"-"+x.month+"-"+x.day;
};
function candidate(j,query){
 if(!j||j.live!==false||!Array.isArray(j.legs)||j.legs.length<1||
  j.legs.length>2||j.transfers!==j.legs.length-1)return null;
 const begin=time(j.departure),end=time(j.arrival),pivot=time(query.when);
 if(!Number.isFinite(begin)||!Number.isFinite(end)||end<=begin||
  end-begin>12*3600_000||day(begin)!==query.date)return null;
 if(query.mode==="arrive"&&end>pivot+60_000)return null;
 if(query.mode!=="arrive"&&begin<pivot-60_000)return null;
 if(!Number.isFinite(pivot))return null;
 let last=0,gap=0,transfers=0;
 for(let i=0;i<j.legs.length;i++){
  const l=j.legs[i],a=time(l?.departure),b=time(l?.arrival);
  if(!l||typeof l.tripId!=="string"||!l.tripId||l.tripId.length>130||
   typeof l.service!=="string"||!l.service||l.service.length>130||
   typeof l.from!=="string"||!l.from||typeof l.to!=="string"||!l.to||
   !Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>12*3600_000)return null;
  if(i&&a-last<5*60_000)return null;
  if(i&&fold(j.legs[i-1].to)!==fold(l.from))return null;
  if(i){gap+=Math.round((a-last)/60000);transfers++;}
  last=b;
 }
 if(time(j.legs[0].departure)!==begin||last!==end||
  typeof j.durationMinutes!=="number"||
  Math.abs(j.durationMinutes-Math.round((end-begin)/60000))>1)return null;
 return {item:j,from:j.legs[0].from,to:j.legs.at(-1).to,
  departure:j.departure,arrival:j.arrival,minutes:Math.round((end-begin)/60000),
  transfers,transferMinutes:gap,
  walkingUnverified:transfers>0,
  connectionRisk:transfers>0&&gap<10,
  provider:"mav",coverage:"station-to-station",live:false};
}
export function evaluateIndependentMav(result,feed,query,{now=Date.now()}={}){
 if(!query||!["now","depart","arrive"].includes(query.mode)||
  !["balanced","wait","walk","transfers","duration"].includes(query.priority)||
  !["m","z"].includes(query.profile)||!Number.isFinite(time(query.when))||
  !/^\d{4}-\d\d-\d\d$/.test(query.date||""))return {status:"invalid_request"};
 const timestamp=Date.parse(feed?.generatedAt||"");
 if(!feed||feed.schema!=="sh9-mav-gtfs-v1"||
  feed.rightsConfirmed!==false||feed.localOnly!==true||
  !/m[aá]v|vas[uú]t|rail/i.test(feed.source||"")||
  !Number.isFinite(timestamp)||timestamp>now+60_000||
  now-timestamp>90*86400_000)return {status:"unverified_feed"};
 if(!result||result.status!=="ok"||result.source!==feed.source||
  result.generatedAt!==feed.generatedAt||!Array.isArray(result.journeys)||
  !result.journeys.length||result.journeys.length>60)
  return {status:"unverified_result"};
 const choices=result.journeys.map(j=>candidate(j,query)).filter(Boolean);
 if(!choices.length)return {status:"no_independent_route"};
 const score=c=>{
  const type=c.item.legs.some(l=>/saj[oó]/i.test(l.service))?"sajo":null;
  const penalty=c.connectionRisk?100:0;
  const transfer=c.transfers*(query.priority==="transfers"?220:
   query.priority==="walk"?135:query.priority==="wait"?85:75);
  const weight=query.priority==="duration"?1:
   query.priority==="wait"?.5:1;
  return c.minutes*weight+transfer+penalty+
   (c.transfers?42:0)+(type==="sajo"?-12:0);
 };
 choices.sort((a,b)=>score(a)-score(b)||a.transfers-b.transfers||
  time(a.arrival)-time(b.arrival));
 const chosen=choices[0];
 const notes=[
  "Privát, önálló MÁV GTFS; állomástól állomásig ellenőrzött, nem élő menetrend.",
  "Nem teljes ajtótól ajtóig út. Helyi BKK/Volán átszállás és séta nincs igazolva."
 ];
 if(chosen.transfers)notes.push("A vasúti peronváltás és gyalogos csatlakozás nincs ellenőrizve.");
 if(chosen.connectionRisk)notes.push("10 percnél rövidebb átszállási idő: feltételes útvonal.");
 return {status:"ok",schema:"sho.lena.independent-a-plan/1",source:feed.source,
  modelUsed:false,googleContentUsed:false,alternativesEvaluated:choices.length,
  aPlan:chosen,provisional:chosen.transfers>0,warnings:notes};
}