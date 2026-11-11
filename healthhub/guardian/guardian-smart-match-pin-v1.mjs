/* Family Guard Smart Match pinned shortcut V1.
 * Read-only, isolated from Family Live GPS and real-time BKK controllers.
 * Uses the exact same origin and localStorage as Smart Match, not a cloud sync.
 * Timetable times are official static BKK GTFS only, NEVER live departures.
 */
const STORAGE="sh9-smart-match-templates-v1-m";
const ACTIVE="sh9-smart-match-active-pin-v1-m";
const FULL="/berlet-app/healthhub/guardian/smart-260-connect/";
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
function readPin(){
 try{
  const raw=localStorage.getItem(STORAGE),a=JSON.parse(raw||"null");
  if(!Array.isArray(a))return null;
  const items=a.filter(x=>x&&typeof x==="object"&&x.profile==="monika"&&
   typeof x.id==="string"&&/^[\w-]{1,90}$/.test(x.id)&&typeof x.title==="string"&&
   x.title.length<=100&&typeof x.targetRoute==="string"&&
   x.targetRoute.length<=20);
  const active=localStorage.getItem(ACTIVE);
  return (active&&items.find(x=>x.id===active))||
   items.filter(x=>x.pinned===true).at(-1)||null;
 }catch(_){return null}
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
 const future=state.entries.find(x=>x.leaveMs>=now);
 if(!future){
  const reason=state.loaded?"Nincs további igazolt indulás":"Menetrend ellenőrzése";
  setView({time:"–:–",note:reason,status:"empty",title:stageText(state.item)+" · "+reason,link:currentLink(state.item)});
  if(state.loaded&&budapestDay(now)!==state.day)refresh({force:true});
  return;
 }
 const min=Math.max(0,Math.ceil((future.leaveMs-now)/60000));
 const time=clock(future.leaveMs);
 const note=(future.date===budapestDay(now)?"":"Holnap · ")+
  (min>=60?Math.floor(min/60)+"ó "+String(min%60)+"p":" "+min+" perc")+" múlva";
 setView({
  time, note:note.trim(),status:"ready",
  title:stageText(state.item)+" · indulás "+time+" · céljárat "+future.line+" · menetrend szerinti idő",
  link:currentLink(state.item)
 });
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
  const [{readOfficialSnapshot},{compute}]=await Promise.all([
   import("../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs"),
   import("./smart-260-connect/core.mjs")
  ]);
  const {data,manifest}=await readOfficialSnapshot();
  const dates=[day,nextDay(day)],out=[];
  for(const date of dates){
   if(date<data.feedStart||date>data.feedEnd)continue;
   const result=compute(data,date,state.item);
   for(const r of result.rows){
    if(!r.best||!Number.isFinite(r.best.leaveOfficeMs))continue;
    out.push({date,leaveMs:r.best.leaveOfficeMs,line:r.line});
   }
  }
  out.sort((a,b)=>a.leaveMs-b.leaveMs);
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
  setView({time:"＋ Kitűzés",note:"Séma kiválasztása ↗",status:"empty",
   title:"Smart Match kitűzése a Family Guardra",link:FULL});
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
