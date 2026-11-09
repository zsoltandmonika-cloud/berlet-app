/* SHO V5 · premium, map-free Google Routes presentation, no AI or storage.
 * Provider travel times and route order are never re-ranked or invented.
 * Verified ticket links only; no unverified prefilled booking or live tracking. */
import {summarizeGoogleWalks,walkSectionLabel} from "./google-walk-summary-v1.mjs";
import {providerForStep,ticketLinksForRoute} from "./smart-trip-v5-provider-links-v1.mjs";
const el=(tag,parent,text="",cls="")=>{
 const x=document.createElement(tag);
 if(cls)x.className=cls;
 x.textContent=String(text);
 parent.append(x);
 return x;
};
const time=s=>{
 const n=Date.parse(s);
 return Number.isFinite(n)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).format(new Date(n)):"—";
};
export function renderPremiumRoutes(data,{rows,status,source,container}){
 if(data?.schema!=="sho.smart-trip.universal-routes/1"||
  data?.source!=="google_routes"||data?.attribution!=="Google Maps"||
  data?.presentation!=="map_free_text_only"||data?.ai_processing!=="disabled"||
  data?.save!==false||data?.independentlyVerified!==false||
  data?.googleRequests!==1||!Array.isArray(data.routes)||data.routes.length>4)
  throw Error("A Google-válasz nem felel meg a Smart Trip szerződésének.");
 rows.replaceChildren();
 source.textContent="Google Maps · Routes API · tervezett útvonalak";
 if(!data.routes.length){
  status.textContent="A Google nem talált megfelelő tömegközlekedési útvonalat.";
  return;
 }
 let shown=0;
 data.routes.forEach((route,i)=>{
  const summary=summarizeGoogleWalks(route);
  if(!summary)return;
  const card=el("details",rows,"","st22-v5-inline-route");
  card.open=i===0;
  const headline=el("summary",card);
  el("span",headline,(i+1)+". Google-alternatíva","st22-v5-route-name");
  const pills=el("span",headline,"","st22-v5-route-data");
  el("span",pills,"⏱ "+Math.ceil(route.durationSeconds/60)+" perc","st22-v5-data-pill");
  el("span",pills,"🚶 "+summary.totalWalkMeters+" m séta","st22-v5-data-pill");
  el("span",pills,"⇄ "+summary.transfers+" átszállás","st22-v5-data-pill");
  const box=el("div",card,"","st22-v5-inline-steps");
  const header=el("div",box,"","st22-v5-flow-head");
  el("span",header,"🧭 Utazási flow · menetrendi idővonal");
  el("small",header,"Tervezett szakaszok · nem élő követés");
  const flow=el("ol",box,"","st22-v5-flow");
  flow.setAttribute("aria-label","Az útvonal menetrendi szakaszai");
  for(const part of summary.items){
   const line=el("li",flow,"","st22-v5-flow-"+part.kind);
   el("span",line,"","st22-v5-flow-dot").setAttribute("aria-hidden","true");
   const body=el("div",line,"","st22-v5-flow-body");
   if(part.kind==="walk"){
    el("p",body,"🚶 "+walkSectionLabel(part.phase)+": "+part.meters+" m");
    continue;
   }
   const t=part.step,provider=providerForStep(t);
   const row=el("div",body,"","st22-v5-segment-top");
   if(provider){
    const artwork=document.createElement("img");
    artwork.src=provider.asset;
    artwork.alt=provider.name+" márkakártya";
    artwork.width=66;artwork.height=46;artwork.loading="lazy";
    artwork.decoding="async";artwork.className="st22-v5-provider-art";
    row.append(artwork);
   }
   const labels=el("div",row);
   el("div",labels,"🚉 "+(t.line||"Járat")+
    (provider?" · "+provider.name:""),"st22-v5-segment-title");
   if(t.agency)el("div",labels,t.agency,"st22-v5-segment-subtitle");
   const start=el("p",body,"","st22-v5-stop-line");
   el("strong",start,time(t.departure));
   el("span",start," · Felszállás: "+t.from);
   const finish=el("p",body,"","st22-v5-stop-line");
   el("strong",finish,time(t.arrival));
   el("span",finish," · Érkezés: "+t.to);
  }
  const sales=ticketLinksForRoute(route);
  if(sales.length){
   const buttons=el("div",box,"","st22-v5-tickets");
   for(const sale of sales){
    // Open only provider homepages, not an invented journey-specific booking.
    const link=document.createElement("a");
    link.href=sale.url;link.rel="noopener noreferrer";link.target="_blank";
    link.className="st22-v5-ticket-link";
    link.textContent="🎟 "+sale.label+" ↗";
    link.setAttribute("aria-label",sale.label+" · jegyvásárlás új lapon");
    buttons.append(link);
   }
   el("p",box,"A járatot, időpontot és az esetleges helyjegyet a szolgáltatónál "+
    "külön kell kiválasztani. A SHO nem foglal automatikusan.","st22-v5-billing-note");
  }else{
   el("p",box,"Ehhez az útvonalhoz nincs biztosan azonosított hivatalos "+
    "jegyvásárlási link.","st22-v5-billing-note");
  }
  const follow=el("div",box,"","st22-v5-follow-note");
  el("strong",follow,"📍 Követési flow");
  el("span",follow," · Menetrendi idővonal, nem élő GPS- vagy késéskövetés. "+
   "Indulás előtt ellenőrizd a szolgáltató friss adatait.");
  const att=el("div",box,"","st22-v5-attribution");
  el("span",att,"Forrás: ");
  el("strong",att,"Google Maps").setAttribute("translate","no");
  el("span",att," · útvonaltalálat, változatlan találati sorrendben. "+
   "A márkakártyák, jegylinkek és az idővonal a SHO felülete. "+
   "Nem Léna AI-ajánlás. My Trips mentés nincs.");
  shown++;
 });
 if(!shown)throw Error("A Google-válasz nem tartalmaz megjeleníthető utazási szakaszokat.");
 status.textContent="✅ "+shown+" Google-útvonal érkezett. "+
  "Részletes menetrendi flow és szolgáltatói jegylinkek, ahol elérhetők.";
 container.hidden=false;
}
