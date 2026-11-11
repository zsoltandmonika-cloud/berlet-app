/* Family Guard Smart Match pinned shortcut V1.
 * Read-only, isolated from Family Live GPS and real-time BKK controllers.
 * Uses the exact same origin and localStorage as Smart Match, not a cloud sync.
 * Timetable times are official static BKK GTFS only, NEVER live departures.
 */
const STORAGE="sh9-smart-match-templates-v1-m";
const ACTIVE="sh9-smart-match-active-pin-v1-m";
const CITRONELLA_DEFAULT_APPLIED="hh-smart-match-citronella-default-v2-m";
const FULL="/berlet-app/healthhub/guardian/smart-260-connect/";
import {HOME as MONIKA_DEFAULT,compute,bus260DirectionForTemplate,full260Timetable,pair260Connections} from "./smart-260-connect/core.mjs?v=35";
const HOST_ID="hhSmartMatchPinV1";
const holder=document.getElementById("hhTransitPanel");
const state={item:null,id:null,entries:[],day:null,loaded:null,loading:false,visible:false,lastLoadAt:0};
if(holder)start();

function clock(ms){
 return new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(ms));
}
function budapestDay(ms){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
function nextDay(day){
 const d=new Date(day+"T12:00:00Z");
 d.setUTCDate(d.getUTCDate()+1);
 return d.toISOString().slice(0,10);
}
function activeProfile(){
 return document.documentElement.dataset.guardianProfile==="m"?"monika":"zsolt";
}
function readPin(){
 if(activeProfile()!=="monika")return null;
 try{
  const raw=localStorage.getItem(STORAGE),a=JSON.parse(raw||"null");
  const items=Array.isArray(a)?a.filter(x=>x&&typeof x==="object"&&
   x.profile==="monika"&&typeof x.id==="string"&&/^[\w-]{1,90}$/.test(x.id)&&
   typeof x.title==="string"&&x.title.length<=100&&
   typeof x.targetRoute==="string"&&x.targetRoute.length<=20):[];
  let active=localStorage.getItem(ACTIVE);
  if(!localStorage.getItem(CITRONELLA_DEFAULT_APPLIED)){
   // Correct the previous rollout's mistaken "office" default exactly once.
   // Any route pinned AFTER this migration remains the user's explicit choice.
   if(!active||active==="monika-260"){
    active="home-citronella-260";
    localStorage.setItem(ACTIVE,active);
   }
   localStorage.setItem(CITRONELLA_DEFAULT_APPLIED,"1");
  }
  const preferred=active&&items.find(x=>x.id===active);
  // Mónika normally boards the 260 at Citronella utca toward Óbudai rendelőintézet.
  return preferred||items.find(x=>x.id==="home-citronella-260")||MONIKA_DEFAULT;
 }catch(_){return MONIKA_DEFAULT}
}
function stageText(item){
 if(!item)return"Kitűzhető útvonal";
 return (item.title||"Smart Match").replace(/^Mónika\s*·\s*/,"").slice(0,48);
}
function createCard(){
 const card=document.createElement("a");
 card.id=HOST_ID;card.className="hh-smart-match-pin-v1";
 card.href=FULL;card.setAttribute("aria-label","Smart Match kitűzött útvonal megnyitása");
 const label=document.createElement("small");label.className="hh-smart-match-pin-label";label.textContent="📌 SMART MATCH";
 const time=document.createElement("strong");time.id="hhSmartMatchPinTimeV1";time.textContent="Kitűzés";
 const note=document.createElement("span");note.id="hhSmartMatchPinNoteV1";note.textContent="Útvonal kiválasztása ↗";
 card.append(label,time,note);
 return card;
}
function dock(card){
 if(!holder||!card)return;
 const bar=holder.querySelector("#hhBkkLiveBarV796");
 if(bar){
  if(card.parentElement!==bar)bar.append(card);
 }else if(!card.isConnected)holder.prepend(card);
}
function setView({time,note,title,status,link}){
 const card=document.getElementById(HOST_ID);if(!card)return;
 card.dataset.state=status||"idle";
 const t=document.getElementById("hhSmartMatchPinTimeV1"),
  n=document.getElementById("hhSmartMatchPinNoteV1");
 t.textContent=time;n.textContent=note;
 card.title=title||"Smart Match";
 card.setAttribute("aria-label",title||"Smart Match megnyitása");
 card.href=link||FULL;
}
function currentLink(item){
 // The Guardian HOME bus preview opens the complete home-to-work commute,
 // not the separate walk-only sample that has no reverse title button.
 const target=item?.id==="home-citronella-260"?"monika-home-to-office":item?.id;
 return target?FULL+"?pinned=1&id="+encodeURIComponent(target):FULL;
}
function renderClock(){
 if(!state.item)return;
 const now=Date.now();
 // Match the full-size pinned card: focus the NEXT official 260 departure
 // at the selected stop, even if no short tram connection is possible.
 const future=state.entries.find(x=>x.displayMs>=now);
 const link=currentLink(state.item);
 if(!future){
  const reason=state.loaded?"Nincs több indulás ma":"Menetrend ellenőrzése";
  setView({time:"–:–",note:reason,status:"empty",
   title:stageText(state.item)+" · "+reason,link});
  if(state.loaded&&budapestDay(now)!==state.day)refresh({force:true});
  return;
 }
 const time=clock(future.displayMs),isToday=future.date===budapestDay(now);
 const from=future.dir==="work"?"Otthonról":"Irodából";
 const leave=future.leaveMs!=null?clock(future.leaveMs):null;
 const reachable=future.match&&future.leaveMs!=null&&(!isToday||future.leaveMs>=now);
 const note=future.dir==="work"&&leave?
  (isToday?"":"Holnap · ")+from+" "+leave+
   (future.leaveMs<now&&isToday?" · késő":""):
  reachable?(isToday?"":"Holnap · ")+from+" "+leave:
   (isToday?"":"Holnap · ")+"Csatlakozás nélkül";
 const stop=future.stop||"260-as megálló";
 const title="Smart Match · "+stageText(state.item)+
  " · 260-as "+stop+" · menetrend szerinti indulás "+time+
  (reachable?" · ajánlott indulás "+from.toLowerCase()+" "+leave:
   future.dir==="work"&&leave?" · "+from.toLowerCase()+" "+leave:
   " · nincs igazolt, legfeljebb 3 perces csatlakozás");
 const label=document.getElementById(HOST_ID)?.querySelector(".hh-smart-match-pin-label");
 if(label)label.textContent=future.dir==="work"?"🚌 260 · CITRONELLA":
  future.dir==="home"?"🚌 260 · BÉCSI ÚT":"📌 SMART MATCH";
 setView({time,note,status:"ready",title,link});
}
async function updateSchedule({force=false}={}){
 if(!state.item||state.loading||!state.visible)return;
 const now=Date.now(),day=budapestDay(now);
 if(!force&&state.loaded&&state.day===day&&now-state.lastLoadAt<4*3600000){
  renderClock();return;
 }
 state.loading=true;state.day=day;
 const item=state.item,requestedId=state.id;
 setView({time:"…",note:"260-as menetrend",status:"loading",
  title:"Smart Match · teljes BKK 260-as menetrend betöltése",link:currentLink(item)});
 try{
  // Same verified BKK feed and exact stop/boarding-platform matching as
  // the full-screen Smart Match V3.4. Never use only green transfer matches
  // as the source of the mini-card's next bus.
  const {readOfficialSnapshot}=await import("../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs");
  const {data,manifest}=await readOfficialSnapshot();
  const dates=[day,nextDay(day)],out=[];
  const dir=bus260DirectionForTemplate(item);
  if(dir){
   for(const date of dates){
    if(date<data.feedStart||date>data.feedEnd)continue;
    const full=full260Timetable(data,date,dir);
    // Complete service day independent of saved partial matching window.
    const expanded={...item,startHour:0,endHour:24};
    const connections=compute(data,date,expanded);
    const paired=pair260Connections(full,connections,expanded);
    for(const bus of paired.rows){
     out.push({date,displayMs:bus.departMs,leaveMs:Number.isFinite(bus.leaveMs)?bus.leaveMs:null,
      stop:bus.stop,dir,match:bus.connectionOk});
    }
   }
  }else{
   // Custom non-260 routes retain their generic matched recommendation.
   for(const date of dates){
    if(date<data.feedStart||date>data.feedEnd)continue;
    const result=compute(data,date,item);
    for(const row of result.rows){
     if(!row.best||!Number.isFinite(row.best.leaveOfficeMs))continue;
     out.push({date,displayMs:row.best.leaveOfficeMs,leaveMs:row.best.leaveOfficeMs,
      stop:item.targetStop,dir:"other",match:true});
    }
   }
  }
  if(state.id!==requestedId)return;
  out.sort((a,b)=>a.displayMs-b.displayMs);
  state.entries=out;state.loaded=manifest;state.lastLoadAt=Date.now();
  renderClock();
 }catch(_){
  if(state.id!==requestedId)return;
  state.entries=[];state.loaded=null;
  setView({time:"–:–",note:"Menetrend nem elérhető",status:"error",
   title:"Smart Match · nem sikerült ellenőrizni a BKK-menetrendet",
   link:currentLink(item)});
 }finally{
  state.loading=false;
  // A route may change while public GTFS is loading. Do not display a stale bus.
  if(state.item&&state.id!==requestedId)updateSchedule({force:true});
 }
}
function refresh({force=false}={}){
 const item=readPin();
 if(!item){
  state.item=null;state.id=null;state.entries=[];state.loaded=null;
  setView({time:"Smart Match",note:"Mónika-profilban aktív ↗",status:"inactive",
   title:"Smart Match · Mónika útvonala",link:FULL});
  return;
 }
 const change=state.id!==item.id||JSON.stringify(state.item)!==JSON.stringify(item);
 state.item=item;state.id=item.id;
 if(change){state.entries=[];state.loaded=null}
 if(change||force)updateSchedule({force:true});
 else renderClock();
}
function start(){
 const card=createCard();
 dock(card);
 const themeWatcher=new MutationObserver(()=>refresh({force:true}));
 themeWatcher.observe(document.documentElement,{attributes:true,attributeFilter:["data-guardian-profile"]});
 // Existing BKK Live module creates its bar asynchronously. Append without replacing it.
 const observer=new MutationObserver(()=>{if(holder.querySelector("#hhBkkLiveBarV796")){dock(card);observer.disconnect()}});
 observer.observe(holder,{childList:true});
 setTimeout(()=>observer.disconnect(),20000);
 // No download until pinned card enters the user's viewport.
 if(typeof IntersectionObserver==="function"){
  const io=new IntersectionObserver(entries=>{
   state.visible=entries.some(x=>x.isIntersecting);
   if(state.visible)refresh({force:true});
  },{rootMargin:"180px 0px"});
  io.observe(card);
 }else{state.visible=true;refresh({force:true})}
 window.addEventListener("storage",e=>{if(e.key===STORAGE||e.key===ACTIVE)refresh({force:true})});
 window.addEventListener("pageshow",()=>{if(state.visible)refresh({force:true})});
 document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&state.visible)refresh({force:false});
 });
 window.addEventListener("focus",()=>{if(state.visible)refresh({force:false})});
 setInterval(()=>{if(state.visible&&state.item)renderClock()},30000);
}
