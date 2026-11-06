/* SHO AI Super Search · Léna Live Stopwatch v1 · opt-in preview ONLY.
 * Browser opens ChatGPT in a NEW TAB after a user click. A correlated,
 * authenticated, RLS-scoped My Trips SELECT detects completed saves.
 * Only after a validated route is drawn is the automatic stopwatch stopped.
 * Zero DB writes, zero raw GTFS sharing and zero OpenAI API calls.
 */
import {createStopwatch,handoffPrompt} from "./trip-stopwatch-core-v1.mjs";
const $=id=>document.getElementById(id);
const lab=$("swStatus"),ticker=$("swTime"),start=$("swLaunch");
const watch=createStopwatch(),DEADLINE_MS=10*60*1000,POLL_MS=3000;
let timer=null,poller=null,client=null,query=null,runId=null,checking=null,finished=false;
const profile=()=>$("swProfile").value;
const key=()=>profile()==="m"?"monika":"zsolt";
function timeText(ms){
 if(ms===null||ms===undefined)return "—";
 const t=Math.floor(ms/1000),mins=Math.floor(t/60);
 return String(mins).padStart(2,"0")+":"+String(t%60).padStart(2,"0")+"."+String(Math.floor(ms%1000/100));
}
function stage(id,text,ok=false){
 const el=$(id);el.textContent=text;el.dataset.done=String(ok);
}
function setStatus(text){lab.textContent=text}
function controlsLocked(value){
 for(const id of ["swProfile","swFrom","swTo","swDate","swHour","swPriority","swMode"]){$(id).disabled=value}
}
function tick(){
 const s=watch.snapshot();ticker.textContent=timeText(s.totalMs);
 if(runId&&!finished&&s.totalMs>=DEADLINE_MS){watch.timeout();endTimeout();return}
 $("swReport").textContent=JSON.stringify({
  schema:s.schema,state:s.state,totalMs:s.totalMs,
  cloudObservedMs:s.cloudObservedMs,uiRenderMs:s.uiRenderMs,
  method:s.method,cloudSaved:s.cloudSaved,automated:s.automated
 },null,2);
}
function clearTimers(){if(timer)clearInterval(timer);if(poller)clearTimeout(poller);
 timer=null;poller=null}
function end(mode){
 finished=true;clearTimers();controlsLocked(false);
 $("swStop").disabled=true;$("swManualButton").disabled=false;
 tick();
 if(mode==="cloud"){
  stage("swSaved","✓ Felhőmentés igazolva · "+timeText(watch.snapshot().cloudObservedMs),true);
  stage("swRendered","✓ Útiterv megjelenítve · "+timeText(watch.snapshot().totalMs),true);
  setStatus("✅ STOP: a helyes profil felhőmentett útiterve betöltődött és megjelent.");
 }else{
  stage("swSaved","Felhőmentés nem igazolt",false);
  stage("swRendered","✓ Kézi JSON-megjelenítés · "+timeText(watch.snapshot().totalMs),true);
  setStatus("⏱ STOP: kézi importtal megjelent. Ez NEM automatikus My Trips-mentés.");
 }
}
function drawRoute(route){
 const root=$("swRoute");root.replaceChildren();
 const add=(tag,klass,text,parent=root)=>{
  const el=document.createElement(tag);if(klass)el.className=klass;
  el.textContent=String(text||"");parent.appendChild(el);return el;
 };
 add("h3","",route.title);
 add("p","route-sub",route.travelDate+" · "+route.from+" → "+route.to);
 add("p","route-hero",(route.departure||"—")+"  →  "+(route.arrival||"—"));
 for(const leg of route.segments){
  const el=add("article","leg","",root);
  add("strong","",leg.mode==="walk"?"🚶 Séta":"🚌 "+(leg.line||leg.mode),el);
  add("p","",leg.from+" → "+leg.to,el);
  add("small","",(leg.departure||"—")+" – "+(leg.arrival||"—")+" · "+leg.status,el);
 }
 if(route.summary)add("p","route-note",route.summary);
 add("small","route-note","Menetrendi információ; valós idejű járatállapot nem következik a mentésből.");
 root.hidden=false;
}
function configClient(){
 if(client)return client;
 const cfg=window.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||
  typeof window.supabase?.createClient!=="function")return null;
 client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:"hh-guardian-family-auth-v785",persistSession:true,
   autoRefreshToken:false,detectSessionInUrl:false}
 });
 return client;
}
function safeError(message){return String(message||"").slice(0,140)}
async function readCloud(id,p){
 const c=configClient();
 if(!c)return {status:"not_connected"};
 const {data:auth,error:authError}=await c.auth.getUser();
 if(authError||!auth?.user)return {status:"auth_required"};
 // SELECT only, scoped BOTH to the requested profile and unique trip_id;
 // RLS still enforces the signed-in user's real membership in that profile.
 const {data,error}=await c.from("hh_my_trip_packs")
  .select("profile_key,trip_id,trip_data")
  .eq("profile_key",p==="m"?"monika":"zsolt")
  .eq("trip_id",id).maybeSingle();
 if(error)return {status:"cloud_error",error:safeError(error.message)};
 if(!data)return {status:"pending"};
 if(data.profile_key!==(p==="m"?"monika":"zsolt")||data.trip_id!==id)
  return {status:"rejected"};
 const raw=data.trip_data;
 if(!raw||raw.id!==id||typeof raw.savedAt!=="number"||
  !Number.isFinite(raw.savedAt))return {status:"invalid_trip_data"};
 const normalized=window.SH9_SMART_TRIP_PACK_V1078?.normalize?.(raw);
 if(!normalized||normalized.travelDate!==query.date)return {status:"invalid_trip_data"};
 return {status:"ok",trip:normalized};
}
async function checkCloud(id,p){
 if(checking===id||finished||runId!==id)return;
 checking=id;
 try{
  const r=await readCloud(id,p);
  if(runId!==id||finished)return;
  if(r.status==="ok"){
   if(!watch.cloudObserved(id))return;
   stage("swSaved","✓ Megérkezett az igazolt felhőmentés",true);
   setStatus("Felhőmentés megtalálva. Útiterv kirajzolása…");
   drawRoute(r.trip);
   // One paint boundary: STOP represents visual completion, not only data receipt.
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(runId!==id||finished)return;
    if(watch.displayed({id,method:"cloud"}))end("cloud");
   }));
  }else if(r.status==="auth_required"){
   stage("swSaved","A felhőfigyeléshez Family Guard-bejelentkezés kell",false);
  }else if(r.status==="not_connected"){
   stage("swSaved","Felhőfigyelés nem érhető el ezen az oldalon",false);
  }else if(r.status==="cloud_error"){
   stage("swSaved","Átmeneti Supabase olvasási hiba",false);
  }else if(r.status==="invalid_trip_data"||r.status==="rejected"){
   stage("swSaved","A mentés nem felel meg a keresésazonosítónak vagy a TripPack sémának",false);
  }
 }catch(_){
  if(runId===id&&!finished)stage("swSaved","Nem sikerült ellenőrizni a felhőmentést",false);
 }finally{
  if(checking===id)checking=null;
  if(runId===id&&!finished){
   if(watch.snapshot().totalMs>=DEADLINE_MS){
    watch.timeout();endTimeout();
   }else poller=setTimeout(()=>void checkCloud(id,p),POLL_MS);
  }
 }
}
function endTimeout(){
 finished=true;clearTimers();controlsLocked(false);$("swStop").disabled=true;
 tick();setStatus("⌛ 10 perc eltelt, igazolt, megjelenített útiterv nélkül. Nem állítunk sikeres mentést.");
 stage("swRendered","Időtúllépés · útiterv nem jelent meg",false);
}
function querySnapshot(){
 const from=$("swFrom").value.trim(),to=$("swTo").value.trim();
 const date=$("swDate").value,time=$("swHour").value,mode=$("swMode").value;
 if(!from||!to||from.toLocaleLowerCase("hu-HU")===to.toLocaleLowerCase("hu-HU"))return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 return {from,to,date,time,mode};
}
function startRun(event){
 if(!finished&&runId){event.preventDefault();setStatus("Már fut egy mérés. Előbb állítsd le.");return}
 const q=querySnapshot(),p=profile(),api=window.SH9_SMART_TRIP_CHATGPT_V1076;
 if(!q||!api?.prompt||!crypto?.randomUUID){
  event.preventDefault();setStatus("Hiányzó hely, dátum, vagy ChatGPT-átadási modul.");return;
 }
 const base=api.prompt(q,null,$("swPriority").value,p);
 const id="tp-lena-"+crypto.randomUUID().replace(/-/g,"");
 const prompt=handoffPrompt({existingPrompt:base,id});
 if(!prompt){
  event.preventDefault();
  setStatus("A személyre szabott prompt nem készíthető el biztonságosan, nem indult mérés.");
  return;
 }
 const url=new URL("https://chatgpt.com/");
 url.searchParams.set("q",prompt);
 start.href=url.href;
 query=q;runId=id;checking=null;finished=false;
 watch.start({id,profile:p});
 clearTimers();$("swStop").disabled=false;
 controlsLocked(true);$("swRoute").hidden=true;
 $("swManualButton").disabled=false;
 stage("swStarted","✓ Léna indítása · "+timeText(watch.snapshot().totalMs),true);
 stage("swSaved","Várakozás a megfelelő My Trips-felhőmentésre…",false);
 stage("swRendered","Útiterv még nem jelent meg",false);
 setStatus("▶ START: ChatGPT új lapon. Lehet, hogy a küldéshez még meg kell nyomnod az Entert.");
 timer=setInterval(tick,100);
 tick();
 // First check and all later polls happen only after user's explicit Start.
 void checkCloud(id,p);
}
start.addEventListener("click",startRun);
$("swForm").addEventListener("submit",event=>event.preventDefault());
$("swStop").addEventListener("click",()=>{
 if(!runId||finished)return;
 watch.cancel();finished=true;clearTimers();controlsLocked(false);
 $("swStop").disabled=true;setStatus("A mérést megszakítottad. Nincs STOP/sikeres találat.");
 tick();
});
$("swManualButton").addEventListener("click",()=>{
 if(!runId||finished)return;
 const text=$("swManualJson").value;
 if(text.length>60000){setStatus("A beillesztett TripPack túl nagy.");return}
 try{
  const item=window.SH9_SMART_TRIP_PACK_V1078.normalize(text);
  if(item.travelDate!==query.date)throw Error("Másik utazási dátum.");
  drawRoute(item);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(!finished&&watch.displayed({id:runId,method:"manual"}))end("manual");
  }));
 }catch(error){setStatus("⚠️ Hibás vagy másik útiterv: "+safeError(error.message))}
});
$("swCopy").addEventListener("click",async()=>{
 try{
  await navigator.clipboard.writeText($("swReport").textContent);
  setStatus("📋 Csak a mérési számokat másoltuk ki, útvonalat vagy profilt nem.");
 }catch(_){setStatus("A vágólap nem érhető el; a számok alább kijelölhetők.")}
});
document.addEventListener("visibilitychange",tick);
window.addEventListener("pagehide",()=>{clearTimers()});
const dt=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",
 year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
 hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
$("swDate").value=[dt.year,dt.month,dt.day].join("-");
$("swHour").value=dt.hour+":"+dt.minute;
let savedProfile="z";try{savedProfile=localStorage.getItem("hh-profile")==="m"?"m":"z"}catch(_){}
$("swProfile").value=savedProfile;
$("swProfile").addEventListener("change",()=>document.documentElement.dataset.profile=profile());
document.documentElement.dataset.profile=profile();
tick();
