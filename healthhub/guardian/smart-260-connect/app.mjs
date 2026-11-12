/* SHO Smart Match · two ready-to-use examples + expandable templates.
 * Browser-local saves, read-only BKK GTFS, no GPS/Dropbox/Supabase mutation.
 */
import {readOfficialSnapshot} from "../../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs";
import {DEFAULT,HOME,REVERSE,SAMPLES,compute,bus260DirectionForTemplate,full260Timetable,pair260Connections} from "./core.mjs?v=943-family-verified-stops";
import {wallEpoch} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
import {ringDirection} from "./ring-direction-v941.mjs";
import {FALLBACK,loadCatalog,keyOf,valueOf,label as fleetLabel,norm,coverage} from "./fleet-catalog-v940.mjs";
const $=id=>document.getElementById(id);
const STORAGE="sh9-smart-match-templates-v1-m";
const ACTIVE_PIN_KEY="sh9-smart-match-active-pin-v1-m";
const DELETED_SAMPLES_KEY="sh9-smart-match-deleted-samples-v940";
let selectedFeeders=new Set();
// v939: isolated favorite-address draft. Existing saved itineraries are immutable until explicit save.
let favoriteAddressDraft=null;
const state={items:[],current:null,data:null,manifest:null,catalog:FALLBACK,stopNames:null,result:null,full260:null,
 reminderEnabled:false,notificationFired:new Set(),lastNext:null,loading:false};
const timeFmt=new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const dateFmt=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"});
const clockFmt=ms=>timeFmt.format(new Date(ms));
const parts=now=>Object.fromEntries(dateFmt.formatToParts(new Date(now)).map(p=>[p.type,p.value]));
const budapestDay=now=>{const p=parts(now);return [p.year,p.month,p.day].join("-")};
const pushDay=(str,n)=>{const d=new Date(str+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const timeField=hour=>String(hour).padStart(2,"0")+":00";
const clone=obj=>JSON.parse(JSON.stringify(obj));
const freshDate=()=>{
 const day=budapestDay(Date.now()),minutes=Number(timeFmt.format(new Date()).split(":")[0])*60+
  Number(timeFmt.format(new Date()).split(":")[1]);
 return day;
};
function safeLoad(){
 let saved=[];
 try{const s=JSON.parse(localStorage.getItem(STORAGE));if(Array.isArray(s))saved=s.filter(x=>x&&typeof x==="object"&&
  typeof x.id==="string"&&x.id.length<90&&x.profile==="monika").slice(0,24);}
 catch(_){}
 const ids=new Set(saved.map(i=>i.id));
 let dismissed=[];
 try{const raw=JSON.parse(localStorage.getItem(DELETED_SAMPLES_KEY)||"[]");
  if(Array.isArray(raw))dismissed=raw.filter(id=>SAMPLES.some(item=>item.id===id));
 }catch(_){}
 const hidden=new Set(dismissed);
 for(const sample of SAMPLES)if(!ids.has(sample.id)&&!hidden.has(sample.id))saved.push(clone(sample));
 // Update only the old default 6-minute walk settings; leave other
 // personal edits intact. Keep the user's saved templates compatible.
 let updated=false;
 for(const item of saved){
  // Upgrade ONLY untouched v941 family address shells to the verified
  // v943 stop sequence. Never replace a customized or deleted route.
  const verified=SAMPLES.find(x=>x.id===item.id&&x.multiLegDraft===true);
  if(verified&&item.favoriteRoute===true&&
   !String(item.targetRoute||"").trim()&&
   !String(item.originStop||"").trim()&&
   !String(item.transferStop||"").trim()){
   const originalTitle=String(item.title||"").trim();
   Object.assign(item,clone(verified));
   if(originalTitle&&originalTitle!==verified.title&&
     !/^(Otthon → Dávid|Dávid & Anna otthona → Otthon)/i.test(originalTitle))
    item.title=originalTitle;
   updated=true;
  }
  if((item.id==="home-citronella-260"||item.id==="monika-home-to-office")&&item.originWalkMin===6){
   item.originWalkMin=10;updated=true;
  }
  if(item.id==="monika-home-to-office"){
   // One-time migration of the former 17-only, 3-minute local preference.
   // Respect a deliberately customized wait value other than the old default.
   if(item.targetRoute==="17"&&(!Array.isArray(item.targetRoutes)||
     ["17","19","41"].some(line=>!item.targetRoutes.includes(line)))){
    item.targetRoutes=["17","19","41"];updated=true;
   }
   if(item.maxWaitMin===3){item.maxWaitMin=5;updated=true;}
  }
  if(item.id==="monika-260"){
   if(item.destinationWalkMin==null){item.destinationWalkMin=10;updated=true;}
   // Prior default mistakenly boarded at Bécsi út / Vörösvári út;
   // migrate only that value, preserving intentionally edited templates.
   if(item.targetRoute==="260"&&item.targetStop==="Bécsi út / Vörösvári út"){
    item.targetStop="Váradi utca";updated=true;
   }
   if(item.targetRoute==="260"&&item.transferStop==="Bécsi út / Vörösvári út"){
    item.transferStop="Váradi utca";updated=true;
   }
   if(item.targetRoute==="260"&&item.targetAfterStop!=="Citronella utca"&&item.targetStop==="Váradi utca"){
    item.targetAfterStop="Citronella utca";updated=true;
   }
  }
 }
 if(updated)try{localStorage.setItem(STORAGE,JSON.stringify(saved))}catch(_){}
 return saved;
}
function toast(msg){
 const t=$("toast");t.textContent=msg;t.hidden=false;
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>{t.hidden=true},5500);
}
function persist(){
 try{localStorage.setItem(STORAGE,JSON.stringify(state.items));return true}
 catch(_){toast("A böngésző nem engedi a sablon tárolását.");return false}
}
function publishActivePin(){
 // Same-origin browser-local preference; no GPS or Dropbox writes.
 const item=current();if(!item||!isPinned())return;
 try{localStorage.setItem(ACTIVE_PIN_KEY,item.id)}catch(_){}
}
function current(){return state.items.find(x=>x.id===state.current)||state.items[0]}
function displayName(item){return String(item.title||"Smart Match útvonal").slice(0,85)}
function pairedTemplate(item){
 if(!item)return null;
 const other=item.reverseId||
  (item.id===DEFAULT.id?REVERSE.id:item.id===REVERSE.id?DEFAULT.id:null);
 return other?state.items.find(x=>x.id===other)||null:null;
}
function shortTitle(item){
 // A family label such as "Dávid & Anna Otthona" is NOT our own "Otthon".
 const summarize=(value,fallback)=>{
  const name=String(value||"").trim();
  if(/d[aá]vid/i.test(name)&&/anna/i.test(name))return "Dávidék";
  if(/^otthon$/i.test(name))return "Otthon";
  if(/bécsi corner|iroda|munkahely/i.test(name))return "Munkahely";
  return name||fallback;
 };
 return summarize(item.originLabel,"Indulás")+" → "+summarize(item.destinationLabel,"Cél");
}
function updateTitle(item){
 $("headingFull").textContent=displayName(item);
 $("headingShort").textContent=shortTitle(item);
 $("heading").setAttribute("aria-label",displayName(item));
 const opposite=pairedTemplate(item),b=$("reverseBtn");
 b.hidden=!opposite;
 b.disabled=Boolean(state.loading);
 if(opposite){
  const label="Irányváltás: "+shortTitle(opposite);
  b.setAttribute("aria-label",label);
  b.title=label;
 }
}
function reverseCommute(){
 if(!isPinned()||state.loading)return;
 const opposite=pairedTemplate(current());
 if(!opposite){toast("Ehhez az útvonalhoz még nincs ellenirányú mentett sablon.");return}
 state.current=opposite.id;
 publishActivePin();
 hydrate();
 computeRoute();
}
function chipButtons(){
 const host=$("templates");host.replaceChildren();
 for(const item of state.items){
  const b=document.createElement("button");
  b.type="button";b.className="template-chip"+(item.id===state.current?" active":"");
  b.textContent=(item.pinned?"📌 ":"")+(item.type==="walk"?"🚶 ":"🚋 ")+displayName(item);
  b.setAttribute("aria-pressed",String(item.id===state.current));
  b.addEventListener("click",()=>{
   if(isPinned())leavePinned();
   state.current=item.id;hydrate();computeRoute();
  });
  host.append(b);
 }
}
function isPinned(){return document.body.classList.contains("pinned")}
function applyFormModes(){
 const walking=$("kind").value==="walk";
 for(const el of document.querySelectorAll(".forTransfer"))el.hidden=walking;
 $("waitMetric").textContent=walking?"2 perc ráhagyás":"≤ "+$("maxWait").value+" perc";
}
function hydrate(){
 favoriteAddressDraft=null;
 const item=current();if(!item)return;
 // Incomplete built-in family drafts follow the actual shared favorite aliases
 // by slot, without copying private coordinates into the public route schema.
 if(item.favoriteRoute&&!item.targetRoute){
  const saved=window.SHO_SMART_MATCH_FAVORITE_EDITOR_V939?.readLocal?.()||[];
  const a=saved.find(x=>x.slot===item.originFavoriteSlot);
  const b=saved.find(x=>x.slot===item.destinationFavoriteSlot);
  if(a&&b){item.originLabel=a.label;item.destinationLabel=b.label;
   item.title=(a.label+" → "+b.label).slice(0,80)}
 }
 updateTitle(item);
 $("titleInput").value=item.title||"";
 $("kind").value=item.type==="walk"?"walk":"transfer";
 $("targetRoute").value=item.targetRoute||"260";
 $("headsign").value=item.targetHeadsign||"";
 $("fromLabel").value=item.originLabel||"";
 $("toLabel").value=item.destinationLabel||"";
 $("boardStop").value=item.targetStop||"";
 $("originStop").value=item.originStop||"";
 $("transferStop").value=item.transferStop||"";
 $("walkMin").value=item.originWalkMin??10;
 $("safetyMin").value=item.originSafetyMin??1;
 $("transferWalk").value=item.transferWalkMin??2;
 $("maxWait").value=item.maxWaitMin??3;
 $("timeFrom").value=timeField(item.startHour??13);
 $("timeUntil").value=timeField(item.endHour??19);
 renderFeederChecks(item.feederRoutes||[]);
 applyFormModes();chipButtons();renderPinnedSelector();renderFlow(item);metrics(item);
 $("timelineSubtitle").textContent=displayName(item)+" · menetrend szerint";
}
// The 374 official routes are editable; only four have a verified timetable.
function availableRoutes(){return state.catalog.map(entry=>valueOf(entry.key));}
function routeEntry(value){return state.catalog.find(entry=>valueOf(entry.key)===value)||null;}
function showFleetCoverage(){
 const target=keyOf($("targetRoute").value);
 const family=current()?.multiLegDraft===true;
 const supported=!family&&coverage({targetKey:target,feederKeys:[...selectedFeeders],type:$("kind").value});
 const el=$("fleetCoverageV940");if(!el)return;
 el.dataset.supported=String(supported);
 el.textContent=family?
  "🧭 Családi útvonal: hiteles megállósorrend, de a három járat menetrendi összehangolása még nem aktív.":
  supported?
   "✓ Ellenőrzött BKK GTFS-menetrend · Smart Match kalkuláció elérhető":
   "ⓘ A teljes flotta szerkeszthető, de ehhez a járatkombinációhoz még nincs hitelesített Smart Match-menetrend.";
}
function drawFeederBrowser(){
 const host=$("feederLines");host.replaceChildren();
 const target=keyOf($("targetRoute").value);
 const needle=norm($("feederSearchV940")?.value||"").trim();
 const mode=$("feederModeV940")?.value||"";
 const matches=state.catalog.filter(x=>x.key!==target&&(!mode||x.mode===mode)&&
  (!needle||norm(x.id+" "+x.name+" "+x.directions.join(" ")).includes(needle)));
 const chosen=matches.filter(x=>selectedFeeders.has(valueOf(x.key)));
 const other=matches.filter(x=>!selectedFeeders.has(valueOf(x.key)));
 const shown=[...chosen,...other.slice(0,needle?60:24)];
 for(const entry of shown){
  const val=valueOf(entry.key);
  const wrapper=document.createElement("label");
  wrapper.className="sm-fleet-choice"+(selectedFeeders.has(val)?" selected":"");
  const input=document.createElement("input");input.type="checkbox";
  input.value=val;input.checked=selectedFeeders.has(val);
  input.addEventListener("change",()=>{
   if(input.checked){
    if(selectedFeeders.size>=12){input.checked=false;toast("Legfeljebb 12 csatlakozó járat választható.");return}
    selectedFeeders.add(val);
   }else selectedFeeders.delete(val);
   drawFeederBrowser();showFleetCoverage();
  });
  const label=document.createElement("span");label.textContent=fleetLabel(entry);
  wrapper.append(input,label);host.append(wrapper);
 }
 const count=$("fleetResultV940");
 if(count)count.textContent=selectedFeeders.size+" kiválasztva · "+matches.length+
  " találat"+(shown.length<matches.length?" · szűkítsd a keresést":"");
 showFleetCoverage();
}
function renderFeederChecks(selected){
 selectedFeeders=new Set((Array.isArray(selected)?selected:[]).filter(v=>!!routeEntry(v)));
 drawFeederBrowser();
}
function populateStops(){
 if(!state.data&&!state.stopNames)return;
 const names=state.stopNames||
  [...new Set(Object.values(state.data.stops).map(s=>s[0]))].sort((a,b)=>a.localeCompare(b,"hu-HU"));
 const list=$("stops");list.replaceChildren();
 for(const name of names){const o=document.createElement("option");o.value=name;list.append(o)}
}
async function loadFullStopSuggestions(){
 if(state.stopNames)return;
 const source=new URL("../bkk-network-v806.json",import.meta.url);
 try{
  const res=await fetch(source,{cache:"force-cache",credentials:"omit"});
  if(!res.ok||Number(res.headers?.get("content-length")||0)>1500000)
   throw Error("bkk_network_unavailable");
  const data=await res.json();
  if(data.schemaVersion!==1||data.source!=="BKK Zrt., CC BY 4.0"||
   !Array.isArray(data.routes)||data.routes.length<100||data.routes.length>1200)
   throw Error("invalid_bkk_network");
  const names=new Set();
  for(const route of data.routes)for(const stop of route.stops||[]){
   const n=String(stop?.[1]||"").trim();
   if(n.length>1&&n.length<125)names.add(n);
  }
  if(names.size<100||names.size>12000)throw Error("incomplete_bkk_network");
  state.stopNames=[...names].sort((a,b)=>a.localeCompare(b,"hu-HU"));
  populateStops();
 }catch(_){
  const status=$("fleetCoverageV940");
  if(status)status.title="A teljes megállólista nem elérhető. A megállók kézzel továbbra is megadhatók.";
 }
}
function populateIndex(){
 const lines=availableRoutes(),previous=current()?.targetRoute||"260";
 const sel=$("targetRoute");sel.replaceChildren();
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Válassz céljáratot…";sel.append(placeholder);
 for(const entry of state.catalog){
  const o=document.createElement("option");o.value=valueOf(entry.key);o.textContent=fleetLabel(entry);sel.append(o);
 }
 sel.value=lines.includes(previous)?previous:lines[0];
 $("scopeLabel").textContent="BKK · "+state.catalog.length+" járat · 4 menetrendi";
 populateStops();
 renderFeederChecks(current()?.feederRoutes||[]);
}
function safeTimeHour(value){
 if(!/^\d{2}:00$/.test(value))throw Error("Az időablak egész órákat használ.");
 return Number(value.slice(0,2));
}
function inputInt(id,min,max){
 const raw=$(id).value;if(!/^\d+$/.test(raw))throw Error("Hiányzó vagy hibás beállítás: "+id);
 const value=Number(raw);if(value<min||value>max)throw Error("Az érték tartományon kívül esik: "+id);
 return value;
}
function readForm(){
 const base=favoriteAddressDraft?
  {...clone(DEFAULT),targetAfterStop:"",destinationTransitStop:"",reverseId:null}:
  current()||clone(DEFAULT);
 const type=$("kind").value;
 const next={...base,
  type,
  title:$("titleInput").value.trim()||"Új Smart Match séma",
  originLabel:$("fromLabel").value.trim()||"Indulás",
  destinationLabel:$("toLabel").value.trim()||"Cél",
  originStop:$("originStop").value.trim(),
  transferStop:$("transferStop").value.trim(),
  targetStop:$("boardStop").value.trim(),
  targetRoute:$("targetRoute").value.trim(),
  targetRoutes:base.targetRoute===$("targetRoute").value.trim()&&Array.isArray(base.targetRoutes)&&
   base.targetRoutes.includes(base.targetRoute)?[...base.targetRoutes]:[$("targetRoute").value.trim()],
  targetHeadsign:$("headsign").value.trim(),
  feederRoutes:type==="walk"?[]:[...selectedFeeders],
  startHour:safeTimeHour($("timeFrom").value),endHour:safeTimeHour($("timeUntil").value),
  originWalkMin:inputInt("walkMin",0,30),originSafetyMin:inputInt("safetyMin",0,10),
  transferWalkMin:type==="walk"?0:inputInt("transferWalk",0,20),
  maxWaitMin:type==="walk"?3:inputInt("maxWait",1,10),
  transferSafetyMin:type==="walk"?0:(base.transferSafetyMin??1),
  maxTransferMeters:base.maxTransferMeters??350,
  ...(favoriteAddressDraft?{originFavoriteSlot:favoriteAddressDraft.from,
   destinationFavoriteSlot:favoriteAddressDraft.to}:{})
 };
 if(!routeEntry(next.targetRoute))throw Error("A céljárat nem szerepel a hiteles BKK-katalógusban.");
 if(next.feederRoutes.some(x=>!routeEntry(x)))throw Error("Ismeretlen csatlakozó járat.");
 if(next.feederRoutes.some(x=>keyOf(x)===keyOf(next.targetRoute)))throw Error("Egy járat nem lehet saját csatlakozása.");
 if(base.targetRoute!==next.targetRoute){
  next.targetAfterStop="";next.destinationTransitStop="";
  // Do not reuse the old 260-specific direction after replacing the vehicle.
  next.feederHeadsign="";
 }
 if(!next.targetStop)throw Error("Add meg a céljárat pontos BKK-megállóját.");
 if(type==="transfer"&&(!next.originStop||!next.transferStop||!next.feederRoutes.length))
  throw Error("Legalább egy ráhordó járat és mindkét megálló szükséges.");
 if(next.endHour<=next.startHour)throw Error("A záró időpont későbbi legyen.");
 return next;
}
function useFormWithoutSave(){
 const input=readForm();const ix=state.items.findIndex(x=>x.id===state.current);
 if(ix>=0)state.items[ix]=input;
 return input;
}
function save({pin=false,newTemplate=false}={}){
 let item=readForm();
 if(newTemplate){item.id="custom-"+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36));
  item.title=item.title==="Mónika · Munkahely → Otthon"?"Új Smart Match sablon":item.title;
  state.current=item.id;state.items.push(item);}
 else{const ix=state.items.findIndex(x=>x.id===state.current);if(ix>=0)state.items[ix]=item}
 if(pin)item.pinned=true;
 if(!persist())return false;
 if(pin){try{localStorage.setItem(ACTIVE_PIN_KEY,item.id)}catch(_){}}
 hydrate();toast(pin?"📌 Kitűzött sablon mentve":"💾 Sablon mentve");
 return true;
}
function removeTemplate(){
 const item=current();if(!item)return;
 if(state.items.length<2){toast("Legalább egy szerkeszthető sablont tarts meg.");return}
 if(!window.confirm?.("Biztosan törlöd ezt a mentett Smart Match-sémát?\n\n"+displayName(item)))return;
 const id=item.id,backup=[...state.items];
 state.items=state.items.filter(x=>x.id!==id);
 state.current=state.items.some(x=>x.id===DEFAULT.id)?DEFAULT.id:state.items[0].id;
 if(!persist()){state.items=backup;state.current=id;return}
 if(SAMPLES.some(x=>x.id===id)){
  let removed=[];
  try{const stored=JSON.parse(localStorage.getItem(DELETED_SAMPLES_KEY)||"[]");
   if(Array.isArray(stored))removed=stored.filter(x=>SAMPLES.some(t=>t.id===x));
  }catch(_){}
  if(!removed.includes(id))removed.push(id);
  try{localStorage.setItem(DELETED_SAMPLES_KEY,JSON.stringify(removed))}catch(_){
   toast("⚠️ A mintasablon visszatérhet újratöltéskor: a böngésző nem enged tárolni.");
  }
 }
 try{if(localStorage.getItem(ACTIVE_PIN_KEY)===id)localStorage.removeItem(ACTIVE_PIN_KEY)}catch(_){}
 hydrate();computeRoute();toast("🗑️ Sablon törölve · a többi útvonal változatlan.");
}
function metrics(item){
 $("windowMetric").textContent=timeField(item.startHour)+"–"+timeField(item.endHour);
 $("waitMetric").textContent=item.type==="walk"?item.originSafetyMin+" perc tartalék":"≤ "+item.maxWaitMin+" perc";
 $("walkMetric").textContent=item.originWalkMin+" + "+item.originSafetyMin+" perc";
 $("heroLabel").textContent=item.type==="walk"?"Következő indulás otthonról":item.originLabel==="Bécsi Corner"?"Következő indulás az irodából":"Következő indulás innen: "+(item.originLabel||"Indulás");
}
function getMode(line){
 // Source-backed mode; the renderer is not hardwired to a bus/tram list.
 return routeEntry(line)?.mode||state.data?.trips.find(t=>t[0]===line)?.[4]||
  (line==="260"?"bus":"tram");
}
function routeFlowStages(item){
 if(item.favoriteRoute&&!item.targetRoute)return [
  {role:"origin",label:item.originLabel||"Kedvenc indulási cím",detail:"Közös családi kedvenc"},
  {role:"walk",label:"Megálló",detail:"Beállítandó"},
  {role:"transfer",label:"BKK-járatok",detail:"Szerkesztés szükséges"},
  {role:"destination",label:item.destinationLabel||"Kedvenc célcím",detail:"Közös családi kedvenc"}
 ];
 // Future Smart Trip results may provide arbitrary validated travel stages.
 // Render them as data, without extending today's 4-line routing coverage.
 if(Array.isArray(item.flowSteps)&&item.flowSteps.length>=2&&item.flowSteps.length<=12){
  const valid=new Set(["origin","walk","tram","bus","metro","train","transfer","destination","ferry"]);
  if(item.flowSteps.every(s=>s&&valid.has(s.role)&&typeof s.label==="string"&&s.label.length<=90))
   return item.flowSteps.map(s=>({role:s.role,label:s.label,detail:String(s.detail||"").slice(0,120)}));
 }
 const walking=item.type==="walk";
 const original=String(item.originLabel||"Indulás");
 const destination=String(item.destinationLabel||"Cél");
 const feeders=(item.feederRoutes||[]);
 const feederModes=new Set(feeders.map(getMode));
 const feederMode=feederModes.size===1?[...feederModes][0]:"tram";
 const targetMode=getMode(item.targetRoute);
 return walking?[
  {role:"origin",label:original,detail:"Kiindulás"},
  {role:"walk",label:item.originWalkMin+" perc",detail:"Séta a megállóig"},
  {role:targetMode,label:item.targetRoute,detail:item.targetStop},
  {role:"destination",label:/bécsi corner/i.test(destination)?"Iroda":destination,detail:destination}
 ]:[
  {role:"origin",label:original==="Bécsi Corner"?"Iroda":original,detail:original},
  {role:"walk",label:item.originWalkMin+" perc",detail:"Séta"},
  {role:feederMode,label:feeders.join("/"),detail:item.originStop},
  {role:"transfer",label:"Csere",detail:item.transferStop},
  {role:targetMode,label:(item.targetRoutes?.length>1?item.targetRoutes.join("/"):item.targetRoute),detail:item.targetHeadsign||item.targetStop},
  {role:"destination",label:/bécsi corner/i.test(destination)?"Iroda":destination,detail:destination}
 ];
}
function updateRingDirection(item){
 // One truth for every saved template, reverse pair and unsaved calculation preview.
 // The countdown itself keeps its existing source-backed 1-second update loop.
 const ring=$("ring"),node=$("ringDirection");
 if(!ring||!node)return;
 const direction=ringDirection(item);
 node.textContent=direction.short;
 node.title=direction.full;
 node.setAttribute("aria-label","Útvonal iránya: "+direction.full);
 ring.dataset.direction=direction.full;
 ring.title="Smart Match · "+direction.full;
 $("countdownLabel").textContent="indulásig";
}
function renderFlow(item){
 updateRingDirection(item);
 const icons={origin:"🏢",walk:"🚶",tram:"🚋",bus:"🚌",metro:"🚇",
  train:"🚆",ferry:"⛴️",transfer:"⇄",destination:"🏠"};
 const steps=routeFlowStages(item),flow=$("routeFlow");
 flow.replaceChildren();
 flow.style.setProperty("--steps",String(Math.min(6,steps.length)));
 flow.dataset.overflow=steps.length>6?"yes":"no";
 for(const step of steps){
  const node=document.createElement("span");
  node.className="v2-step";node.dataset.role=step.role;
  node.setAttribute("title",[step.role==="transfer"?"Átszállás":step.label,step.detail].filter(Boolean).join(" · "));
  const pict=document.createElement("span");pict.className="v2-step-icon";
  pict.textContent=step.role==="origin"&&/otthon/i.test(item.originLabel||"")?"🏠":
   step.role==="destination"&&/bécsi corner|iroda|munkahely/i.test(item.destinationLabel||"")?"🏢":
   icons[step.role]||"📍";
  const label=document.createElement("span");label.className="v2-step-label";
  label.textContent=step.label;
  if(step.shortLabel)label.dataset.short=step.shortLabel;
  const stamp=document.createElement("time");stamp.className="v2-step-time is-empty";
  stamp.textContent="—";stamp.setAttribute("aria-label","Nincs igazolt időpont");
  const hint=document.createElement("small");hint.className="v2-step-hint";
  if(step.role==="destination"&&Number(item.destinationWalkMin)>0)
   hint.textContent="+"+item.destinationWalkMin+"p séta";
  const detail=document.createElement("span");detail.className="v2-step-detail";
  detail.textContent=step.detail||"";
  node.append(pict,stamp,label,hint,detail);flow.append(node);
 }
}
// Source-backed departure/arrival stamps for each visual route stage.
// A tilde means estimated walking time, never a GTFS stop time.
// Missing or already unreachable connections remain blank rather than invented.
function updateFlowTimes(item,trip=null){
 const nodes=[...$("routeFlow").querySelectorAll(".v2-step")];
 if(!nodes.length)return;
 const valid=n=>Number.isFinite(n)&&n>0;
 const when=(n,estimated=false)=>valid(n)?(estimated?"≈":"")+clockFmt(n):"—";
 const walk=Number.isFinite(item?.originWalkMin)?item.originWalkMin:0;
 const finishWalk=Number.isFinite(item?.destinationWalkMin)?item.destinationWalkMin:0;
 const left=trip?.leaveMs,first=trip?.feederDepartMs,transfer=trip?.feederArriveMs;
 const target=trip?.targetDepartMs,arrival=trip?.destinationArriveMs;
 let stamps;
 if(item?.type==="walk"){
  stamps=[{time:left},{time:valid(left)?left+walk*60000:null,estimated:true},
   {time:trip?.busDepartMs??target},{time:valid(arrival)?arrival+finishWalk*60000:null,estimated:finishWalk>0}];
 }else{
  stamps=[{time:left},{time:valid(left)?left+walk*60000:null,estimated:true},
   {time:first},{time:transfer},{time:target},
   {time:valid(arrival)?arrival+finishWalk*60000:null,estimated:finishWalk>0}];
  // 260-first display: an unmatched bus is still a real published departure,
  // but its missing 17/19/41 connection must not be implied.
  if(!trip?.connected&&valid(trip?.busDepartMs)){
   if(trip?.direction==="work")stamps[2]={time:trip.busDepartMs};
   else stamps[4]={time:trip.busDepartMs};
  }
 }
 nodes.forEach((node,i)=>{
  const stamp=node.querySelector(".v2-step-time"),point=stamps[i]||{};
  if(!stamp)return;
  const shown=valid(point.time);
  stamp.textContent=shown?when(point.time,point.estimated):"—";
  stamp.classList.toggle("is-empty",!shown);
  stamp.classList.toggle("is-estimated",shown&&Boolean(point.estimated));
  stamp.dateTime=shown?new Date(point.time).toISOString():"";
  stamp.setAttribute("aria-label",shown?
   (point.estimated?"Becsült időpont: ":"Menetrendi időpont: ")+clockFmt(point.time):
   "Nincs igazolt időpont");
 });
 // Show the actually selected tram line instead of generic 17/19/41
 // when a full, verified connection is available.
 if(item?.type!=="walk"&&nodes[2]){
  const label=nodes[2].querySelector(".v2-step-label");
  if(label)label.textContent=trip?.connected&&trip?.feederLine?
   String(trip.feederLine):String((item.feederRoutes||[]).join("/"));
  const targetLabel=nodes[4]?.querySelector(".v2-step-label");
  if(targetLabel)targetLabel.textContent=trip?.connected&&trip?.targetLine?
   String(trip.targetLine):String(item.targetRoutes?.length>1?
    item.targetRoutes.join("/"):item.targetRoute);
 }
}
function renderPinnedSelector(){
 const select=$("pinTemplateSelect");
 if(!select)return;
 select.replaceChildren();
 for(const item of state.items){
  const o=document.createElement("option");o.value=item.id;o.textContent=displayName(item);
  select.append(o);
 }
 select.value=state.current;
}
function addMini(host,time,label){
 const div=document.createElement("div");div.className="row-mini";
 const b=document.createElement("b");b.textContent=time;
 const small=document.createElement("small");small.textContent=label;
 div.append(b,small);host.append(div);
}
function timelineRow(row,item,index){
 const article=document.createElement("article");
 article.className="timeline-row"+(row.best?"":" unmatched");
 article.dataset.leave=String(row.best?.leaveOfficeMs||row.departMs);
 article.dataset.index=String(index);
 // Presentation-only identity/time, never modifies journey calculations.
 if(row.boardingId&&Number.isFinite(row.departMs)&&
    ["bus","tram"].includes(row.mode)&&typeof row.line==="string"){
  article.dataset.bkkStopId=row.boardingId;
  article.dataset.bkkRouteKey=row.mode+":"+row.line;
  article.dataset.bkkDeparture=String(row.departMs);
 }
 const top=document.createElement("div");top.className="row-top";
 const title=document.createElement("div");
 const t=document.createElement("div");t.className="row-time";t.textContent=clockFmt(row.departMs);
 const l=document.createElement("div");l.className="row-label";l.textContent=
  (row.mode==="tram"?"🚋 ":row.mode==="bus"?"🚌 ":"🚆 ")+row.line+"-es · "+(row.headsign||"menetrend szerinti céljárat");
 title.append(t,l);
 const tag=document.createElement("span");tag.className="match-tag";
 tag.textContent=row.best?(item.type==="walk"?"✓ "+item.originSafetyMin+" perc tartalék":"✓ "+row.best.waitMin+" perc várakozás"):"Nincs biztonságos match";
 top.append(title,tag);article.append(top);
 if(row.best){
  const grid=document.createElement("div");grid.className="row-columns";
  addMini(grid,clockFmt(row.best.leaveOfficeMs),
   /otthon/i.test(item.originLabel||"")?"🏠 Indulás otthonról":"🏢 Indulás az irodából");
  addMini(grid,item.type==="walk"?item.originWalkMin+" perc":clockFmt(row.best.feederDepartMs),
   item.type==="walk"?"🚶 Séta": (row.best.feederMode==="bus"?"🚌 ":"🚋 ")+row.best.feederLine+"-es indulás");
  addMini(grid,item.type==="walk"?clockFmt(row.departMs):clockFmt(row.best.feederArriveMs),
   item.type==="walk"?"🚌 Felszállás":"🔁 Villamos érkezés");
  article.append(grid);
  const foot=document.createElement("div");foot.className="row-foot";
  foot.textContent=item.type==="walk"?
   item.originWalkMin+" perc séta + "+item.originSafetyMin+" perc biztonsági tartalék · "+row.headsign+" irány":
   "Átszállás: becsült "+row.best.transferWalkMin+" perc séta; utána "+row.best.waitMin+" perc várakozás · "+row.matchingCount+" megfelelő járat";
  article.append(foot);
 }else{
  const detail=document.createElement("div");detail.className="row-foot";
  detail.textContent="Ehhez az induláshoz a beállított feltételekkel nincs igazolt csatlakozás.";
  article.append(detail);
 }
 return article;
}
/* The 260 is the scarce service. It owns the timetable, not the feeder tram.
 * Every verified 260 stop departure remains visible, even if an acceptable
 * 17/19/41 connection is unavailable. Do not turn an origin leaving time into
 * a bus departure or a suggested plan into a live vehicle prediction.
 */
function renderFull260Row(bus,item,index){
 const a=document.createElement("article");
 a.className="timeline-row v34-260-row"+(bus.connectionOk?" v34-matched":" v34-scheduled");
 a.dataset.index=String(index);
 a.dataset.busDeparture=String(bus.departMs);
 // Only source-backed stop IDs and exact planned times may identify a live
 // BKK TripUpdates prediction. A line number alone is NEVER sufficient.
 if(bus.stopId)a.dataset.bkkStopId=bus.stopId;
 if(bus.match?.line&&bus.match?.boardingId&&Number.isFinite(bus.match.departMs)){
  a.dataset.bkkTramLine=bus.match.line;
  a.dataset.bkkTramStopId=bus.match.boardingId;
  a.dataset.bkkTramDeparture=String(bus.match.departMs);
 }
 if(Number.isFinite(bus.leaveMs))a.dataset.leave=String(bus.leaveMs);
 const top=document.createElement("div");top.className="row-top";
 const title=document.createElement("div");
 const connected=Boolean(bus.connectionOk&&bus.match?.best&&Number.isFinite(bus.leaveMs));
 const homebound=bus.direction==="home";
 const when=document.createElement("div");when.className="row-time";
 // Start each usable itinerary at its first chronological event.
 when.textContent=clockFmt(connected?bus.leaveMs:bus.departMs);
 const label=document.createElement("div");label.className="row-label";
 label.textContent=connected?
  (homebound?"🏢 Irodai indulás":"🏠 Otthoni indulás")+
    " · 🚌 260 indulás "+clockFmt(bus.departMs)+" · "+bus.stop:
  "🚌 260 indulás · "+bus.stop+" · kizárólag menetrendi adat";
 title.append(when,label);
 const tag=document.createElement("span");tag.className="match-tag";
 tag.textContent=connected?(item.type==="walk"?
  "✓ "+item.originSafetyMin+" perc tartalék":
  "✓ "+bus.match.best.waitMin+" perc várakozás"):"Csatlakozás nélkül";
 top.append(title,tag);a.append(top);
 const grid=document.createElement("div");grid.className="row-columns";
 if(connected){
  // Chronological left → right: door departure, feeder, target leg.
  addMini(grid,clockFmt(bus.leaveMs),
   homebound?"🏢 Indulás az irodából":"🏠 Indulás otthonról");
  if(item.type==="walk"){
   addMini(grid,"≈"+clockFmt(bus.leaveMs+item.originWalkMin*60000),
    "🚶 Megállóhoz érkezés");
   addMini(grid,clockFmt(bus.departMs),"🚌 260 · "+bus.stop);
  }else if(homebound){
   addMini(grid,clockFmt(bus.match.best.feederDepartMs),
    "🚋 "+bus.match.best.feederLine+" · Kolosy tér");
   addMini(grid,clockFmt(bus.departMs),"🚌 260 · "+bus.stop);
  }else{
   addMini(grid,clockFmt(bus.departMs),"🚌 260 · "+bus.stop);
   addMini(grid,clockFmt(bus.match.departMs),"🚋 "+bus.match.line+" · átszállás");
  }
 }else{
  // A real GTFS service with no checked connection is NOT an invitation to
  // leave the office or a guessed vehicle arrival.
  addMini(grid,clockFmt(bus.departMs),"🚌 260 · "+bus.stop+" (menetrend)");
 }
 a.append(grid);
 const foot=document.createElement("div");foot.className="row-foot";
 foot.textContent=connected?(item.type==="walk"?
  item.originWalkMin+" perc séta + "+item.originSafetyMin+" perc tartalék":
  (homebound?
   "🚋 Villamos érkezése "+clockFmt(bus.match.best.feederArriveMs)+
    " · átszállás: "+bus.match.best.transferWalkMin+
    " perc séta, "+bus.match.best.waitMin+" perc várakozás · menetrend":
   "🚌 260 érkezés Bécsi út / Vörösvári út "+clockFmt(bus.match.best.feederArriveMs)+
    " · 🚋 "+bus.match.line+" indulás "+clockFmt(bus.match.departMs)+
    (Number.isFinite(bus.match.arriveAtDestinationMs)?
     " · Kolosy tér "+clockFmt(bus.match.arriveAtDestinationMs):"")+
    " · "+bus.match.best.transferWalkMin+" perc séta + "+
    bus.match.best.waitMin+" perc várakozás · menetrend")):
  "CSAK MENETREND. Ehhez a 260-ashoz nincs igazolt csatlakozás; ne ez alapján indulj el.";
 a.append(foot);
 return a;
}
function renderFull260Results(item){
 const list=$("timeline");list.replaceChildren();
 const rows=state.full260?.rows||[];
 if(!rows.length){
  const x=document.createElement("div");x.className="empty";
  x.textContent="A kiválasztott napra ezen a megállón nincs ellenőrzött 260-as indulás.";
  list.append(x);updateFlowTimes(item);$("heroTime").textContent="--:--";
  $("countdown").textContent="--:--";$("heroDetail").textContent=x.textContent;
  return;
 }
 rows.forEach((bus,i)=>list.append(renderFull260Row(bus,item,i)));
 updateTimeline(Date.now(),true);
}
function updateFull260Timeline(now=Date.now(),redraw=false){
 const all=[...$("timeline").querySelectorAll(".v34-260-row")],
  rows=state.full260?.rows||[],day=state.full260?.date;
 if(!rows.length)return;
 const today=budapestDay(now),isToday=day===today,pastDay=day<today;
 const first=rows.findIndex(x=>x.departMs>=now);
 // The hero and countdown must always show an actionable DOOR departure,
 // not the scheduled 260 stop time. A bus without a confirmed timetable
 // connection stays in the scrollable list, never as a travel recommendation.
 const workToHome=state.full260?.direction==="home";
 const next=pastDay?-1:rows.findIndex(x=>
  x.connectionOk&&x.match?.best&&Number.isFinite(x.leaveMs)&&
  (!isToday||x.leaveMs>=now));
 const marker=$("nowMarker");if(marker)marker.remove();
 all.forEach((el,i)=>{
  el.classList.toggle("past",pastDay||isToday&&rows[i].departMs<now);
  el.classList.toggle("next",i===next);
  el.classList.toggle("v34-unreachable",isToday&&rows[i].departMs>=now&&
   (!rows[i].connectionOk||Number.isFinite(rows[i].leaveMs)&&rows[i].leaveMs<now));
 });
 if(isToday){
  const m=document.createElement("div");m.id="nowMarker";m.className="now-marker";
  const t=document.createElement("span");t.textContent="MOST · "+clockFmt(now);m.append(t);
  if(first>=0)all[first]?.before(m);else all.at(-1)?.after(m);
 }
 const start=wallEpoch(day,0),end=wallEpoch(day,24*60);
 const percent=isToday?Math.max(0,Math.min(100,(now-start)/(end-start)*100)):pastDay?100:0;
 $("dayProgress").style.setProperty("--percentage",percent.toFixed(1)+"%");
 const bus=next>=0?rows[next]:null;
 const cfg=state.result?.config;
 const connection=bus?.connectionOk&&bus.match?.best&&Number.isFinite(bus.leaveMs)&&
  (!isToday||bus.leaveMs>=now)?bus.match:null;
 const goingToWork=bus?.direction==="work";
 updateFlowTimes(cfg,connection?{
  connected:true,direction:bus.direction,leaveMs:bus.leaveMs,
  feederLine:connection.best.feederLine,
  targetLine:goingToWork?connection.line:bus.line,
  feederDepartMs:connection.best.feederDepartMs,
  feederArriveMs:connection.best.feederArriveMs,
  targetDepartMs:goingToWork?connection.departMs:bus.departMs,
  destinationArriveMs:goingToWork?connection.arriveAtDestinationMs:bus.arriveAtDestinationMs,
  busDepartMs:bus.departMs
 }:{direction:bus?.direction,busDepartMs:bus?.departMs});
 $("countdownLabel").textContent=workToHome?"irodai indulásig":"otthoni indulásig";
 if(bus){
  // Both routes have already passed the verified connection and
  // leave-from-home/office checks above.
  const focusMs=bus.leaveMs;
  $("heroTime").textContent=clockFmt(focusMs);
  $("heroDetail").textContent=workToHome?
   "🏢 Irodai indulás "+clockFmt(focusMs)+
    " · 🚋 "+bus.match.best.feederLine+"-es "+clockFmt(bus.match.best.feederDepartMs)+
    " · 🚌 260-as "+clockFmt(bus.departMs)+" (menetrend)":
   "🏠 Otthon "+clockFmt(focusMs)+
    " · 🚶 "+cfg.originWalkMin+" perc séta + "+cfg.originSafetyMin+"p tartalék"+
    " · 🚌 260 Citronella "+clockFmt(bus.departMs)+
    " · 🚋 "+bus.match.line+" "+clockFmt(bus.match.departMs)+" (menetrend)";
  const remain=Math.max(0,Math.floor((focusMs-now)/1000));
  const hr=Math.floor(remain/3600),mn=Math.floor(remain%3600/60),sec=remain%60;
  $("countdown").textContent=(hr?String(hr).padStart(2,"0")+":":"")+
   String(mn).padStart(2,"0")+":"+String(sec).padStart(2,"0");
  $("ring").style.setProperty("--progress",Math.max(0,Math.min(100,(3600-remain)/3600*100)).toFixed(1)+"%");
 }else{
  $("heroTime").textContent="--:--";$("countdown").textContent="--:--";
  $("heroDetail").textContent=workToHome?
   "Nincs már elérhető, megfelelő csatlakozás az irodából. A 260-asok alább csak menetrendi adatok.":
   "Nincs már elérhető, megfelelő csatlakozás otthonról. A 260-asok alább csak menetrendi adatok.";
  $("ring").style.setProperty("--progress","0%");
 }
 if(state.lastNext!==next||redraw){
  state.lastNext=next;
  if(next>=0){
   const el=all[next],viewport=$("timeline");
   if(el&&viewport){
    const top=el.getBoundingClientRect().top-viewport.getBoundingClientRect().top+
     viewport.scrollTop-Math.min(85,Math.floor(viewport.clientHeight*.22));
    viewport.scrollTo({top:Math.max(0,top),behavior:redraw?"instant":"smooth"});
   }
  }
 }
 if(state.reminderEnabled&&isToday){
  const recommended=rows.find(x=>x.connectionOk&&Number.isFinite(x.leaveMs)&&x.leaveMs>=now);
  if(recommended){
   const remaining=recommended.leaveMs-now,id=day+"/260/"+recommended.leaveMs;
   if(remaining>0&&remaining<=5*60000&&!state.notificationFired.has(id)){
    state.notificationFired.add(id);
    const msg="Mónika, indulás "+clockFmt(recommended.leaveMs)+
     " · 260-as busz "+clockFmt(recommended.departMs)+"!";
    toast("🔔 "+msg);
    if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
     try{new Notification("SHO Smart Match · indulás közeleg",{body:msg,tag:"smart-match-"+id})}catch(_){}
    }
   }
  }
 }
}

function updateTimeline(now=Date.now(),redraw=false){
 if(!state.result)return;
 if(state.full260){updateFull260Timeline(now,redraw);return;}
 const result=state.result,rows=result.rows,day=result.date;
 const isToday=day===budapestDay(now);
 const isPastDate=day<budapestDay(now);
 let next=rows.findIndex(r=>r.best&&r.best.leaveOfficeMs>=now);
 if(isPastDate)next=-1;
 const all=$("timeline").querySelectorAll(".timeline-row");
 all.forEach((el,i)=>{
  const r=rows[i];
  el.classList.toggle("past",isPastDate||(isToday&&(r.best?r.best.leaveOfficeMs:r.departMs)<now));
  el.classList.toggle("next",i===next);
 });
 // Time marker follows the actual clock and sits before the next future arrival.
 const oldMarker=$("nowMarker");
 if(oldMarker)oldMarker.remove();
 if(isToday&&rows.length){
  const marker=document.createElement("div");marker.id="nowMarker";marker.className="now-marker";
  const span=document.createElement("span");span.textContent="MOST · "+clockFmt(now);
  marker.append(span);
  const first=rows.findIndex(r=>r.departMs>=now);
  const target=all[first<0?all.length-1:first];
  if(target){if(first<0)target.after(marker);else target.before(marker)}
 }
 const from=wallEpoch(day,result.config.startHour*60);
 const to=wallEpoch(day,result.config.endHour*60);
 // Day progress is visual only; it does not alter GTFS departure times.
 const progress=isToday?Math.max(0,Math.min(100,(now-from)/(to-from)*100)):isPastDate?100:0;
 $("dayProgress").style.setProperty("--percentage",progress.toFixed(1)+"%");
 const row=next>=0?rows[next]:null;
 updateFlowTimes(result.config,row?.best?{
  connected:true,leaveMs:row.best.leaveOfficeMs,feederLine:row.best.feederLine,
  feederDepartMs:row.best.feederDepartMs,feederArriveMs:row.best.feederArriveMs,
  targetDepartMs:row.departMs,destinationArriveMs:row.arriveAtDestinationMs,
  busDepartMs:row.mode==="bus"?row.departMs:null
 }:null);
 if(row){
  $("heroTime").textContent=clockFmt(row.best.leaveOfficeMs);
  $("heroDetail").textContent=(result.config.type==="walk"?
   "🚶 "+result.config.originWalkMin+" perc séta → ":
   (row.best.feederMode==="bus"?"🚌 ":"🚋 ")+row.best.feederLine+"-es → ")+
   (row.mode==="tram"?"🚋 ":row.mode==="bus"?"🚌 ":"🚆 ")+row.line+"-es "+clockFmt(row.departMs)+" · "+row.headsign;
  const remain=Math.max(0,Math.floor((row.best.leaveOfficeMs-now)/1000));
  const hr=Math.floor(remain/3600),mn=Math.floor(remain%3600/60),sec=remain%60;
  $("countdown").textContent=(hr?String(hr).padStart(2,"0")+":":"")+
    String(mn).padStart(2,"0")+":"+String(sec).padStart(2,"0");
  const ratio=Math.min(100,Math.max(0,(3600-remain)/3600*100));
  $("ring").style.setProperty("--progress",ratio.toFixed(1)+"%");
 }else{
  $("heroTime").textContent="--:--";
  $("heroDetail").textContent="Erre a napra nincs több ellenőrzött, megfelelő indulás.";
  $("countdown").textContent="--:--";
  $("ring").style.setProperty("--progress","0%");
 }
 if(state.lastNext!==next||redraw){
  state.lastNext=next;
  if(next>=0){
   const el=all[next],viewport=$("timeline");
   if(el&&viewport){
    const top=el.getBoundingClientRect().top-viewport.getBoundingClientRect().top+
     viewport.scrollTop-Math.min(85,Math.floor(viewport.clientHeight*.22));
    viewport.scrollTo({top:Math.max(0,top),behavior:redraw?"instant":"smooth"});
   }
  }
 }
 if(state.reminderEnabled&&row&&isToday){
  const ms=row.best.leaveOfficeMs-now;
  const id=day+"/"+row.best.leaveOfficeMs;
  if(ms>0&&ms<=5*60000&&!state.notificationFired.has(id)){
   state.notificationFired.add(id);
   const msg="Mónika, "+clockFmt(row.best.leaveOfficeMs)+"-kor indulj! "+row.line+"-as busz: "+clockFmt(row.departMs);
   toast("🔔 "+msg);
   if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
    try{new Notification("SHO Smart Match · indulás 5 perc múlva",{body:msg,tag:"smart-match-"+id})}catch(_){}
   }
  }
 }
}
function renderResults(item){
 if(state.full260){renderFull260Results(item);return;}
 const target=$("timeline");target.replaceChildren();
 const r=state.result;
 if(!r||!r.rows.length){
  const empty=document.createElement("div");empty.className="empty";
  empty.textContent="Ezen a napon nem található a megadott célmegállóhoz és irányhoz megfelelő menetrendi indulás.";
  target.append(empty);state.lastNext=null;updateFlowTimes(item);
  $("heroTime").textContent="--:--";$("countdown").textContent="--:--";
  $("heroDetail").textContent="Nincs megfelelő indulás a kiválasztott időablakban.";
  return;
 }
 r.rows.forEach((row,i)=>target.append(timelineRow(row,item,i)));
 updateTimeline(Date.now(),true);
}
async function loadFeed(){
 if(state.data&&state.manifest)return;
 const v=await readOfficialSnapshot();
 state.data=v.data;state.manifest=v.manifest;
 populateStops();
}
async function computeRoute({useForm=false}={}){
 if(state.loading)return;
 state.loading=true;
 $("status").textContent="📡 A BKK hivatalos menetrendi állományának ellenőrzése…";
 try{
  const item=useForm?readForm():current();
  if(!item)throw Error("Nincs kiválasztott sablon.");
  const date=$("day").value;
  // The family itinerary is a verified 3-vehicle stop sequence, but the
  // existing matcher handles TWO legs only. Never present fake GTFS ETAs.
  const multiLeg=item.multiLegDraft===true;
  if(multiLeg||!coverage({targetKey:item.targetRoute,feederKeys:item.feederRoutes,type:item.type==="walk"?"walk":"transfer"})){
   state.result=null;state.full260=null;state.lastNext=null;
   updateTitle(item);renderFlow(item);metrics(item);
   $("timeline").replaceChildren();
   const empty=document.createElement("div");empty.className="empty";
   empty.textContent=multiLeg?
    "260 → 17/19 → 4/6 · valós BKK-megállók. A három járat összehangolt menetrendi keresése még nem aktív.":
    "A kiválasztott járatok szerepelnek a BKK-katalógusban, de ehhez az útvonalhoz még nincs ellenőrzött indulási menetrend.";
   $("timeline").append(empty);
   $("timelineSubtitle").textContent=date+(multiLeg?
    " · családi útvonal · három járat":
    " · menetrendi lefedettség bővítés alatt");
   $("heroTime").textContent="--:--";$("countdown").textContent="--:--";
   $("heroDetail").textContent=multiLeg?
    "✓ Ellenőrzött BKK-megállók és járatsorrend · még nincs hitelesített indulási idő.":
    "A járatok és címek menthetők; hitelesített indulási idő még nem áll rendelkezésre.";
   $("status").textContent=multiLeg?
    "🧭 Smart Match · Otthon ⇄ Dávidék · megállók ellenőrizve, háromjáratos számítás fejlesztés alatt.":
    "ⓘ BKK-katalógus · szerkeszthető útvonal · nincs ellenőrzött Smart Match-menetrend.";
   $("ring").style.setProperty("--progress","0%");
   return;
  }
  await loadFeed();
  const busDir=bus260DirectionForTemplate(item);
  // Apply the existing walk / transfer safety policy to the FULL day,
  // without changing the user's saved preference for reminder windows.
  const fullDayConfig=busDir?{...item,startHour:0,endHour:24}:item;
  const result=compute(state.data,date,fullDayConfig);
  state.result=result;state.lastNext=null;
  state.full260=busDir?pair260Connections(
   full260Timetable(state.data,date,busDir),result,fullDayConfig):null;
  updateTitle(item);renderFlow(item);metrics(item);
  $("timelineSubtitle").textContent=state.full260?
   date+" · 260-as · "+state.full260.stop+" · "+state.full260.rows.length+
   " menetrendi indulás (teljes nap)":
   date+" · "+item.targetRoute+"-es · "+(item.targetHeadsign||item.targetAfterStop||"");
  $("status").textContent="✓ BKK GTFS · statikus menetrend · "+
   (state.full260?state.full260.rows.length+" db 260-as indulás, ":"")+
   result.matchingCount+" jó csatlakozás · adatfrissítés: "+
   new Date(state.manifest.validatedAt).toLocaleString("hu-HU",{timeZone:"Europe/Budapest"});
  if(state.full260){$("heroLabel").textContent=state.full260.direction==="home"?
   "Következő ajánlott indulás az irodából":
   "Következő ajánlott indulás otthonról";
   $("windowMetric").textContent="Teljes nap · 260";}
  renderResults(item);
 }catch(e){
  state.full260=null;
  state.result=null;state.lastNext=null;updateFlowTimes(current());$("heroTime").textContent="--:--";$("countdown").textContent="--:--";
  $("heroDetail").textContent="Nincs ellenőrzött menetrendi eredmény.";
  $("timeline").replaceChildren();
  const box=document.createElement("div");box.className="empty";
  box.textContent="Nem jelenítek meg ellenőrizetlen indulási időpontokat.";
  $("timeline").append(box);
  $("status").textContent="⚠️ "+(e?.message||"A BKK menetrend nem érhető el.");
 }finally{state.loading=false;if(current())updateTitle(current())}
}
function updatePinReminderUi(){
 const button=$("pinReminder");
 if(!button)return;
 const enabled=state.reminderEnabled;
 const label=button.querySelector("span");
 if(label)label.textContent="Emlékeztető "+(enabled?"BE":"KI");
 button.setAttribute("aria-pressed",String(enabled));
 button.setAttribute("aria-label",enabled?"Emlékeztető BE. Kikapcsoláshoz nyomd meg.":"Emlékeztető KI. Bekapcsoláshoz nyomd meg.");
 button.title=enabled?"Emlékeztető BE · indulás előtt 5 perccel, csak nyitott lapon":"Emlékeztető KI · bekapcsolás";
}
function enterPinned(){
 if(favoriteAddressDraft){
  toast('⚠️ Előbb válaszd ki a BKK-járatot és a megállókat, majd mentsd az új sablont.');
  return;
 }
 if(!save({pin:true}))return;
 document.body.classList.add("pinned");
 history.replaceState(null,"","?pinned=1&id="+encodeURIComponent(state.current));
 computeRoute();
 // Fullscreen API may be restricted by a device; the app layout is full-viewport regardless.
 try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(_){}
}
function leavePinned(){
 document.body.classList.remove("pinned");
 history.replaceState(null,"","?id="+encodeURIComponent(state.current));
 if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
}
function stepDay(n){
 const x=$("day").value||budapestDay(Date.now());
 $("day").value=pushDay(x,n);computeRoute();
}
function initEvents(){
 window.addEventListener("hh-smart-match-address-draft-v939",event=>{
  const x=event.detail;
  if(!x||!Number.isInteger(x.from?.slot)||!Number.isInteger(x.to?.slot)||
   x.from.slot<0||x.from.slot>=40||x.to.slot<0||x.to.slot>=40||
   x.from.slot===x.to.slot)return;
  const origin=String(x.from.label||"").trim().slice(0,80);
  const destination=String(x.to.label||"").trim().slice(0,80);
  if(!origin||!destination)return;
  favoriteAddressDraft={from:x.from.slot,to:x.to.slot};
  $("titleInput").value=(origin+" → "+destination).slice(0,80);
  $("fromLabel").value=origin;
  $("toLabel").value=destination;
  $("headsign").value="";
  $("boardStop").value="";
  $("originStop").value="";
  $("transferStop").value="";
  $("kind").value="transfer";
  $("timeFrom").value="06:00";
  $("timeUntil").value="22:00";
  $("targetRoute").value="";
  renderFeederChecks([]);
  applyFormModes();
  toast("⭐ Új címpár előkészítve. Add meg a BKK-járatokat és megállókat, majd mentsd új sablonként.");
 });
 $("kind").addEventListener("change",applyFormModes);
 $("targetRoute").addEventListener("change",()=>{
  selectedFeeders.delete($("targetRoute").value);
  $("headsign").value="";$("boardStop").value="";
  drawFeederBrowser();
 });
 for(const id of ["boardStop","originStop","transferStop"])
  $(id)?.addEventListener("focus",()=>void loadFullStopSuggestions(),{once:true});
 $("feederSearchV940")?.addEventListener("input",drawFeederBrowser);
 $("feederModeV940")?.addEventListener("change",drawFeederBrowser);
 $("deleteBtn")?.addEventListener("click",removeTemplate);
 $("calcBtn").addEventListener("click",()=>{
  if(favoriteAddressDraft){try{readForm()}catch(e){toast("⚠️ "+e.message);return}}
  computeRoute({useForm:true});
 });
 $("saveBtn").addEventListener("click",()=>{
  try{if(save({newTemplate:!!favoriteAddressDraft}))computeRoute();}catch(e){toast("⚠️ "+e.message)}
 });
 $("newBtn").addEventListener("click",()=>{
  try{if(save({newTemplate:true}))computeRoute();}catch(e){toast("⚠️ "+e.message)}
 });
 $("pinBtn").addEventListener("click",()=>{
  try{enterPinned()}catch(e){toast("⚠️ "+e.message)}
 });
 $("exitPin").addEventListener("click",leavePinned);
 $("pinEdit")?.addEventListener("click",leavePinned);
 $("reverseBtn")?.addEventListener("click",reverseCommute);
 // Return to the actual calling page when available; direct/bookmarked links
 // always have a safe route back to the Family Guard.
 $("pinnedBackBtn")?.addEventListener("click",event=>{
  let canReturn=false;
  try{
   const ref=new URL(document.referrer);
   canReturn=ref.origin===location.origin&&ref.pathname!==location.pathname&&history.length>1;
  }catch(_){}
  if(canReturn){event.preventDefault();history.back()}
 });
 updatePinReminderUi();
 $("pinReminder")?.addEventListener("click",()=>$("remindBtn").click());
 $("pinTemplateSelect")?.addEventListener("change",e=>{
  const id=e.target.value;
  if(!state.items.some(x=>x.id===id))return;
  state.current=id;publishActivePin();hydrate();computeRoute();
 });
 $("dayNext").addEventListener("click",()=>stepDay(1));
 $("day").addEventListener("change",()=>computeRoute());
 $("remindBtn").addEventListener("click",async()=>{
  state.reminderEnabled=!state.reminderEnabled;
  $("remindBtn").textContent="🔔";
  $("remindBtn").setAttribute("aria-pressed",String(state.reminderEnabled));
  $("remindBtn").setAttribute("aria-label",state.reminderEnabled?"Lapon belüli jelzés kikapcsolása":"Lapon belüli jelzés bekapcsolása");
  $("remindBtn").title=state.reminderEnabled?"Lapon belüli jelzés: be (csak nyitott lap)":"Lapon belüli jelzés: ki";
  updatePinReminderUi();
  if(state.reminderEnabled&&typeof Notification!=="undefined"&&Notification.permission==="default"){
   try{await Notification.requestPermission()}catch(_){}
  }
  // The colored BE/KI button is sufficient feedback; keep real departure alerts intact.
 });
 window.addEventListener("popstate",()=>{
  if(new URLSearchParams(location.search).get("pinned")==="1")document.body.classList.add("pinned");
  else document.body.classList.remove("pinned");
 });
}
async function start(){
 state.items=safeLoad();
 const params=new URLSearchParams(location.search);
 const chosen=params.get("id");
 state.current=state.items.some(x=>x.id===chosen)?chosen:
  (state.items.find(x=>x.id===DEFAULT.id)?.id||state.items[0]?.id||DEFAULT.id);
 $("day").value=freshDate();
 initEvents();
 if(params.get("pinned")==="1")document.body.classList.add("pinned");
 try{state.catalog=await loadCatalog()}catch(_){state.catalog=FALLBACK}
 populateIndex();
 hydrate();
 await computeRoute();
 // Clock updates do not trigger extra BKK/network requests.
 setInterval(()=>updateTimeline(Date.now()),1000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateTimeline(Date.now(),true)});
}
start();
