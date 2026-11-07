/* SHO Smart Trip V5 · isolated demonstration UI.
 * Synthetic input ONLY. No Google request, cloud write, third-party AI or token.
 * Real Google Maps is opened independently by explicit user click.
 */
import {evaluateRoutes,explainChoice,buildMapsUrl} from "./v5-pilot-core.mjs";
import {fakeResponse} from "./v5-demo-fixture.mjs";
const $=id=>document.getElementById(id);
const html=globalThis.document.documentElement;
const adapter=globalThis.SH9_SMART_TRIP_MULTIMODAL_V1073;
const railClock=globalThis.SH9_MAV_GTFS_CORE_V1;
const budapestTime=iso=>new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(iso));
function getQuery(){
 const from=$("from").value.trim(),to=$("to").value.trim();
 const date=$("date").value,time=$("time").value;
 const priority=$("focus").value;
 if(from.length<3||to.length<3||from.toLocaleLowerCase("hu-HU")===
  to.toLocaleLowerCase("hu-HU"))throw Error("Két különböző kiindulási és célhely kell.");
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||new Date(date+"T12:00:00Z")
  .toISOString().slice(0,10)!==date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  throw Error("A dátum vagy az indulási idő hibás.");
 if(!railClock?.wallEpoch)throw Error("Az időzóna-kezelő modul nem elérhető.");
 const [hour,minute]=time.split(":").map(Number);
 const timestamp=railClock.wallEpoch(date,hour*60+minute);
 if(!Number.isFinite(timestamp))throw Error("Az utazási időpont nem érvényes.");
 return {from,to,date,time,priority,
  mode:"depart",when:new Date(timestamp).toISOString()};
}
function node(tag,value,parent,className=""){
 const el=document.createElement(tag);
 if(className)el.className=className;
 el.textContent=value;parent.appendChild(el);return el;
}
function render(candidates,query,elapsed){
 const list=$("candidates");
 list.replaceChildren();
 for(let i=0;i<candidates.length;i++){
  const c=candidates[i],m=c.metrics;
  const card=node("article","",list,"candidate"+(i===0?" best":""));
  const head=node("div","",card,"candidate-head");
  node("h3",i===0?"🏆 Léna első választása":"Lehetőség "+(i+1),head);
  node("span","DEMO · Google-formátum",head,"badge");
  if(i===0)node("span","Rangsor 1.",head,"badge best");
  const stats=node("div","",card,"stats");
  const props=[
   ["Időtartam",m.durationMin+" perc"],
   ["Gyaloglás",m.walkMeters+" m"],
   ["Átszállás",String(m.transfers)],
   ["Csatlakozási tartalék",m.shortestMargin===null?"nincs átszállás":m.shortestMargin+" perc"],
   ["Időablak",budapestTime(c.route.departure)+" → "+budapestTime(c.route.arrival)]
  ];
  props.forEach(([k,v])=>node("span",k+": "+v,stats));
  const tag=m.directVolan?"Közvetlen Volán (szintetikus)":
   m.sajoExpress?"Sajó Expressz (szintetikus)":
   m.hasTrain?"Vasút (szintetikus)":"Tömegközlekedés (szintetikus)";
  node("small",tag+(c.risk==="tight_connection"?" · SZŰK CSATLAKOZÁS":""),
   card);
 }
 $("summary").textContent=
  "4 kitalált Google-formátumú jelöltből "+candidates.length+
  " feldolgozva, ellenőrzés és SHO rangsorolás "+elapsed.toFixed(2)+" mp. "+
  "Google Routes API: 0 hívás. GPT API: 0 hívás. My Trips: 0 mentés.";
 $("story").textContent=explainChoice(candidates[0],{profile:$("profile").value,demo:true});
 $("output").hidden=false;
}
$("demo").addEventListener("click",()=>{
 const start=performance.now();
 try{
  const query=getQuery();
  if(typeof adapter?.normalizeRoutes!=="function")throw Error(
   "A meglévő v1073 Google Routes adapter nem érhető el.");
  const response=fakeResponse(query.when);
  const ranked=evaluateRoutes(response,{...query,demo:true},adapter);
  const elapsed=(performance.now()-start)/1000;
  render(ranked,query,elapsed);
  $("elapsed").textContent=elapsed.toFixed(2).replace(".",",")+" mp";
  $("status").textContent=
   "✅ A Google-formátumú DEMO válasz feldolgozva. Ez nem valós útvonaltervezési idő; "+
   "a 20–30 másodperces végponttól végpontig cél külön éles API-mérést igényel.";
 }catch(e){
  $("output").hidden=true;
  $("status").textContent="⚠️ "+(e?.message||"A DEMO feldolgozása sikertelen.");
 }
});
$("maps").addEventListener("click",()=>{
 try{
  const query=getQuery();
  const url=buildMapsUrl(query);
  if(!url)throw Error("Nem állítható elő Google Maps megnyitó hivatkozás.");
  $("status").textContent=
   "A Google Maps külön oldalon nyílik. A Maps URL nem ad vissza géppel "+
   "olvasható útvonalat és nem garantálja a beállított indulási idő átvitelét.";
  window.open(url,"_blank","noopener,noreferrer");
 }catch(e){$("status").textContent="⚠️ "+(e?.message||"Hibás keresés.")}
});
$("profile").addEventListener("change",()=>{
 html.dataset.profile=$("profile").value;
});
html.dataset.profile=$("profile").value;
