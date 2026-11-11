/* Family Guard Smart Match pinned shortcut V1.
 * Read-only, isolated from Family Live GPS and real-time BKK controllers.
 * Uses the exact same origin and localStorage as Smart Match, not a cloud sync.
 * Timetable times are official static BKK GTFS only, NEVER live departures.
 */
const STORAGE="sh9-smart-match-templates-v1-m";
const ACTIVE="sh9-smart-match-active-pin-v1-m";
const CITRONELLA_DEFAULT_APPLIED="hh-smart-match-citronella-default-v2-m";
const FULL="/berlet-app/healthhub/guardian/smart-260-connect/";
import {HOME as MONIKA_DEFAULT,compute} from "./smart-260-connect/core.mjs";
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
 return item?FULL+"?pinned=1&id="+encodeURIComponent(item.id):FULL;
}
function renderClock(){
 if(!state.item)return;
 const now=Date.now();
 // A recommended HOME leave time is not the time the bus departs the stop!
 const future=state.entries.find(x=>x.displayMs>=now);
 if(!future){
  const reason=state.loaded?"Nincs további igazolt indulás":"Menetrend ellenőrzése";
  setView({time:"–:–",note:reason,status:"empty",
   title:stageText(state.item)+" · "+reason,link:currentLink(state.item)});
  if(state.loaded&&budapestDay(now)!==state.day)refresh({force:true});
  return;
 }
 const mins=Math.max(0,Math.ceil((future.displayMs-now)/60000));
 const time=clock(future.displayMs),home=clock(future.leaveMs);
 let note,title;
 if(future.stopDeparture){
  note=future.date===budapestDay(now)?
   "Otthonról "+home:"Holnap · otthonról "+home;
  title="260-as busz · Citronella utca · "+time+
   " menetrend szerinti indulás; 6 perc séta + 2 perc ráhagyás: otthonról "+home+
   (future.leaveMs<now?" (az ajánlott otthoni indulási idő elmúlt)":"");
 }else{
  note=(future.date===budapestDay(now)?"":"Holnap · ")+
   "Indulj "+(mins>=60?Math.floor(mins/60)+"ó "+String(mins%60)+"p":mins+" perc")+" múlva";
  title=stageText(state.item)+" · indulás a kiinduló helyről "+time+
   " · céljárat "+future.line+"; menetrend szerinti javaslat";
 }
 const card=document.getElementById(HOST_ID);
 const label=card?.querySelector(".hh-smart-match-pin-label");
 if(label)label.textContent=future.stopDeparture?"🚌 260 · CITRONELLA":"📌 SMART MATCH";
 setView({time,note,status:"ready",title,link:currentLink(state.item)});
}
async function updateSchedule({force=false}={}){
 if(!state.item||state.loading||!state.visible)return;
 const now=Date.now(),day=budapestDay(now);
 if(!force&&state.loaded&&state.day===day&&now-state.lastLoadAt<4*3600000){
  renderClock();return;
 }
 state.loading=true;state.day=day;
 setView({time:"…",note:"Menetrend ellenőrzése",status:"loading",
  title:"Smart Match · ellenőrzött menetrend betöltése",link:currentLink(state.item)});
 try{
  // Only now download the public snapshot. Does not access protected Family Guard data.
  const {readOfficialSnapshot}=await import("../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs");
  const {data,manifest}=await readOfficialSnapshot();
  const dates=[day,nextDay(day)],out=[];
  for(const date of dates){
   if(date<data.feedStart||date>data.feedEnd)continue;
   const result=compute(data,date,state.item);
   for(const r of result.rows){
    if(!r.best||!Number.isFinite(r.best.leaveOfficeMs))continue;
    // For Citronella, display the actual 260 STOP departure, not a downstream
    // arrival or the earlier recommended 6+2 minute home-leaving time.
    const walk260=state.item.type==="walk"&&state.item.targetRoute==="260"&&
     state.item.targetStop==="Citronella utca";
    const reverse260=state.item.id==="monika-home-to-office"&&
     r.best.feederLine==="260"&&state.item.originStop==="Citronella utca";
    const stopDeparture=walk260||reverse260;
    const displayMs=walk260?r.departMs:
     reverse260?r.best.feederDepartMs:r.best.leaveOfficeMs;
    if(!Number.isFinite(displayMs))continue;
    out.push({date,leaveMs:r.best.leaveOfficeMs,displayMs,line:stopDeparture?"260":r.line,
     stopDeparture});
   }
  }
  out.sort((a,b)=>a.displayMs-b.displayMs);
  state.entries=out;state.loaded=manifest;state.lastLoadAt=Date.now();
  renderClock();
 }catch(_){
  state.entries=[];state.loaded=null;
  setView({time:"–:–",note:"Menetrend nem elérhető",status:"error",
   title:"Smart Match · nem sikerült ellenőrizni a BKK-menetrendet",
   link:currentLink(state.item)});
 }finally{state.loading=false}
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
