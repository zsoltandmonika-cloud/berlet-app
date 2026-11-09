/*
 * SHO V5 / Léna A-terv evaluator v1.
 * ONLY for the already verified BKK Zrt. CC BY 4.0 timetable returned by
 * SH9_BKK_SEARCH_V1107. Never accepts Google Routes response or sends
 * any route data to OpenAI, third-party services or storage.
 * Deterministic, inspectable A-plan ranking, not an LLM.
 */
const SOURCE="BKK Zrt., CC BY 4.0";
const PRIORITIES=new Set(["balanced","walk","wait","transfers","duration"]);
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("hu-HU").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const ms=x=>typeof x==="string"?Date.parse(x):NaN;
const day=ms=>new Intl.DateTimeFormat("en-GB",{
 timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
}).formatToParts(new Date(ms)).reduce((a,p)=>{
 if(["year","month","day"].includes(p.type))a[p.type]=p.value;
 return a;
},{});
const localDay=t=>{const x=day(t);return x.year+"-"+x.month+"-"+x.day;};
const clean=s=>typeof s==="string"&&s.trim().length>0&&s.length<=120&&
 !/[\u0000-\u001f<>]/.test(s);
function eligible(item,request){
 if(!item||item.source!==SOURCE||item.coverage!=="stop-to-stop"||
  fold(item.from)!==fold(request.from)||fold(item.to)!==fold(request.to)||
  !Array.isArray(item.legs)||item.legs.length<1||item.legs.length>2||
  item.transfers!==item.legs.length-1)return null;
 const begin=ms(item.departure),end=ms(item.arrival);
 if(!Number.isFinite(begin)||!Number.isFinite(end)||end<=begin||
  end-begin>5*3600_000||localDay(begin)!==request.date)return null;
 const pivot=ms(request.when);
 if(!Number.isFinite(pivot))return null;
 if(request.mode==="arrive"&&end>pivot+60_000)return null;
 if(request.mode!=="arrive"&&begin<pivot-60_000)return null;
 let previous=null;
 for(const leg of item.legs){
  if(!leg||leg.source!==SOURCE||leg.coverage!=="stop-to-stop"||
   leg.status!=="timetable"||!clean(leg.line)||!clean(leg.from)||!clean(leg.to)||
   !["bus","tram","metro","train"].includes(leg.mode))return null;
  const a=ms(leg.departure),b=ms(leg.arrival);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||
   b-a>5*3600_000)return null;
  if(previous!==null&&a-previous<5*60_000)return null;
  previous=b;
 }
 const first=item.legs[0],last=item.legs.at(-1);
 if(ms(first.departure)!==begin||ms(last.arrival)!==end)return null;
 let gap=0,walkingUnverified=false,unsafe=false;
 if(item.legs.length===2){
  gap=Math.round((ms(item.legs[1].departure)-ms(item.legs[0].arrival))/60000);
  if(!item.transfer||item.transfer.footpathVerified!==false||
   !Number.isFinite(item.transfer.airMeters)||
   item.transfer.airMeters<0||item.transfer.airMeters>250||
   !Number.isInteger(item.transfer.waitMinutes)||
   Math.abs(item.transfer.waitMinutes-gap)>1)return null;
  walkingUnverified=true;
  // Five minutes is the official algorithmic minimum but not a guaranteed
  // passenger transfer; use ten as a conservative warning threshold.
  unsafe=gap<10;
 }
 return {item,from:item.from,to:item.to,departure:item.departure,arrival:item.arrival,
  minutes:Math.round((end-begin)/60000),transfers:item.transfers,
  transferMinutes:gap,walkingUnverified,connectionRisk:unsafe,
  provider:"bkk",source:SOURCE,coverage:"stop-to-stop",live:false};
}
function score(x,priority){
 const t=x.transfers,minutes=x.minutes,gap=x.transferMinutes;
 const risk=x.connectionRisk?100:0;
 const unknown=x.walkingUnverified?42:0;
 if(priority==="transfers")return t*210+minutes*.5+unknown+risk;
 if(priority==="wait")return gap*6+minutes*.5+t*25+unknown+risk;
 if(priority==="duration")return minutes+t*18+unknown+risk;
 if(priority==="walk")return t*115+minutes*.5+unknown+risk;
 return minutes+t*75+unknown+risk;
}
export function evaluateIndependentBkk(data,request){
 if(!request||typeof request!=="object"||!["depart","arrive","now"].includes(request.mode)||
  !PRIORITIES.has(request.priority)||!["m","z"].includes(request.profile)||
  !/^\d{4}-\d\d-\d\d$/.test(request.date||"")||!clean(request.from)||
  !clean(request.to)||fold(request.from)===fold(request.to)||
  !Number.isFinite(ms(request.when)))return {status:"invalid_request"};
 if(!data||data.status!=="ok"||data.source!==SOURCE||
  data.coverage!=="stop-to-stop"||data.live!==false||
  !Array.isArray(data.results)||!data.results.length||
  data.results.length>10)return {status:"unverified_source"};
 const rows=data.results.map(x=>eligible(x,request)).filter(Boolean);
 if(!rows.length)return {status:"no_independent_route"};
 const ranked=rows.map(x=>({...x,score:score(x,request.priority)}))
  .sort((a,b)=>a.score-b.score||a.transfers-b.transfers||
   ms(a.arrival)-ms(b.arrival));
 const best=ranked[0];
 const warnings=[
  "BKK Zrt. CC BY 4.0, ellenőrzött statikus menetrend. Nem élő.",
  "Megállótól megállóig; az ajtótól ajtóig gyaloglás nincs ellenőrizve."
 ];
 if(best.walkingUnverified)warnings.push(
  "Az átszállás gyalogos útja és peronváltása nincs ellenőrizve.");
 if(best.connectionRisk)warnings.push(
  "Szoros, 10 percnél rövidebb csatlakozás: csak feltételes ajánlás.");
 return {status:"ok",schema:"sho.lena.independent-a-plan/1",source:SOURCE,
  modelUsed:false,googleContentUsed:false,alternativesEvaluated:ranked.length,
  aPlan:best,provisional:best.walkingUnverified||best.connectionRisk,
  warnings};
}