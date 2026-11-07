/* SHO Matrix V4 · user-initiated, read-only real-feed pilot.
 * Two independent GTFS Workers and one official BKK search run concurrently.
 * Cannot write Supabase, My Trips, personal GTFS or legacy production UI.
 */
import {createMatrixSearch,quickLenaTouch} from "./matrix-search-engine-v4.mjs";
import {createWorkerProvider} from "./matrix-worker-provider-v4.mjs";
import {createBkkAdapter} from "./matrix-existing-sources-v4.mjs";
import * as bkk from "../../smart-travel/public-transport/smart-trip/smart-trip-bkk-v1107.mjs";

const $=id=>document.getElementById(id);
const core=globalThis.SH9_MAV_GTFS_CORE_V1;
const pack=globalThis.SH9_SMART_TRIP_PACK_V1078;
const providers=["bkk","mav","volan"];
let working=false,controller=null;
const labels={bkk:"BKK",mav:"MÁV",volan:"Volán"};
function text(tag,value,parent,css=""){
 const el=document.createElement(tag);
 if(css)el.className=css;
 el.textContent=value;
 parent.appendChild(el);
 return el;
}
function setStatus(value){$("status").textContent=value}
function fields(){
 const sourcePairs={};
 const nodes=[];
 for(const provider of providers){
  const from=$(`${provider}-from`).value.trim().slice(0,160);
  const to=$(`${provider}-to`).value.trim().slice(0,160);
  if(from.length<2||to.length<2||from===to)throw Error(
   labels[provider]+": két különböző, pontos GTFS-megállónevet adj meg.");
  const fromNode=provider+"_from",toNode=provider+"_to";
  nodes.push({id:fromNode,name:from,feedStops:{[provider]:from}});
  nodes.push({id:toNode,name:to,feedStops:{[provider]:to}});
  sourcePairs[provider]=[{fromNode,toNode,fromStop:from,toStop:to}];
 }
 const primary=$("primary").value;
 const q={
  from:$(`${primary}-from`).value.trim(),to:$(`${primary}-to`).value.trim(),
  date:$("day").value,time:$("time").value,mode:"depart",
  profile:$("profile").value,priority:"balanced"
 };
 return {request:q,graph:{nodes,originNode:primary+"_from",
  destinationNode:primary+"_to",searchPairs:sourcePairs}};
}
function clockIso(request){
 if(!core?.wallEpoch)return null;
 const [hour,min]=request.time.split(":").map(Number);
 const epoch=core.wallEpoch(request.date,hour*60+min);
 return Number.isFinite(epoch)?new Date(epoch).toISOString():null;
}
function render(result,primary){
 const metrics=$("metrics"),travel=$("travel");
 metrics.replaceChildren();travel.replaceChildren();
 const telemetry=result.telemetry||{};
 const metricRow=(label,value)=>{
  const row=text("div","",metrics,"stat");
  text("span",label,row);
  text("span",value,row);
 };
 metricRow("Matrix állapot",result.status||"ismeretlen");
 metricRow("Párhuzamos szolgáltatók",providers.map(p=>
  labels[p]+": "+(telemetry.providerStatus?.[p]||"nincs adat")).join(" · "));
 metricRow("Teljes tesztidő",Number.isFinite(telemetry.totalMs)?
  (telemetry.totalMs/1000).toFixed(2)+" mp":"nincs mérés");
 for(const p of providers){
  const ms=telemetry.providerMs?.[p];
  metricRow(labels[p]+" keresőszál",Number.isFinite(ms)?ms+" ms":"—");
 }
 metricRow("JOIN + ellenőrzés",Number.isFinite(telemetry.joinMs)?
  telemetry.joinMs+" ms":"—");
 metricRow("Megvizsgált szakaszkapcsolatok",String(telemetry.pathsEvaluated||0));
 metricRow("Ellenőrzött teljes utak",String(telemetry.completeRoutes||0));
 if(result.status!=="ready"||!result.tripPack){
  text("p","Nincs igazolt teljes útvonal a kiválasztott "+labels[primary]+
   " megállópárhoz. Ellenőrizd a készülék helyi GTFS-állományait, "+
   "a pontos állomásneveket és a menetrendi napot. "+
   "A hiányzó kapcsolatot nem egészítjük ki kitalált járattal.",travel);
  $("story").textContent="";
  return;
 }
 const p=result.tripPack;
 try{
  if(pack?.normalize)pack.normalize(p);
 }catch(_){
  text("p","A visszaadott TripPack nem ment át a meglévő v1078 ellenőrzésen.",travel);
  $("story").textContent="";return;
 }
 text("h3",p.title+" · "+p.travelDate,travel);
 text("p","Indulás "+p.departure+" · érkezés "+p.arrival+
  " · "+(result.selection?.transfers||0)+" átszállás",travel);
 for(const leg of p.segments){
  const card=text("article","",travel,"leg");
  text("strong",(leg.mode==="train"?"🚆 ":leg.mode==="bus"?"🚌 ":
   leg.mode==="tram"?"🚋 ":"🚶 ")+leg.line,card);
  text("span",leg.departure+" "+leg.from+" → "+leg.arrival+" "+leg.to,card);
  text("small",leg.note||"",card);
 }
 $("story").textContent="✦ Léna Touch (egyelőre szabályalapú): "+
  quickLenaTouch(p,{name:$("profile").value==="m"?"Mónika":"Zsolt"});
}
async function run(){
 if(working)return;
 let inputs;
 try{inputs=fields()}catch(e){setStatus(e.message);return}
 if(!core?.wallEpoch){setStatus("A meglévő helyi menetrendmotor nem töltődött be.");return}
 working=true;controller=new AbortController();
 const active=controller;const start=performance.now();
 $("run").disabled=true;$("cancel").disabled=false;
 $("results").classList.add("hidden");
 for(const p of providers)$("tag-"+p).textContent="keres…";
 const ticker=setInterval(()=>{
  $("elapsed").textContent=((performance.now()-start)/1000).toFixed(1).replace(".",",")+" mp";
 },100);
 setStatus("BKK + MÁV + Volán: párhuzamos keresés indul. A nyers GTFS az eszközön marad.");
 try{
  const r=await fetch("./matrix-rules-v4.json",{cache:"no-store",credentials:"same-origin",
   signal:active.signal});
  if(!r.ok)throw Error("A Matrix szabályfájl nem érhető el.");
  const rules=await r.json();
  const services={
   mav:createWorkerProvider("mav"),
   volan:createWorkerProvider("volan"),
   bkk:createBkkAdapter({search:bkk.search,whenResolver:clockIso})
  };
  const engine=createMatrixSearch({rules,services});
  const result=await engine.run({...inputs,signal:active.signal});
  if(active.signal.aborted)return;
  // End-to-end pilot display time, not a claim of My Trips save or GPT response.
  for(const p of providers)$("tag-"+p).textContent=
   result.telemetry?.providerStatus?.[p]||"nincs eredmény";
  render(result,$("primary").value);
  $("results").classList.remove("hidden");
  setStatus(result.status==="ready"?
   "✅ Ellenőrzött TripPack elkészült. Pilot: nincs automatikus felhőmentés.":
   "⚠️ Nincs ellenőrzött teljes útvonal. A források státuszai lent látszanak.");
 }catch(e){
  if(!active.signal.aborted)setStatus("⚠️ "+(e?.message||"A keresés nem indítható."));
 }finally{
  clearInterval(ticker);
  $("elapsed").textContent=((performance.now()-start)/1000).toFixed(1).replace(".",",")+" mp";
  working=false;controller=null;$("run").disabled=false;$("cancel").disabled=true;
 }
}
$("run").addEventListener("click",run);
$("cancel").addEventListener("click",()=>{controller?.abort();setStatus("Megszakítva. Mentés nem történt.")});
$("profile").addEventListener("change",()=>{
 document.documentElement.classList.toggle("monika",$("profile").value==="m");
});
document.documentElement.classList.add("monika");
