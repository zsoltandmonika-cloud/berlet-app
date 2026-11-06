/* SHO Smart Trip · live A/B stopwatch preview.
 * Same existing Smart Trip search form, ONLY separate alpha-stopwatch-v1.html.
 * Exact search-button START → authenticated RLS cloud observation → rendered
 * route STOP. Never writes to Supabase or imports route into local My Trips.
 * Public schedule candidates could be shared through independent approval;
 * PRIVATE local GTFS is always counted locally, NEVER sent to ChatGPT.
 */
import {createStopwatch} from "../../../super-search/trip-stopwatch-core-v1.mjs";
import {buildABPrompt} from "../../../super-search/trip-ab-prompt-v1.mjs";
import {createSuperSearch} from "../../../super-search/sho-super-search-core-v1.mjs";
import {createTripProvider} from "../../../super-search/travel-gtfs-provider-v1.mjs";
import {createWorkerRailShadow} from "../../../super-search/travel-worker-bridge-v3.mjs";

const $=id=>document.getElementById(id);
const form=$("st22Form"),search=$("st22Search"),method=$("st22SearchMethod");
if(!form||!search||!method)throw Error("alpha_search_form_missing");
const clock=createStopwatch(),LIMIT=10*60*1000,POLL_MS=2500;
let state=null,poll=null,ticker=null,rail=null,cloud=null,waiting=false,serial=0;
let history=[];
function nval(id){return $(id)?.value?.trim?.()||""}
function mode(){return [...document.querySelectorAll("[data-st22-mode]")].find(x=>x.classList.contains("active"))?.dataset.st22Mode||"now"}
function activeProfile(){try{return localStorage.getItem("hh-profile")==="m"?"m":"z"}catch(_){return "z"}}
function ts(ms){if(!Number.isFinite(ms))return "00:00.0";const secs=Math.floor(ms/1000);return String(Math.floor(secs/60)).padStart(2,"0")+":"+String(secs%60).padStart(2,"0")+"."+String(Math.floor(ms%1000/100))}
function scenarioKey(q,profile,priority){
 // Stable anonymous key for within-tab matched A/B comparisons only.
 // No locations or addresses appear in the copied timing report.
 const s=[q.from,q.to,q.date,q.time,q.mode,profile,priority].join("|");
 let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0).toString(36);
}
function node(tag,className,text,parent){
 const el=document.createElement(tag);if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 parent?.append(el);return el;
}
const bar=document.createElement("section");
bar.id="st22AlphaAB";
bar.className="st22-alpha-panel";
bar.setAttribute("aria-label","SHO Super Search összehasonlító stopper");
bar.innerHTML=`
<div class="ab-top"><div><small>🧪 SHO ALPHA · NEM ÉLES KERESŐ</small><h3>⏱️ Léna A/B teszt · Smart Trip</h3></div><strong id="abClock">00:00.0</strong></div>
<div class="ab-arms" role="radiogroup" aria-label="Összehasonlítandó keresés">
 <label><input name="abArm" type="radio" value="legacy" checked> A · Jelenlegi Léna</label>
 <label><input name="abArm" type="radio" value="super"> B · Super Search előkészítés</label>
</div>
<p id="abDescription">A és B ugyanazzal a keresőgombbal indul; a B jelenleg helyi GTFS-előszűrést és rövidebb, azonos szabályú GPT-6 utasítást tesztel. A privát GTFS-adat nem kerül a ChatGPT-be.</p>
<div class="ab-stages" role="status" aria-live="polite"><span id="abStage1">① START · készenlét</span><span id="abStage2">② Mentés · várakozás</span><span id="abStage3">③ STOP · grafikus útiterv</span></div>
<p id="abStatus">Válassz A vagy B módot, majd az eredeti „Útvonal keresése” gombot. Léna új lapon nyílik, a stopper itt fut.</p>
<div class="ab-actions"><button id="abCancel" type="button" disabled>■ Mérés megszakítása</button><button id="abCopy" type="button">📋 Eredmények másolása</button></div>
<details class="ab-fallback"><summary>📥 Kézi TripPack JSON visszahozása, ha nincs felhőmentés</summary>
<textarea id="abManual" maxlength="60000" placeholder='{"schema":"sh9.trip-pack/1", ...}'></textarea>
<button id="abImport" type="button" disabled>Megjelenítés, kézi STOP</button>
</details>
<h4>Összehasonlító mérések</h4>
<div id="abHistory" class="ab-history">Még nincs lefutott keresés.</div>
<p class="ab-privacy">Az A/B eredmény csak ebben a böngészőfülben él. A teljes időt a keresőgomb megnyomásától a grafikus megjelenésig mérjük. A Supabase-t kizárólag meglévő Family Guard-jogosultsággal, olvasásra használjuk. A ChatGPT-ben szükség lehet a Küldés gombra.</p>
`;
form.after(bar);
// Keep the A/B selector ABOVE the prediction fields on narrow mobile screens.
// The detailed stopwatch remains below the original search form.
const abModeBar=bar.querySelector(".ab-arms");
abModeBar.classList.add("st22-alpha-modebar");
form.before(abModeBar);
const watchEl=$("abClock"),summary=$("abStatus"),historyEl=$("abHistory");
const selectedArm=()=>document.querySelector('input[name="abArm"]:checked')?.value||"legacy";
function say(s){summary.textContent=s}
function stage(step,text){
 $("abStage"+step).textContent=text;
}
function times(){
 const s=clock.snapshot();
 watchEl.textContent=ts(s.totalMs);
 return s;
}
function stopPolling(){
 if(poll)clearTimeout(poll);poll=null;
 if(ticker)clearInterval(ticker);ticker=null;
}
function lock(on){
 for(const id of ["st22From","st22To","st22Date","st22Time","st22Priority","st22SearchMethod","st22Swap","st22Profile"]){
  const input=$(id);if(input)input.disabled=on;
 }
 document.querySelectorAll("[data-st22-mode],input[name=abArm]").forEach(x=>x.disabled=on);
 $("abCancel").disabled=!on;
 $("abImport").disabled=!on;
 search.disabled=on;
}
function showHistory(){
 historyEl.replaceChildren();
 if(!history.length){historyEl.textContent="Még nincs lefutott keresés.";return}
 const table=node("table","",undefined,historyEl);
 const head=node("thead","",undefined,table),tr=node("tr","",undefined,head);
 for(const label of ["Mód","Teljes idő","Mentés","GTFS","Kimenet"])node("th","",label,tr);
 const body=node("tbody","",undefined,table);
 for(const s of history.slice(-8).reverse()){
  const r=node("tr","",undefined,body);
  for(const v of [s.arm==="legacy"?"A · Léna":"B · Super",ts(s.totalMs),
   s.cloudSaved?"igazolt":"nem",s.preparedCandidates+" jelölt",s.result])
    node("td","",v,r);
 }
 const latest=history[history.length-1]?.scenario;
 const a=history.filter(x=>x.scenario===latest&&x.arm==="legacy"&&x.cloudSaved);
 const b=history.filter(x=>x.scenario===latest&&x.arm==="super"&&x.cloudSaved);
 if(a.length&&b.length){
  const median=items=>{const t=items.map(x=>x.totalMs).sort((a,b)=>a-b);return t[Math.floor((t.length-1)/2)]};
  node("p","ab-delta","Automatikusan mentett A/B medián: A "+ts(median(a))+" · B "+ts(median(b))+
   " | ugyanaz a teljes keresési szcenárió (útvonal, dátum, idő, profil és preferencia).",historyEl);
 }
}
function record(result){
 if(!state)return;
 const v=clock.snapshot();
 history.push({arm:state.arm,totalMs:v.totalMs,cloudSaved:v.cloudSaved,
  preparedCandidates:state.candidates,preparationMs:state.prepareMs,
  promptChars:state.promptChars,scenario:state.scenario,result});
 if(history.length>8)history=history.slice(-8);
 showHistory();
}
function finish(result){
 if(!state||state.done)return;
 state.done=true;stopPolling();lock(false);times();
 record(result);
 const t=times();
 stage(3,(result==="auto"?"③ ✅ Automatikus STOP":"③ ⏱ Kézi STOP")+" · "+ts(t.totalMs));
 say(result==="auto"?"✅ Kész: a megfelelő profilhoz tartozó mentett útiterv kirajzolódott. Teljes idő: "+ts(t.totalMs):
 "⏱ Kézi JSON megjelenítve: "+ts(t.totalMs)+". Ez nem automatikus My Trips mentés.");
}
function failed(reason){
 if(!state||state.done)return;
 state.done=true;stopPolling();lock(false);
 if(clock.snapshot().state==="searching"||clock.snapshot().state==="cloud_found")clock.timeout();
 times();record(reason);
 stage(3,"③ Leállítva · nincs igazolt STOP");
 say(reason+". A normál Smart Trip kereső változatlan.");
}
function inputQuery(){
 const q={from:nval("st22From"),to:nval("st22To"),
  date:nval("st22Date"),time:nval("st22Time"),mode:mode()};
 const provider=window.SH9_SMART_TRIP_CHATGPT_V1076;
 return provider?.valid?.(q)?q:null;
}
function selectedPoints(q){
 // Alpha controller only. Original predictive selector remains authoritative.
 const points=window.SH9_SMART_TRIP_ALPHA_SELECTED_V1?.()||{};
 const accepted={};
 for(const [which,side,queryKey] of [["origin","origin","from"],["destination","destination","to"]]){
  const x=points[which];
  if(x?.name===q[queryKey]&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&
   x.lat>=45&&x.lat<=49&&x.lng>=16&&x.lng<=23)
   accepted[side]={name:x.name,lat:x.lat,lng:x.lng};
 }
 return accepted;
}
function getClient(){
 if(cloud)return cloud;
 const config=window.HH_CENTRAL_VAULT;
 if(!config?.enabled||!config?.supabaseUrl||!config?.publishableKey||
   typeof window.supabase?.createClient!=="function")return null;
 cloud=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{
  auth:{storageKey:"hh-guardian-family-auth-v785",persistSession:true,
   autoRefreshToken:false,detectSessionInUrl:false}
 });return cloud;
}
async function findCloud(s){
 const c=getClient();if(!c)return {status:"not_connected"};
 const {data:auth,error:authError}=await c.auth.getUser();
 if(authError||!auth?.user)return {status:"login_required"};
 const key=s.profile==="m"?"monika":"zsolt";
 const {data,error}=await c.from("hh_my_trip_packs")
  .select("profile_key,trip_id,trip_data")
  .eq("profile_key",key).eq("trip_id",s.id).maybeSingle();
 if(error)return {status:"read_error"};
 if(!data)return {status:"not_found"};
 if(data.profile_key!==key||data.trip_id!==s.id)return {status:"wrong_profile"};
 const raw=data.trip_data;
 if(!raw||raw.id!==s.id||!Number.isFinite(raw.savedAt))return {status:"invalid"};
 const route=window.SH9_SMART_TRIP_PACK_V1078?.normalize?.(raw);
 if(!route||route.travelDate!==s.query.date)return {status:"invalid"};
 return {status:"ok",route};
}
function drawRoute(route){
 const root=$("st22JourneyList"),pane=$("st22Results");
 if(!root||!pane)throw Error("missing_graphical_search");
 pane.hidden=false;root.replaceChildren();
 const card=node("article","st22-alpha-route",undefined,root);
 node("h3","",route.title,card);
 node("p","ab-route-summary",route.travelDate+" · "+route.from+" → "+route.to,card);
 node("div","ab-route-clock",(route.departure||"—")+" → "+(route.arrival||"—"),card);
 for(const leg of route.segments){
  const row=node("div","ab-route-leg",undefined,card);
  node("strong","",leg.line||leg.mode,row);
  node("p","",leg.from+" → "+leg.to,row);
  node("small","",(leg.departure||"—")+" – "+(leg.arrival||"—")+" · "+leg.status,row);
 }
 node("small","ab-route-warning","A mentés a profilhoz van rendelve; a menetrend önmagában nem élő járatállapot.",card);
 $("st22Source").textContent="Léna · RLS-igazolt, profilhoz kötött TripPack · A/B teszt";
 $("st22Status").textContent="✅ Útiterv megjelent. A stopper a grafikus kirajzolás után áll meg.";
}
async function pollCloud(token){
 if(!state||state.done||state.token!==token||waiting)return;
 waiting=true;
 const current=state;
 try{
  const found=await findCloud(current);
  if(!state||state!==current||state.done)return;
  if(found.status==="ok"){
   if(!clock.cloudObserved(current.id))return;
   stage(2,"② ✅ Felhőből olvasva · "+ts(clock.snapshot().cloudObservedMs));
   drawRoute(found.route);
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(state!==current||state.done)return;
    if(clock.displayed({id:current.id,method:"cloud"}))finish("auto");
   }));
  }else if(found.status==="login_required"){
   stage(2,"② ⚠️ Family Guard-bejelentkezés szükséges");
  }else if(found.status==="not_connected"){
   stage(2,"② ⚠️ Felhőkapcsolat hiányzik, automatikus STOP nincs");
  }else if(found.status==="invalid"||found.status==="wrong_profile"){
   stage(2,"② ⚠️ Elutasított, nem egyező TripPack");
  }
 }catch(_){if(state===current&&!state.done)stage(2,"② Átmeneti felhőolvasási hiba")}
 finally{
  waiting=false;
  if(state===current&&!state.done)poll=setTimeout(()=>void pollCloud(token),POLL_MS);
 }
}
function setRunning(){
 lock(true);stage(1,"① ▶ START · "+(state.arm==="legacy"?"jelenlegi Léna":"Super Search"));
 stage(2,"② My Trips felhőmentésre vár…");stage(3,"③ Útiterv grafikus visszaérkezésére vár…");
 ticker=setInterval(()=>{
  if(!state||state.done)return;
  const s=times();
  if(s.totalMs>=LIMIT){clock.timeout();failed("10 perces időkorlát");}
 },100);
 times();
}
async function prepLocal(q,token){
 if(state?.token!==token||state.done)return;
 if($("st22From").dataset.st22Chosen!=="vasút"||
  $("st22To").dataset.st22Chosen!=="vasút"){
  state.prepStatus="not_exact_rail_stations";return;
 }
 const start=performance.now();
 try{
  if(!rail)rail=createWorkerRailShadow();
  const broker=createSuperSearch();
  broker.register(createTripProvider({getExistingResults:rail.getExistingResults}));
  const data=await broker.search({domain:"travel",profile:state.profile,
   scopes:["travel:timetable"],query:{from:q.from,to:q.to,travelDate:q.date,
    time:q.time,mode:q.mode==="now"?"depart":q.mode},budgetMs:6500});
  if(state?.token!==token||state.done)return;
  state.candidates=data.items?.length||0;
  state.prepStatus=data.status;
  state.prepareMs=Math.round(performance.now()-start);
 }catch(_){
  if(state?.token===token&&!state.done)state.prepStatus="local_unavailable";
 }
}
async function launch(){
 if(state&&!state.done){say("Egy mérés már fut. Előbb állítsd le.");return}
 const q=inputQuery(),p=activeProfile(),arm=selectedArm(),base=q?
  window.SH9_SMART_TRIP_CHATGPT_V1076?.prompt?.(q,selectedPoints(q),
   nval("st22Priority"),p):null;
 if(!base||!crypto?.randomUUID){say("Hibás útvonal vagy hiányzó biztonságos keresésazonosító.");return}
 // A user gesture must synchronously open the target tab, otherwise the
 // browser's popup-blocker silently prevents the measured ChatGPT run.
 const popup=window.open("about:blank","_blank");
 if(!popup){say("A böngésző blokkolta a ChatGPT-lapot. Engedélyezd az új fület ehhez a tesztoldalhoz.");return}
 try{popup.opener=null}catch(_){}
 const id="tp-lena-"+crypto.randomUUID().replace(/-/g,"");
 const built=buildABPrompt({existingPrompt:base,id,arm});
 if(built.status!=="ready"){
  try{popup.close()}catch(_){}
  say("A kötelező útvonal-/mentési instrukciók nem fértek bele. Nem indult A/B mérés.");return;
 }
 const token=++serial;
 state={id,token,profile:p,arm,query:q,done:false,candidates:0,
  prepStatus:"not_requested",prepareMs:0,promptChars:built.bytes,
  scenario:scenarioKey(q,p,nval("st22Priority"))};
 try{clock.start({id,profile:p})}catch(_){
  popup.close();say("Nem sikerült elindítani a stoppert.");state=null;return
 }
 setRunning();
 say("⏱ START: "+(arm==="super"?"Helyi GTFS-előkészítés, majd Léna indítása…":
  "Jelenlegi Léna prompt átadása a ChatGPT-nek…"));
 if(arm==="super")await prepLocal(q,token);
 if(!state||state.token!==token||state.done){
  try{popup.close()}catch(_){}return;
 }
 const chat=new URL("https://chatgpt.com/");
 chat.searchParams.set("q",built.prompt);
 try{popup.location.replace(chat.href)}catch(_){
  failed("ChatGPT átadási hiba");return
 }
 say("⏱ Fut: "+(arm==="super"?"B · Super Search (GTFS helyben "+state.candidates+
  " jelölt, továbbítás nélkül, "+state.prepareMs+" ms)":"A · jelenlegi Léna")+
  ". A ChatGPT-ben szükség lehet a Küldés gombra; a stopper a grafikus STOP-ig fut.");
 $("st22Results").hidden=false;
 $("st22Status").textContent="⏱ Léna A/B keresés fut. A stopper és a felhőmentés ellenőrzése a keresőben látható.";
 poll=setTimeout(()=>void pollCloud(token),1000);
}
form.addEventListener("submit",event=>{
 if(method.value!=="chatgpt")return; // Other search engines unchanged.
 event.preventDefault();event.stopImmediatePropagation();
 void launch();
},true);
$("abCancel").addEventListener("click",()=>{
 if(!state||state.done)return;
 clock.cancel();failed("Felhasználó által megszakítva");
});
$("abImport").addEventListener("click",()=>{
 if(!state||state.done)return;
 try{
  const txt=nval("abManual"),route=window.SH9_SMART_TRIP_PACK_V1078.normalize(txt);
  if(route.travelDate!==state.query.date||route.from!==state.query.from||
   route.to!==state.query.to)throw Error("Nem a mért útvonal.");
  drawRoute(route);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(state&&!state.done&&clock.displayed({id:state.id,method:"manual"}))finish("manual");
  }));
 }catch(_){say("A kézi TripPack hiányos vagy nem a mért útvonalhoz tartozik. STOP nincs.")}
});
$("abCopy").addEventListener("click",()=>{
 const report=JSON.stringify({schema:"sho.ab-live-search/1",measured:"button_to_visual_route",
  runs:history},null,2);
 void navigator.clipboard.writeText(report).then(()=>say("📋 A/B idők másolva (útvonal- és profiladatok nélkül)."),
 ()=>say("A vágólap nem engedélyezett; a mérések itt láthatók."));
});
window.addEventListener("pagehide",stopPolling);
window.addEventListener("pageshow",()=>{if(state&&!state.done&&!ticker){
 ticker=setInterval(()=>{const s=times();if(s.totalMs>=LIMIT){clock.timeout();failed("Időtúllépés")}},200);
 poll=setTimeout(()=>void pollCloud(state.token),2000);
}});
window.SH9_SUPER_SEARCH_ALPHA_AB_V1=Object.freeze({enabled:true,version:"sho.ab-live-search/1",
 status:()=>({active:Boolean(state&&!state.done),arm:state?.arm||null,
 last:history.length?{...history[history.length-1]}:null})});
