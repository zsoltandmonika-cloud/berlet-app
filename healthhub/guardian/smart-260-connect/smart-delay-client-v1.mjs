/* SHO Smart Match Smart Delay v937 · FYI only.
 * Zero fetch/API calls. Reads only fresh, sanitized, publicly shareable BKK
 * stop predictions cached by Family Guard's existing authenticated BKK Live poll.
 * No trip recalculation, no GPS, no auth tokens, no background live poller.
 */
import "../bkk-smart-delay-v1.js";
const $=id=>document.getElementById(id);
const KEY="hh-bkk-smart-match-fyi-v937";
const delay=()=>window.HH_BKK_SMART_DELAY_V1;
const ROUTES=new Set(["bus:260","tram:17","tram:19","tram:41"]);
const localDay=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
 timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
}).formatToParts(new Date()).map(x=>[x.type,x.value]));return [p.year,p.month,p.day].join("-")};
const time=ms=>new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(ms));
function snapshot(now=Date.now()){
 try{
  const doc=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!doc||doc.schemaVersion!==1||doc.source!=="BKK Zrt., CC BY 4.0"||
     !Array.isArray(doc.rows)||doc.rows.length>1800)return null;
  const generated=Date.parse(doc.generatedAt||"");
  if(!Number.isFinite(generated)||generated>now+10000||now-generated>90000)return null;
  // Never accept expired, mismatched or unbounded local cache entries.
  const rows=doc.rows.filter(p=>p&&ROUTES.has(p.routeKey)&&
   typeof p.stopId==="string"&&/^(?:BKK_)?[A-Za-z0-9_-]{2,30}$/.test(p.stopId)&&
   Number.isSafeInteger(p.scheduledMs)&&Number.isSafeInteger(p.predictedMs)&&
   Number.isInteger(p.delaySeconds)&&p.delaySeconds>=-1800&&p.delaySeconds<=7200&&
   Math.abs(p.predictedMs-p.scheduledMs-p.delaySeconds*1000)<=30000&&
   p.predictedMs>=now-180000&&p.predictedMs<=now+7200000&&
   p.asOf===doc.generatedAt&&
   (p.delayPrecision===undefined||p.delayPrecision==="minute"));
  return rows.length?rows:null;
 }catch(_){return null}
}
function neutral(){
 const hero=$("hhSmartDelayHeroV1");
 if(hero){hero.hidden=true;hero.dataset.delay="unknown";hero.textContent="";}
 for(const el of document.querySelectorAll(".hh-smart-delay-row-v1"))el.remove();
}
function chip(pred,label,planned){
 const status=delay()?.classify(pred.delaySeconds,pred.asOf,Date.now());
 if(!status||status.status==="unknown")return null;
 const estimated=pred.delayPrecision==="minute";
 const visualStatus=estimated&&status.status==="ontime"?"estimated":status.status;
 const visualText=(estimated?"≈":"")+status.text;
 const node=document.createElement("span");node.className="hh-smart-delay-chip-v1";
 node.dataset.delay=visualStatus;node.textContent=label+" "+visualText;
 node.title=label+" · "+status.description+(estimated?" · körülbelüli, menetrendi összevetés":"")+
  " · menetrend "+time(planned)+" · BKK várható "+time(pred.predictedMs);
 node.setAttribute("aria-label",node.title);
 return {node,status,estimated};
}
function getMatch(predictions,routeKey,stopId,scheduledMs){
 if(!ROUTES.has(routeKey)||!stopId||!Number.isFinite(scheduledMs))return null;
 return delay()?.matchStopPrediction(predictions,routeKey,stopId,scheduledMs,Date.now())||null;
}
function render(){
 const timeline=$("timeline"),rows=[...timeline?.querySelectorAll(".timeline-row")||[]];
 if(!rows.length||!delay()||$("day")?.value!==localDay()){neutral();return}
 const predictions=snapshot();
 if(!predictions){neutral();return}
 for(const node of document.querySelectorAll(".hh-smart-delay-row-v1"))node.remove();
 let lead=null;
 for(const row of rows){
  const host=document.createElement("div");host.className="hh-smart-delay-row-v1";
  const busMs=Number(row.dataset.busDeparture),busStop=row.dataset.bkkStopId;
  const bus=busStop&&Number.isFinite(busMs)?getMatch(predictions,"bus:260",busStop,busMs):null;
  if(bus){
   const out=chip(bus,"🚌 260",busMs);
   if(out){host.append(out.node);if(row.classList.contains("next"))lead={...out,pred:bus,label:"260"};}
  }
  const tramMs=Number(row.dataset.bkkTramDeparture),tramLine=row.dataset.bkkTramLine,
   tramStop=row.dataset.bkkTramStopId;
  const tram=tramLine&&tramStop&&Number.isFinite(tramMs)?
   getMatch(predictions,"tram:"+tramLine,tramStop,tramMs):null;
  if(tram){
   const out=chip(tram,"🚋 "+tramLine,tramMs);
   if(out){host.append(out.node);if(row.classList.contains("next")&&!lead)lead={...out,pred:tram,label:tramLine};}
  }
  // Generic Smart Match timeline (walk/transfer templates), not only full 260.
  const mainMs=Number(row.dataset.bkkDeparture),mainKey=row.dataset.bkkRouteKey;
  const main=mainKey&&row.dataset.bkkStopId&&Number.isFinite(mainMs)?
   getMatch(predictions,mainKey,row.dataset.bkkStopId,mainMs):null;
  if(main){
   const out=chip(main,(mainKey.startsWith("tram:")?"🚋 ":"🚌 ")+mainKey.split(":")[1],mainMs);
   if(out){host.append(out.node);if(row.classList.contains("next"))lead={...out,pred:main,label:mainKey.split(":")[1]};}
  }
  if(host.children.length)row.append(host);
 }
 const hero=$("hhSmartDelayHeroV1");
 if(!hero)return;
 if(!lead){
  hero.hidden=true;hero.dataset.delay="unknown";hero.replaceChildren();return;
 }
 // The hero shows the exact same validated pill as the selected timeline row.
 // Clone instead of moving: both cards retain their own badge and rich tooltip.
 hero.replaceChildren(lead.node.cloneNode(true));
 hero.dataset.delay=lead.node.dataset.delay;
 hero.hidden=false;
}
function boot(){
 const host=$("timeline");if(!host)return;
 neutral();
 new MutationObserver(records=>{
  if(records.some(m=>m.target===host&&[...m.addedNodes,...m.removedNodes].some(n=>
   n.nodeType===1&&n.classList?.contains("timeline-row"))))render();
 }).observe(host,{childList:true});
 render();
 // UI-only expiry check. NO network call, even on visibility or refresh.
 setInterval(()=>{if(!document.hidden)render()},20000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
 window.addEventListener("storage",e=>{if(e.key===KEY)render()});
 $("day")?.addEventListener("change",neutral);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
