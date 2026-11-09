/*
 * SHO V5 Google Routes API | INTEGRATED MAIN SMART TRIP EXPERIMENTAL MODE.
 * Uses the existing predictive fields, selected verified coordinates, local
 * Budapest date/time, and per-profile authentication. NO automatic Google
 * calls: user explicitly consents, runs a free diagnostic, then presses the
 * one billable-search button. Google data is NEVER given to AI or My Trips.
 */
import {buildV5Intake} from "./smart-trip-v5-intake.mjs";
import {evaluateIndependentBkk} from "./lena-independent-bkk-v1.mjs";
import {evaluateIndependentMav} from "./lena-independent-mav-v1.mjs";
const HOST="https://vhsrupphzcjkdrusonzh.supabase.co";
const ENDPOINT=HOST+"/functions/v1/hh-smart-trip-universal-v1";
const $=id=>document.getElementById(id);
let sb=null,context=null,busy=false,lenaBusy=false,ready=false,current=null;
const errors={
 invalid_input:"Hiányos vagy érvénytelen keresési adatok.",
 invalid_address:"Mindkét hely szükséges. Válassz pontos címjavaslatot vagy írj teljes címet.",
 same_origin_destination:"A kiindulási és célpont nem lehet azonos.",
 nonexistent_dst_time:"A megadott időpont az óraátállítás miatt nem létezik.",
 ambiguous_dst_time:"Az időpont kétszer fordul elő az óraátállításkor; válassz másikat.",
 time_in_past:"A kiválasztott időpont már elmúlt.",
 invalid_local_time:"Hibás dátum vagy időpont.",
 invalid_options:"Érvénytelen utazási mód.",
 invalid_time:"Google szerint érvénytelen vagy túl távoli időpont.",
 invalid_locations:"A Google Routes-kérés egyik helye érvénytelen.",
 unauthorized_profile:"Nincs jogosultság ehhez a családi profilhoz, vagy lejárt a bejelentkezés.",
 origin_denied:"A kiszolgáló nem engedélyezi ezt az oldalt.",
 universal_gateway_disabled:"Az API tesztidőablaka lejárt, vagy a Gateway ki van kapcsolva.",
 daily_one_run_or_quota_exceeded:"A mai egyszeri API-próbát már felhasználtuk. Új Google-hívás nem indult.",
 server_configuration_missing:"A szerveres Google- vagy Supabase-kulcs hiányzik.",
 google_http_error:"A Google Routes API visszautasította a kérést. A kvótafoglalás megtörténhetett.",
 google_network_or_timeout:"A Google Routes API időtúllépést vagy hálózati hibát jelzett.",
 google_invalid_response:"A Google nem adott feldolgozható útvonalválaszt.",
 google_response_too_large:"A Google válasza túl nagy volt."
};
const fmt=t=>{
 const ts=Date.parse(t);
 return Number.isFinite(ts)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).format(new Date(ts)):"—";
};
const text=(tag,value,parent,cls)=>{
 const n=document.createElement(tag);n.textContent=String(value??"");
 if(cls)n.className=cls;parent.append(n);return n;
};
const status=message=>{$("st22V5ApiStatus").textContent=message;};
function setButtons(){
 $("st22V5ApiDiagnose").disabled=busy;
 $("st22V5ApiSearch").disabled=busy||!ready;
 $("st22V5ApiConsent").disabled=busy;
 $("st22V5LenaEvaluate").disabled=busy||lenaBusy;
}
function clearResults(){
 $("st22V5ApiRoutes").hidden=true;
 $("st22V5ApiRoutes").replaceChildren();
}
function clearLena(){
 $("st22V5LenaResult").hidden=true;
 $("st22V5LenaResult").replaceChildren();
 $("st22V5LenaStatus").textContent="";
}
function cleanup(){
 current?.abort();current=null;context=null;ready=false;
 clearResults();clearLena();setButtons();
}
function authenticatedClient(){
 const cfg=globalThis.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||typeof cfg.publishableKey!=="string"||
  cfg.publishableKey.length<20||!globalThis.supabase?.createClient)
  throw Error("A Family Guard/Supabase bejelentkezési kapcsolat nem érhető el.");
 const u=new URL(cfg.supabaseUrl);
 if(u.origin!==HOST||u.pathname!=="/"||u.search||u.hash)
  throw Error("Nem megfelelő Supabase projekt.");
 if(!sb)sb=globalThis.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:"hh-guardian-family-auth-v785",persistSession:true,
   autoRefreshToken:false,detectSessionInUrl:false}
 });
 return {client:sb,key:cfg.publishableKey};
}
function renderRoutes(data){
 if(!data||data.schema!=="sho.smart-trip.universal-routes/1"||
  data.source!=="google_routes"||data.attribution!=="Google Maps"||
  data.presentation!=="map_free_text_only"||data.ai_processing!=="disabled"||
  data.save!==false||data.independentlyVerified!==false||
  data.googleRequests!==1||!Array.isArray(data.routes)||data.routes.length>4)
  throw Error("A Google-adatok formátuma nem felel meg a V5 biztonsági szerződésnek.");
 const root=$("st22V5ApiRoutes");root.replaceChildren();
 text("h3","Google Maps · előzetes tömegközlekedési alternatívák",root);
 if(!data.routes.length)text("p","A Google nem adott támogatott útvonalat ehhez az induláshoz.",root);
 data.routes.forEach((r,i)=>{
  if(!Number.isFinite(r?.durationSeconds)||!Array.isArray(r?.steps)||
   r.steps.length>45)return;
  const box=text("article","",root,"st22-v5-route");
  text("strong",(i+1)+". Google-alternatíva · "+Math.ceil(r.durationSeconds/60)+" perc",box);
  for(const step of r.steps){
   if(step?.kind==="walk"&&Number.isFinite(step.meters))
    text("p","🚶 Gyaloglás: "+step.meters+" m",box);
   else if(step?.kind==="transit")
    text("p","🚆 "+(step.line||"Járat")+" · "+step.from+" "+fmt(step.departure)+
     " → "+step.to+" "+fmt(step.arrival)+
     (step.agency?" · "+step.agency:""),box);
  }
 });
 text("small","Forrás: Google Maps · térkép nélküli megjelenítés. "+
  "Nem ellenőrzött szolgáltatói menetrend, nem Léna A terve és nincs My Trips mentés.",root);
 root.hidden=false;
}
async function execute(mode){
 if(busy||lenaBusy||!context)return;
 if(!$("st22V5ApiConsent").checked){
  status("Az API-diagnózis és az útvonalkeresés előtt jelöld be az adatok átadását.");return;
 }
 if(mode==="search"&&!ready){status("Először futtasd a költségmentes kapcsolatellenőrzést.");return;}
 const snapshot=context;
 busy=true;ready=false;clearResults();clearLena();setButtons();
 const controller=new AbortController();current=controller;
 const start=performance.now();
 const timer=setTimeout(()=>controller.abort(),29000);
 const clock=setInterval(()=>{
  $("st22V5ApiClock").textContent=((performance.now()-start)/1000).toFixed(2).replace(".",",")+" mp";
 },75);
 let authTimer;
 try{
  status(mode==="diagnose"?"🔍 Kapcsolatellenőrzés: 0 fizetős Google API-hívás...":
   "🔎 Valódi Google Routes-keresés: maximum 1 kvótafoglalás...");
  const credentials=authenticatedClient();
  const session=await Promise.race([
   credentials.client.auth.getSession(),
   new Promise((_,reject)=>{authTimer=setTimeout(()=>reject(Error(
    "A Family Guard bejelentkezés nem válaszolt 8 másodpercen belül.")),8000)})
  ]);
  clearTimeout(authTimer);authTimer=null;
  if(controller.signal.aborted)throw Error("A keresési időkeret lejárt.");
  if(session.error||!session.data?.session?.access_token)
   throw Error("Jelentkezz be ebben a böngészőben a Family Guardba.");
  const response=await fetch(ENDPOINT,{
   method:"POST",signal:controller.signal,credentials:"omit",cache:"no-store",
   redirect:"error",headers:{"Content-Type":"application/json",
    "Authorization":"Bearer "+session.data.session.access_token,
    "apikey":credentials.key},
   body:JSON.stringify({mode,consent:true,query:snapshot.query})
  });
  const raw=await response.text();
  if(raw.length>200000)throw Error("A szerver túl nagy választ adott.");
  let result;
  try{result=JSON.parse(raw)}catch{throw Error("A szerver érvénytelen JSON-választ küldött.")}
  if(!response.ok)
   throw Error(errors[result?.error]||"HTTP "+response.status+" · API-kérés sikertelen.");
  if(context!==snapshot||!$("st22V5ApiDialog").open)return;
  if(mode==="diagnose"){
   if(result?.schema!=="sho.smart-trip.universal-diagnostic/1"||
    result.googleRequests!==0||result.quotaReserved!==0||
    result.paidProviderContacted!==false)
    throw Error("Hibás diagnosztikai válasz.");
   ready=result.ready===true;
   status(ready?"✅ API-kapcsolat ellenőrizve. A külön Google-keresőgombbal "+
    "egyetlen valódi, kvótázott hívás indítható.":
    "🔒 A Google-keresés most nem indítható: ellenőrizd a bejelentkezést, "+
    "a szerverengedélyeket és a tesztidőablakot.");
  }else{
   renderRoutes(result);
   status("✅ A Google Routes API válasza megérkezett. Nincs automatikus AI-feldolgozás vagy mentés.");
  }
 }catch(e){
  if(context===snapshot&&$("st22V5ApiDialog").open)
   status("⚠️ "+(controller.signal.aborted?
    "A teljes kérés megszakadt a 29 mp-es időkorlátnál. A kvóta már fogyhatott.":
    e?.message||"A keresés sikertelen."));
 }finally{
  if(authTimer)clearTimeout(authTimer);
  clearTimeout(timer);clearInterval(clock);
  $("st22V5ApiClock").textContent=((performance.now()-start)/1000).toFixed(2).replace(".",",")+" mp";
  if(current===controller)current=null;
  busy=false;setButtons();
 }
}
async function runIndependentLena(){
 if(busy||lenaBusy||!context)return;
 const snapshot=context,dialog=$("st22V5ApiDialog");
 const root=$("st22V5LenaResult");
 lenaBusy=true;clearResults();clearLena();setButtons();
 $("st22V5LenaStatus").textContent=
  "✨ Léna: független menetrendi ellenőrzés, 0 Google-hívás, 0 LLM-hívás…";
 try{
  const q=snapshot.query;
  const input={from:q.origin.label,to:q.destination.label,
   mode:q.mode,date:q.date,time:q.time};
  const request={...input,when:q.when,profile:q.profile,priority:q.priority};
  let ranked=null,provider=null,engine=null;
  // BKK candidate discovery is independent of Google. Skip the BKK search
  // quota if the supplied full names are not official routable pilot stops.
  engine=globalThis.SH9_BKK_SEARCH_V1107;
  if(engine?.load&&engine?.search&&engine?.suggestions){
   try{
    await engine.load();
    if(context!==snapshot||!dialog.open)return;
    const norm=s=>String(s||"").normalize("NFD")
     .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("hu-HU")
     .replace(/\s+/g," ").trim();
    const covered=name=>engine.suggestions(name).some(x=>
     x.routable===true&&norm(x.name)===norm(name));
    if(covered(input.from)&&covered(input.to)){
     const response=await engine.search(input,q.when);
     if(response?.status==="ok"){
      const evaluated=evaluateIndependentBkk(response,request);
      if(evaluated.status==="ok"){ranked=evaluated;provider="bkk";}
     }
    }
   }catch{} // On invalid BKK feed, try independently verified local MÁV.
  }
  if(!ranked){
   // Private MÁV GTFS remains on this DEVICE, never uploaded to a model or
   // to Supabase. The controller already validates its source and rights.
   const controller=globalThis.SH9_SMART_TRIP_AI_V1022;
   const rail=globalThis.SH9_MAV_GTFS_CORE_V1;
   if(controller?.loadRailData&&rail?.validate&&rail?.route){
    let raw=null;
    try{raw=await Promise.race([
     controller.loadRailData(),
     new Promise(resolve=>setTimeout(()=>resolve(null),7000))
    ])}catch{}
    if(context!==snapshot||!dialog.open)return;
    if(raw&&rail.validate(raw,{allowPrivate:true})&&raw.rightsConfirmed===false&&
     raw.localOnly===true&&/m[aá]v|vas[uú]t|rail/i.test(raw.source||"")){
     let data=null;
     try{data=rail.route(raw,{...input,when:q.when},
      {limit:30,maxTransfers:1,localOnly:true,ranking:"recommended"})}catch{}
     if(data?.status==="ok"){
      const evaluated=evaluateIndependentMav(data,raw,request);
      if(evaluated.status==="ok"){ranked=evaluated;provider="mav";}
     }
    }
   }
  }
  if(context!==snapshot||!dialog.open)return;
  if(!ranked){
   $("st22V5LenaStatus").textContent=
    "ⓘ Erre a cím- és időpontpárra nincs függetlenül ellenőrzött "+
    "BKK vagy helyi MÁV útvonal. Az országos Volán/MÁV és a teljes "+
    "ajtótól ajtóig integráció még hiányzik. Google-útvonalat nem "+
    "adunk át Lénának, és nem találunk ki járatot.";
   return;
  }
  const pick=ranked.aPlan;
  const label=provider==="bkk"?"BKK Zrt. CC BY 4.0":"Privát MÁV GTFS";
  text("h3","✨ Léna A terve · "+label,root);
  const lines=pick.item.legs.map(x=>provider==="bkk"?x.line:x.service).join(" → ");
  text("p",(provider==="bkk"?"🚋 ":"🚆 ")+lines+
   " · "+fmt(pick.departure)+" → "+fmt(pick.arrival)+
   " · "+pick.minutes+" perc",root);
  text("p","Átszállások: "+pick.transfers+
   (pick.transfers?" · menetrendi csatlakozás: "+pick.transferMinutes+" perc":""),root);
  ranked.warnings.forEach(w=>text("p","ⓘ "+w,root));
  text("small","Léna helyi szabályalapú értékelő · nem LLM, nem Google Routes-adat. "+
   ranked.alternativesEvaluated+" önálló menetrendi találatot hasonlított össze.",root);
  if(provider==="bkk"){
   const save=text("button","💾 Ezt a BKK A tervet mentem a My Tripsbe",root);
   save.type="button";save.className="secondary";
   save.addEventListener("click",async()=>{
    let nowProfile="z";
    try{nowProfile=globalThis.localStorage?.getItem("hh-profile")==="m"?"m":"z"}
    catch{nowProfile="unknown"}
    if(context!==snapshot||!dialog.open||lenaBusy||nowProfile!==q.profile){
     $("st22V5LenaStatus").textContent=
      "A profil vagy a keresés megváltozott. Új ellenőrzés szükséges.";
     return;
    }
    save.disabled=true;
    save.textContent="🔐 Ellenőrzés és felhőmentés…";
    let saved;
    try{saved=await engine.save(pick.item,q.profile)}
    catch{saved={status:"save_failed"}}
    if(context!==snapshot||!dialog.open)return;
    if(saved?.status==="saved"){
     save.textContent="✓ Mentve";
     $("st22V5LenaStatus").textContent=
      "✅ Az ellenőrzött BKK A terv igazoltan mentve a My Tripsbe.";
    }else{
     save.textContent="💾 Mentés újrapróbálása";
     save.disabled=false;
     $("st22V5LenaStatus").textContent=
      "⚠️ A My Trips mentés nem igazolt: "+String(saved?.status||"ismeretlen hiba");
    }
   });
  }
  root.hidden=false;
  $("st22V5LenaStatus").textContent=
   "✅ Egy független menetrendi A terv kiválasztva. "+
   (ranked.provisional?"A csatlakozás / gyaloglás külön ellenőrizendő.":
    "Közvetlen menetrendi kapcsolat.")+
   " Nincs Google → AI adatátadás.";
 }catch(e){
  if(context===snapshot&&dialog.open)
   $("st22V5LenaStatus").textContent=
    "⚠️ "+String(e?.message||"A független adatforrás nem működik.");
 }finally{
  lenaBusy=false;setButtons();
 }
}
function open(payload){
 const result=buildV5Intake(payload);
 if(result.status!=="ok")return {status:result.status,
  message:errors[result.status]||"Érvénytelen V5 cím-/időpontadat."};
 if(busy||lenaBusy)return {status:"busy",message:"Már fut egy V5 kérés."};
 const dialog=$("st22V5ApiDialog");
 if(!dialog?.showModal)return {status:"unavailable",message:"A V5 eredményablak nem érhető el."};
 cleanup();
 context=result;
 $("st22V5ApiConsent").checked=false;
 $("st22V5ApiClock").textContent="0,00 mp";
 const q=result.query,details=$("st22V5ApiSummary");
 details.replaceChildren();
 const spot=(item,selected)=>item.label+(selected?" · 📍 kiválasztott koordináta":" · szöveges cím");
 text("p","Honnan: "+spot(q.origin,result.selected.origin),details);
 text("p","Hová: "+spot(q.destination,result.selected.destination),details);
 text("p",(q.mode==="arrive"?"Érkezés":"Indulás")+": "+q.date+" "+q.time+
  " (Budapest) · szervernek: "+q.when,details);
 text("p","Profil: "+(q.profile==="m"?"Mónika":"Zsolt")+
  " · szempont: "+q.priority,details);
 status("Az adatok átvéve a Smart Trip prediktív keresőjéből. "+
  "Pipáld ki a hozzájárulást, majd ellenőrizd a szervert (ingyenes). "+
  "A Google-hívás külön gombnyomással indul.");
 setButtons();
 dialog.showModal();
 return {status:"ready"};
}
function init(){
 if(!$("st22V5ApiDialog"))return;
 $("st22V5ApiClose").addEventListener("click",()=>{
  $("st22V5ApiDialog").close();
 });
 $("st22V5ApiDialog").addEventListener("close",cleanup);
 $("st22V5ApiDiagnose").addEventListener("click",()=>{void execute("diagnose")});
 $("st22V5ApiSearch").addEventListener("click",()=>{void execute("search")});
 $("st22V5LenaEvaluate").addEventListener("click",()=>{void runIndependentLena()});
 $("st22V5ApiConsent").addEventListener("change",()=>{
  if(!$("st22V5ApiConsent").checked)ready=false;
  setButtons();
 });
 globalThis.SH9_SMART_TRIP_V5_API=Object.freeze({open});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
