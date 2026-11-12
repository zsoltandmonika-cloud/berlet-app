/* SHO Smart Match Smart Delay v1.
 * Optional, authenticated, read-only BKK GTFS-RT add-on.
 * Never modifies scheduled 260/17/19/41 matching or any GPS/health data.
 */
import "../bkk-smart-delay-v1.js";
const $=id=>document.getElementById(id);
const delay=()=>window.HH_BKK_SMART_DELAY_V1;
const localDay=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
 timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
}).formatToParts(new Date()).map(x=>[x.type,x.value]));return [p.year,p.month,p.day].join("-")};
const time=ms=>new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(ms));
let busy=false,dirty=false,lastRequest=0;
const schedule=()=>$("timeline");
function neutral(){
 const hero=$("hhSmartDelayHeroV1");
 if(hero){hero.dataset.delay="unknown";hero.textContent="⚪ Élő eltérés: nincs ellenőrzött adat";}
 for(const el of document.querySelectorAll(".hh-smart-delay-row-v1"))el.remove();
}
function familyLiveToken(){
 // Same-origin, existing Family Live login. No new SDK/OAuth flow, no token logs.
 // Never send an expired token; show neutral until Guardian refreshes the session.
 try{
  const cfg=window.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey)return null;
  const session=JSON.parse(localStorage.getItem("hh-guardian-family-auth-v785")||"null");
  const expires=Number(session?.expires_at);
  return typeof session?.access_token==="string"&&session.access_token.length>80&&
   Number.isFinite(expires)&&expires*1000>Date.now()+60000?session.access_token:null;
 }catch(_){return null;}
}
function chip(pred,label,at,planned){
 const status=delay().classify(pred.delaySeconds,pred.asOf,Date.now());
 if(status.status==="unknown")return null;
 const chip=document.createElement("span");chip.className="hh-smart-delay-chip-v1";
 chip.dataset.delay=status.status;chip.textContent=label+" "+status.text;
 chip.setAttribute("aria-label",label+" · "+status.description+
  " · menetrend "+time(planned)+" · BKK várható "+time(pred.predictedMs));
 chip.title=chip.getAttribute("aria-label");
 return {chip,status};
}
function apply(rows,predictions,stamp){
 if(rows.some(r=>!r.isConnected))return;
 for(const el of document.querySelectorAll(".hh-smart-delay-row-v1"))el.remove();
 let heroStatus=null;
 for(const el of rows){
  const bus=Number(el.dataset.busDeparture),stop=el.dataset.bkkStopId;
  const match=delay().matchStopPrediction(predictions,"bus:260",stop,bus,Date.now());
  const host=document.createElement("div");host.className="hh-smart-delay-row-v1";
  if(match){
   const out=chip(match,"🚌 260",match.predictedMs,bus);
   if(out){host.append(out.chip);if(el.classList.contains("next"))heroStatus={
    ...out.status,predictedMs:match.predictedMs};
   }
  }
  const tramLine=el.dataset.bkkTramLine,tramStop=el.dataset.bkkTramStopId,
   tramMs=Number(el.dataset.bkkTramDeparture);
  if(tramLine&&tramStop&&Number.isFinite(tramMs)){
   const tram=delay().matchStopPrediction(predictions,"tram:"+tramLine,tramStop,tramMs,Date.now());
   if(tram){const out=chip(tram,"🚋 "+tramLine,tram.predictedMs,tramMs);if(out)host.append(out.chip);}
  }
  if(host.children.length)el.append(host);
 }
 const hero=$("hhSmartDelayHeroV1");
 if(hero&&heroStatus){
  hero.dataset.delay=heroStatus.status;
  hero.textContent="BKK élő 260 · "+heroStatus.description+" · várható "+
   time(heroStatus.predictedMs)+
   (heroStatus.status==="early"?" · korábbi érkezés kockázata":
    heroStatus.status==="late"?" · csatlakozás ellenőrzendő":"");
 }else if(hero){hero.dataset.delay="unknown";hero.textContent="⚪ Élő eltérés: nincs ellenőrzött adat";}
}
async function refresh(force=false){
 const host=schedule(),rows=[...host?.querySelectorAll(".v34-260-row[data-bkk-stop-id]")||[]];
 if(!rows.length||document.hidden||!delay()){neutral();return;}
 if($("day")?.value!==localDay()){neutral();return;}
 if(busy){if(force)dirty=true;return;}
 if(!force&&Date.now()-lastRequest<25000)return;
 busy=true;lastRequest=Date.now();
 try{
  const token=familyLiveToken();
  if(!token){neutral();return;}
  const stops=new Set();
  for(const el of rows){
   if(el.dataset.bkkStopId)stops.add(el.dataset.bkkStopId);
   if(el.dataset.bkkTramStopId)stops.add(el.dataset.bkkTramStopId);
  }
  if(!stops.size){neutral();return;}
  const cfg=window.HH_CENTRAL_VAULT;
  const params=new URLSearchParams({routes:"bus:260,tram:17,tram:19,tram:41",
   predictions:"1",stops:[...stops].slice(0,30).join(",")});
  const res=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+
   "/functions/v1/hh-bkk-live-v793-preview?"+params.toString(),{
    cache:"no-store",headers:{Authorization:"Bearer "+token,
     apikey:cfg.publishableKey,Accept:"application/json"}});
  if(!res.ok)throw Error("bkk-live-unavailable");
  const payload=await res.json();
  if(payload?.source!=="BKK Zrt., CC BY 4.0"||
   payload?.feedType!=="GTFS-RT VehiclePositions"||
   !Array.isArray(payload.stopPredictions))throw Error("invalid-feed");
  if($("day")?.value!==localDay()){neutral();return;}
  apply(rows,payload.stopPredictions,payload.delayGeneratedAt);
 }catch(_){neutral();}
 finally{busy=false;if(dirty){dirty=false;void refresh(true);}}
}
function boot(){
 const host=schedule();if(!host)return;
 new MutationObserver(records=>{
  if(records.some(m=>m.target===host&&[...m.addedNodes,...m.removedNodes].some(n=>
   n.nodeType===1&&n.classList?.contains("v34-260-row"))))void refresh(true);
 }).observe(host,{childList:true});
 void refresh(true);
 setInterval(()=>{if(!document.hidden)void refresh()},30000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh(true)});
 $("day")?.addEventListener("change",()=>{neutral();void refresh(true)});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
