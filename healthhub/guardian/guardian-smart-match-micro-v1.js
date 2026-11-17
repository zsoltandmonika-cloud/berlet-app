/* Family Guard Smart Match micro-screen v1.
 * Presentation-only mirror of the existing Smart Match pin.
 * Zero independent BKK/API/GPS/DB calls, zero controls and zero navigation.
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
  const display=d.createElement("div");
  display.id=PANEL;
  display.className="hh-smart-match-micro-v1";
  display.setAttribute("role","group");
  display.setAttribute("aria-label","Smart Match · tájékoztató indulási kijelző");
  const left=d.createElement("div");
  left.className="hh-smm-left-v1";
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
  left.append(heading,route,note);
  display.append(left,time);
  // The original logo remains in the DOM, for instant CSS rollback.
  host.appendChild(display);
  host.classList.add("hh-smart-match-micro-active-v1");
  host.setAttribute("aria-label","Smart Match · következő menetrendi indulás");

  let observed=null, mirror=null;
  function update(){
   const source=d.getElementById(SOURCE);
   if(!source)return;
   const state=source.dataset.state||"idle";
   const candidate=source.querySelector("#hhSmartMatchPinTimeV1")?.textContent?.trim()||"";
   const line=source.querySelector(".hh-smart-match-pin-label")?.textContent?.trim()||"";
   const detail=source.querySelector("#hhSmartMatchPinNoteV1")?.textContent?.trim()||"";
   const valid=state==="ready"&&/^\\d{1,2}:\\d{2}$/.test(candidate);
   time.textContent=valid?candidate:"–:–";
   heading.textContent="SMART MATCH";
   route.textContent=valid?(line.replace(/^[^\\w\\dÀ-ž]*\\s*/u,"")||"MENETREND"):"260 · MENETREND";
   note.textContent=valid?(detail||"Menetrendi idő"):
    state==="loading"?"Menetrend betöltése":
    state==="error"?"Menetrend nem elérhető":
    state==="empty"?"Nincs következő indulás":
    state==="inactive"?"Nincs aktív indulás":
    "Indulási adatra vár";
   display.title="Smart Match · "+(valid?"260-as menetrendi indulás "+candidate+" · "+detail:note.textContent)+
    " · Tájékoztató kijelző, nem BKK Live";
   display.dataset.status=valid?"ready":"inactive";
  }
  function attach(){
   const source=d.getElementById(SOURCE);
   if(!source)return false;
   if(observed===source)return true;
   if(mirror)mirror.disconnect();
   observed=source;
   mirror=new MutationObserver(update);
   mirror.observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["data-state"]});
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
  w.dispatchEvent(new Event("hh-smart-match-hero-mounted-v1"));
  return true;
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});
 else if(!mount())d.addEventListener("DOMContentLoaded",mount,{once:true});
 w.HH_GUARDIAN_SMART_MATCH_MICRO_V1=Object.freeze({mount});
})(window,document);
