/* SHO Smart Match · two ready-to-use examples + expandable templates.
 * Browser-local saves, read-only BKK GTFS, no GPS/Dropbox/Supabase mutation.
 */
import {readOfficialSnapshot} from "../../../sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs";
import {DEFAULT,HOME,SAMPLES,compute,nextIndex,clean} from "./core.mjs";
const $=id=>document.getElementById(id);
const STORAGE="sh9-smart-match-templates-v1-m";
const state={items:[],current:null,data:null,manifest:null,result:null,
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
 return minutes>=19*60?pushDay(day,1):day;
};
function safeLoad(){
 let saved=[];
 try{const s=JSON.parse(localStorage.getItem(STORAGE));if(Array.isArray(s))saved=s.filter(x=>x&&typeof x==="object"&&
  typeof x.id==="string"&&x.id.length<90&&x.profile==="monika").slice(0,24);}
 catch(_){}
 const ids=new Set(saved.map(i=>i.id));
 for(const sample of SAMPLES)if(!ids.has(sample.id))saved.push(clone(sample));
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
function current(){return state.items.find(x=>x.id===state.current)||state.items[0]}
function displayName(item){return String(item.title||"Smart Match útvonal").slice(0,85)}
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
 const item=current();if(!item)return;
 $("heading").textContent=displayName(item);
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
 applyFormModes();chipButtons();renderFlow(item);metrics(item);
 $("timelineSubtitle").textContent=displayName(item)+" · menetrend szerint";
}
function availableRoutes(){
 return state.data?.routes?.length?state.data.routes:["17","19","41","260"];
}
function renderFeederChecks(selected){
 const host=$("feederLines");host.replaceChildren();
 for(const line of availableRoutes()){
  if(line===$("targetRoute").value)continue;
  const wrapper=document.createElement("label");
  const input=document.createElement("input");
  input.type="checkbox";input.value=line;input.checked=selected.includes(line);
  const text=document.createTextNode(" "+line+"-es");
  wrapper.append(input,text);host.append(wrapper);
 }
}
function populateIndex(){
 const lines=availableRoutes(),previous=$("targetRoute").value||current()?.targetRoute||"260";
 const sel=$("targetRoute");sel.replaceChildren();
 for(const line of lines){const o=document.createElement("option");o.value=line;o.textContent=line+"-es járat";sel.append(o)}
 sel.value=lines.includes(previous)?previous:lines[0];
 const names=[...new Set(Object.values(state.data.stops).map(s=>s[0]))].sort((a,b)=>a.localeCompare(b,"hu-HU"));
 const list=$("stops");list.replaceChildren();
 for(const name of names){const o=document.createElement("option");o.value=name;list.append(o)}
 $("scopeLabel").textContent="BKK GTFS · "+lines.join(" / ")+" vonalak";
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
 const base=current()||clone(DEFAULT);
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
  targetHeadsign:$("headsign").value.trim(),
  feederRoutes:type==="walk"?[]:[...document.querySelectorAll("#feederLines input:checked")].map(x=>x.value),
  startHour:safeTimeHour($("timeFrom").value),endHour:safeTimeHour($("timeUntil").value),
  originWalkMin:inputInt("walkMin",0,30),originSafetyMin:inputInt("safetyMin",0,10),
  transferWalkMin:type==="walk"?0:inputInt("transferWalk",0,20),
  maxWaitMin:type==="walk"?3:inputInt("maxWait",1,10),
  transferSafetyMin:type==="walk"?0:(base.transferSafetyMin??1),
  maxTransferMeters:base.maxTransferMeters??350
 };
 if(!state.data?.routes.includes(next.targetRoute))throw Error("A céljárat nincs a jelenlegi BKK GTFS-ben.");
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
 hydrate();toast(pin?"📌 Kitűzött sablon mentve":"💾 Sablon mentve");
 return true;
}
function metrics(item){
 $("windowMetric").textContent=timeField(item.startHour)+"–"+timeField(item.endHour);
 $("waitMetric").textContent=item.type==="walk"?item.originSafetyMin+" perc tartalék":"≤ "+item.maxWaitMin+" perc";
 $("walkMetric").textContent=item.originWalkMin+" + "+item.originSafetyMin+" perc";
 $("heroLabel").textContent=item.type==="walk"?"Következő indulás otthonról":"Következő indulás "+(item.originLabel||"az irodából")+" helyszínről";
}
function renderFlow(item){
 const flow=$("routeFlow");flow.replaceChildren();
 const tokens=item.type==="walk"?[
  "🏠 "+(item.originLabel||"Otthon"),"🚶 "+item.originWalkMin+" perc",
  "🚌 "+item.targetRoute+" · "+item.targetStop,"📍 "+(item.destinationLabel||"Cél")
 ]:[
  "🏢 "+item.originLabel,"🚶 "+item.originWalkMin+" perc",
  "🚋 "+item.feederRoutes.join(" / "),"🔁 "+item.transferStop,
  "🚌 "+item.targetRoute,"🏡 "+item.destinationLabel
 ];
 for(const [i,label] of tokens.entries()){
  if(i){const arrow=document.createElement("i");arrow.textContent="→";flow.append(arrow)}
  const token=document.createElement("span");token.textContent=label;flow.append(token);
 }
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
 const top=document.createElement("div");top.className="row-top";
 const title=document.createElement("div");
 const t=document.createElement("div");t.className="row-time";t.textContent=clockFmt(row.departMs);
 const l=document.createElement("div");l.className="row-label";l.textContent=
  "🚌 "+row.line+"-es · "+(row.headsign||"menetrend szerinti céljárat");
 title.append(t,l);
 const tag=document.createElement("span");tag.className="match-tag";
 tag.textContent=row.best?(item.type==="walk"?"✓ "+item.originSafetyMin+" perc tartalék":"✓ "+row.best.waitMin+" perc várakozás"):"Nincs biztonságos match";
 top.append(title,tag);article.append(top);
 if(row.best){
  const grid=document.createElement("div");grid.className="row-columns";
  addMini(grid,clockFmt(row.best.leaveOfficeMs),
   item.type==="walk"?"🏠 Indulás otthonról":"🏢 Indulás az irodából");
  addMini(grid,item.type==="walk"?item.originWalkMin+" perc":clockFmt(row.best.feederDepartMs),
   item.type==="walk"?"🚶 Séta": "🚋 "+row.best.feederLine+"-es indulás");
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
function updateTimeline(now=Date.now(),redraw=false){
 if(!state.result)return;
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
 const from=Date.parse(day+"T00:00:00+01:00")+
  result.config.startHour*3600000;
 const to=Date.parse(day+"T00:00:00+01:00")+
  result.config.endHour*3600000;
 // Day progress is visual only; it does not alter GTFS departure times.
 const progress=isToday?Math.max(0,Math.min(100,(now-from)/(to-from)*100)):isPastDate?100:0;
 $("dayProgress").style.setProperty("--percentage",progress.toFixed(1)+"%");
 const row=next>=0?rows[next]:null;
 if(row){
  $("heroTime").textContent=clockFmt(row.best.leaveOfficeMs);
  $("heroDetail").textContent=(result.config.type==="walk"?
   "🚶 "+result.config.originWalkMin+" perc séta → ":"🚋 "+row.best.feederLine+"-es → ")+
   "🚌 "+row.line+"-es "+clockFmt(row.departMs)+" · "+row.headsign;
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
   if(el&&viewport)viewport.scrollTo({top:Math.max(0,el.offsetTop-viewport.offsetTop-65),behavior:redraw?"auto":"smooth"});
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
 const target=$("timeline");target.replaceChildren();
 const r=state.result;
 if(!r||!r.rows.length){
  const empty=document.createElement("div");empty.className="empty";
  empty.textContent="Ezen a napon nem található a megadott célmegállóhoz és irányhoz megfelelő menetrendi indulás.";
  target.append(empty);state.lastNext=null;return;
 }
 r.rows.forEach((row,i)=>target.append(timelineRow(row,item,i)));
 $("matchSummary").textContent=r.matchingCount+" / "+r.totalCount+
  " céljárat-indulás igazolt a feltételek alapján. A nem megfelelő indulások halványan látszanak. "+
  "A megállók közötti séta becsült, nem ellenőrzött gyalogos útvonal.";
 updateTimeline(Date.now(),true);
}
async function loadFeed(){
 if(state.data&&state.manifest)return;
 const v=await readOfficialSnapshot();
 state.data=v.data;state.manifest=v.manifest;
 populateIndex();
}
async function computeRoute({useForm=false}={}){
 if(state.loading)return;
 state.loading=true;
 $("status").textContent="📡 A BKK hivatalos menetrendi állományának ellenőrzése…";
 try{
  await loadFeed();
  const item=useForm?readForm():current();
  if(!item)throw Error("Nincs kiválasztott sablon.");
  const date=$("day").value;
  const result=compute(state.data,date,item);
  state.result=result;state.lastNext=null;
  $("heading").textContent=displayName(item);renderFlow(item);metrics(item);
  $("timelineSubtitle").textContent=date+" · "+item.targetRoute+"-es · "+item.targetHeadsign;
  $("status").textContent="✓ BKK GTFS · statikus menetrend · "+result.matchingCount+
   " jó csatlakozás · adatfrissítés: "+new Date(state.manifest.validatedAt).toLocaleString("hu-HU",{timeZone:"Europe/Budapest"});
  renderResults(item);
 }catch(e){
  state.result=null;state.lastNext=null;$("heroTime").textContent="--:--";$("countdown").textContent="--:--";
  $("heroDetail").textContent="Nincs ellenőrzött menetrendi eredmény.";
  $("timeline").replaceChildren();
  const box=document.createElement("div");box.className="empty";
  box.textContent="Nem jelenítek meg ellenőrizetlen indulási időpontokat.";
  $("timeline").append(box);
  $("status").textContent="⚠️ "+(e?.message||"A BKK menetrend nem érhető el.");
  $("matchSummary").textContent="A céljárat irányát, a hivatalos megállóneveket és a menetrendi dátumot ellenőrizd.";
 }finally{state.loading=false}
}
function enterPinned(){
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
 $("kind").addEventListener("change",applyFormModes);
 $("targetRoute").addEventListener("change",()=>renderFeederChecks([]));
 $("calcBtn").addEventListener("click",()=>computeRoute({useForm:true}));
 $("saveBtn").addEventListener("click",()=>{
  try{if(save())computeRoute();}catch(e){toast("⚠️ "+e.message)}
 });
 $("newBtn").addEventListener("click",()=>{
  try{if(save({newTemplate:true}))computeRoute();}catch(e){toast("⚠️ "+e.message)}
 });
 $("pinBtn").addEventListener("click",()=>{
  try{enterPinned()}catch(e){toast("⚠️ "+e.message)}
 });
 $("exitPin").addEventListener("click",leavePinned);
 $("dayNext").addEventListener("click",()=>stepDay(1));
 $("day").addEventListener("change",()=>computeRoute());
 $("remindBtn").addEventListener("click",async()=>{
  state.reminderEnabled=!state.reminderEnabled;
  $("remindBtn").textContent=state.reminderEnabled?"🔔 Jelzés BE (nyitott lap)":"🔔 Lapon belüli jelzés";
  if(state.reminderEnabled&&typeof Notification!=="undefined"&&Notification.permission==="default"){
   try{await Notification.requestPermission()}catch(_){}
  }
  toast(state.reminderEnabled?"🔔 Indulás előtt 5 perccel jelzek, amíg ez a lap nyitva van.":"🔕 Lapon belüli jelzés kikapcsolva.");
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
 state.current=state.items.some(x=>x.id===chosen)?chosen:DEFAULT.id;
 $("day").value=freshDate();
 initEvents();
 if(params.get("pinned")==="1")document.body.classList.add("pinned");
 hydrate();
 await computeRoute();
 // Clock updates do not trigger extra BKK/network requests.
 setInterval(()=>updateTimeline(Date.now()),1000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateTimeline(Date.now(),true)});
}
start();
