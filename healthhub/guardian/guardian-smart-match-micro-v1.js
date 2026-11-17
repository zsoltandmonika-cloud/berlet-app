/* Family Guard Smart Match V4: current-route deep link, legible native-link header.
 * Presentation-only mirror of the existing Smart Match pin.
 * Zero independent BKK/API/GPS/DB calls; the entire header is one native link.
 * The golden 8-signal dashboard, glass dimensions and hero remain immutable.
 */
(function(w,d){
 "use strict";
 const PANEL="guardianSmartMatchMicroV1";
 const SOURCE="hhSmartMatchPinV1";
 function mount(){
  if(d.documentElement.dataset.hhDevicePackLiveV1056!=="on")return false;
  const host=d.getElementById("guardianDevicePackLogoV1054");
  if(!host||!host.querySelector(".fg-brand-image-v1056"))return false;
  if(d.getElementById(PANEL))return true;
  const display=d.createElement("a");
  display.id=PANEL;
  display.className="hh-smart-match-micro-v1";
  const ROUTE_HOME="/berlet-app/healthhub/guardian/smart-260-connect/";
  display.href=ROUTE_HOME;
  display.setAttribute("aria-label","Smart Match főoldal megnyitása");
  const heading=d.createElement("span");
  heading.className="hh-smm-heading-v1";
  heading.textContent="SMART MATCH";
  const route=d.createElement("span");
  route.className="hh-smm-route-v1";
  route.textContent="260 · MENETREND";
  const note=d.createElement("span");
  note.className="hh-smm-note-v1";
  note.textContent="Indulási adatra vár";
  const time=d.createElement("strong");
  time.className="hh-smm-time-v1";
  time.textContent="–:–";
  // Fully fill the EXISTING brand/header cell; never touch its grid track.
  const source=d.createElement("span");
  source.className="hh-smm-source-v2";
  source.textContent="BKK MENETREND";
  const top=d.createElement("div");
  top.className="hh-smm-top-v2";
  top.append(heading,source);
  const core=d.createElement("div");
  core.className="hh-smm-core-v2";
  core.append(route,time);
  const transfer=d.createElement("span");
  transfer.className="hh-smm-transfer-v2";
  transfer.hidden=true;
  const foot=d.createElement("div");
  foot.className="hh-smm-foot-v2";
  foot.append(note,transfer);
  display.append(top,core,foot);
  // The original logo remains in the DOM, for instant CSS rollback.
  host.appendChild(display);
  host.classList.add("hh-smart-match-micro-active-v1");
  host.setAttribute("role","group");
  host.setAttribute("aria-label","Smart Match indulási információ és megnyitás");

  let observed=null, mirror=null;
  function routeHref(source){
   // Reuse the existing pinned Smart Match card's profile-bound route URL.
   // This card already resolves Citronella to the full home-to-work journey.
   const profile=d.documentElement.dataset.guardianProfile==="m"?"m":"z";
   const fallback=ROUTE_HOME+"?profile="+profile;
   const raw=source?.getAttribute("href")||source?.href;
   if(!raw)return fallback;
   try{
    const link=new URL(raw,w.location.href);
    if(link.origin!==w.location.origin||link.pathname!==ROUTE_HOME||
       link.searchParams.get("profile")!==profile)return fallback;
    const id=link.searchParams.get("id");
    if(link.searchParams.get("pinned")==="1"&&
       (!id||!/^[\w-]{1,90}$/.test(id)))return fallback;
    return link.pathname+link.search+link.hash;
   }catch(_){return fallback}
  }
  function update(){
   const source=d.getElementById(SOURCE);
   if(!source)return;
   const state=source.dataset.state||"idle";
   display.href=routeHref(source);
   const candidate=source.querySelector("#hhSmartMatchPinTimeV1")?.textContent?.trim()||"";
   const line=source.querySelector(".hh-smart-match-pin-label")?.textContent?.trim()||"";
   const detail=source.querySelector("#hhSmartMatchPinNoteV1")?.textContent?.trim()||"";
   const valid=state==="ready"&&/^[0-2]?[0-9]:[0-5][0-9]$/.test(candidate);
   time.textContent=valid?candidate:"–:–";
   heading.textContent="SMART MATCH";
   route.textContent=valid?(line.replace("🚌 ","")||"MENETREND"):"260 · MENETREND";
   // Only an explicitly matched tram segment from the CURRENT Smart Match
   // note may appear here. Do not invent or infer 17/19 connections.
   const pieces=valid?detail.split(/\s*·\s*/).map(x=>x.trim()).filter(Boolean):[];
   const matched=pieces.find(x=>/^🚋\s+/.test(x))||"";
   const remaining=pieces.filter(x=>x!==matched).join(" · ");
   transfer.textContent=matched;
   transfer.hidden=!matched;
   note.textContent=valid?(remaining||"Menetrendi idő"):
    state==="loading"?"Menetrend betöltése":
    state==="error"?"Menetrend nem elérhető":
    state==="empty"?"Nincs következő indulás":
    state==="inactive"?"Nincs aktív indulás":
    "Indulási adatra vár";
   display.title="Smart Match · "+(valid?"260-as menetrendi indulás "+candidate+" · "+detail:note.textContent)+
    " · Tájékoztató kijelző, nem BKK Live";
   display.dataset.status=valid?"ready":"inactive";
   const isRouteLink=new URL(display.href,w.location.href).searchParams.get("pinned")==="1";
   display.setAttribute("aria-label",valid?
    "Aktuális Smart Match "+(isRouteLink?"útvonal":"főoldal")+" megnyitása · "+route.textContent+" · menetrend szerinti indulás "+candidate:
    "Aktuális Smart Match "+(isRouteLink?"útvonal":"főoldal")+" megnyitása");
  }
  function attach(){
   const source=d.getElementById(SOURCE);
   if(!source)return false;
   if(observed===source)return true;
   if(mirror)mirror.disconnect();
   observed=source;
   mirror=new MutationObserver(update);
   mirror.observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["data-state","href"]});
   update();
   return true;
  }
  if(!attach()){
   const transit=d.getElementById("hhTransitPanel");
   if(transit){
    const watcher=new MutationObserver(()=>{if(attach())watcher.disconnect()});
    watcher.observe(transit,{childList:true,subtree:true});
   }
  }
  // Existing pin owns the schedule and can now activate its same cached data
  // when this read-only hero screen is on screen.
  // Pure layout adaptation within the existing fixed-size header cell.
  // No timers, additional GPS, BKK or network operations. Native anchor handles tap and keyboard.
  function fit(){
   const r=host.getBoundingClientRect();
   display.dataset.fit=r.height<34?"short":r.width<165?"narrow":"full";
  }
  if(typeof ResizeObserver==="function"){
   const sizeObserver=new ResizeObserver(fit);
   sizeObserver.observe(host);
  }
  fit();
  w.dispatchEvent(new Event("hh-smart-match-hero-mounted-v1"));
  return true;
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});
 else if(!mount())d.addEventListener("DOMContentLoaded",mount,{once:true});
 w.HH_GUARDIAN_SMART_MATCH_MICRO_V1=Object.freeze({mount});
})(window,document);
