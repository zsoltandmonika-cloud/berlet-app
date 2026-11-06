/* SHO Super Search v2 · isolated same-origin, user-initiated preview.
 * No automatic search on load; no GTFS file leaves this tab.
 */
import {createSuperSearch} from "./sho-super-search-core-v1.mjs";
import {createTripProvider} from "./travel-gtfs-provider-v1.mjs";
import {createLocalRailShadow} from "./travel-local-gtfs-shadow-v2.mjs";
const $=id=>document.getElementById(id);
const summary=$("superSummary"),details=$("superDetails"),status=$("superStatus");
const form=$("superForm"),button=$("superRun"),profile=$("superProfile");
let source=null,controller=null,searchCount=0;
const fmt=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",
 year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const p=Object.fromEntries(fmt().map(part=>[part.type,part.value]));
$("superDate").value=p.year+"-"+p.month+"-"+p.day;
profile.addEventListener("change",()=>{
 document.documentElement.dataset.profile=profile.value;
});
document.documentElement.dataset.profile=profile.value;
function clean(){
 summary.replaceChildren();details.textContent="";
}
function line(title,value){
 const r=document.createElement("div");r.className="super-result";
 const h=document.createElement("strong");h.textContent=title;
 const sub=document.createElement("small");sub.textContent=value;
 r.append(h,sub);summary.append(r);
}
form.addEventListener("submit",async event=>{
 event.preventDefault();
 const ticket=++searchCount;
 controller?.abort();controller=new AbortController();
 button.disabled=true;clean();status.textContent="A készülék helyi menetrendjének ellenőrzése…";
 try{
  if(!$("superConsent").checked){status.textContent="A helyi olvasási próba jóváhagyása szükséges.";return}
  if(!globalThis.SH9_MAV_GTFS_FAST_V1120)
   await import("../smart-travel/smart-trip/rail-gtfs-core-fast-v1120.js");
  if(!source)source=createLocalRailShadow();
  const broker=createSuperSearch();
  broker.register(createTripProvider({getExistingResults:source.getExistingResults}));
  const query={
   from:$("superFrom").value.trim(),to:$("superTo").value.trim(),
   travelDate:$("superDate").value,time:$("superTime").value,
   mode:$("superMode").value
  };
  const result=await broker.search({
   domain:"travel",profile:profile.value,scopes:["travel:timetable"],query,
   budgetMs:7000,signal:controller.signal
  });
  if(ticket!==searchCount)return;
  const m=source.metrics();
  if(result.status==="results"){
   status.textContent="Helyi menetrendi jelöltek megvannak. A GPT-6 értékelése és a My Trips mentés NEM futott le.";
   result.items.forEach(x=>line(x.title,
    [x.summary,new Date(x.startsAt).toLocaleString("hu-HU",{timeZone:"Europe/Budapest"}),
    "Forrás: "+x.source,"Menetrendi, nem élő adat"].filter(Boolean).join(" · ")));
  }else{
   status.textContent="Nincs ellenőrzött, pontosan lefedett helyi vasúti útvonal. Az eredeti Léna-keresés marad az ajánlott tartalék.";
   line("Biztonságos visszaesés","Nem keletkezett kitalált járat vagy automatikus mentés.");
  }
  const metrics={scope:"Helyi MÁV GTFS → Super Search",status:result.status,
   readMs:m.readMs??null,prepareMs:m.prepareMs??null,routeMs:m.routeMs??null,
   found:m.routeCount??0,brokerMs:Math.round(result.elapsedMs*1000)/1000,
   providerStatus:result.providers[0]?.status||"none",
   fullSearchSeconds:null,gpt6Seconds:null,myTripsSaved:false,
   note:"Nem teljes ajtótól ajtóig útiterv. Nincs fizetős API, GPS, Supabase vagy adattovábbítás."};
  details.textContent=JSON.stringify(metrics,null,2);
 }catch(_){
  if(ticket===searchCount)status.textContent="A helyi teszt nem futott végig. Az éles Léna-keresés változatlan.";
 }finally{if(ticket===searchCount)button.disabled=false}
});
$("superClear").addEventListener("click",()=>{
 ++searchCount;controller?.abort();source?.dispose();source=null;
 clean();form.reset();$("superDate").value=p.year+"-"+p.month+"-"+p.day;
 status.textContent="A helyi tesztmemória törölve. Nincs felhőmódosítás.";
 button.disabled=false;
});
window.addEventListener("pagehide",()=>{controller?.abort();source?.dispose();source=null});
