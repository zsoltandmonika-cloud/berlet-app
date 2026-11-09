/* SHO V5 universal gateway UI. NO calls on page-load.
 * One explicit diagnostic / one separate consented search, only if the server
 * reports 3 independent approvals. No Google content is sent to an LLM.
 */
import {normalizeUniversalQuery} from "./universal-request.mjs";
const $=id=>document.getElementById(id);
const HOST="https://vhsrupphzcjkdrusonzh.supabase.co";
const ENDPOINT=HOST+"/functions/v1/hh-smart-trip-universal-v1";
const LABELS={
 unauthorized_profile:"A profilhoz nincs jogosultság vagy lejárt a bejelentkezés.",
 universal_gateway_disabled:"A fizetős Google-keresés még nincs engedélyezve.",
 daily_one_run_or_quota_exceeded:"A napi próbakeret elfogyott. Új Google-kérés nem indult.",
 server_configuration_missing:"A szerver konfigurációja hiányos. Google-kérés nem indult.",
 google_network_or_timeout:"A Google nem válaszolt időben. A kvótafoglalás megtörténhetett.",
 google_http_error:"A Google visszautasította a lekérdezést.",
 invalid_locations:"A cím vagy GPS-koordináta érvénytelen.",
 invalid_time:"Az időpont hibás vagy kívül esik a Google időablakán.",
 origin_denied:"Ez az oldal nem jogosult a szerver használatára."
};
let supabaseClient=null,verified=false,running=false,active=null;
function state(msg){$("gateway-status").textContent=msg}
function invalidate(){
 verified=false;$("gateway-search").disabled=true;
 $("gateway-results").hidden=true;$("gateway-results-content").replaceChildren();
 if(!running)state("A keresési adatok megváltoztak. A kapcsolatot újra ellenőrizni kell.");
}
function query(){
 const raw={from:$("from").value,to:$("to").value,mode:$("mode").value,
  date:$("day").value,time:$("time").value,profile:$("profile").value,
  priority:$("priority").value};
 return normalizeUniversalQuery(raw);
}
function client(){
 const cfg=globalThis.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||typeof cfg.publishableKey!=="string"||
  cfg.publishableKey.length<20||!globalThis.supabase?.createClient)return null;
 let url;
 try{url=new URL(cfg.supabaseUrl)}catch{return null}
 if(url.origin!==HOST||url.pathname!=="/"||url.search||url.hash)return null;
 if(!supabaseClient)supabaseClient=globalThis.supabase.createClient(cfg.supabaseUrl,
  cfg.publishableKey,{auth:{storageKey:"hh-guardian-family-auth-v785",
   persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
 return {client:supabaseClient,key:cfg.publishableKey};
}
const show=(tag,txt,parent,cls)=>{
 const el=document.createElement(tag);el.textContent=String(txt??"");
 if(cls)el.className=cls;parent.appendChild(el);return el;
};
const hu=t=>{
 const v=Date.parse(t);
 return Number.isFinite(v)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).format(new Date(v)):"ismeretlen idő";
};
function render(payload){
 if(payload.schema!=="sho.smart-trip.universal-routes/1"||
  payload.source!=="google_routes"||payload.attribution!=="Google Maps"||
  payload.presentation!=="map_free_text_only"||
  payload.ai_processing!=="disabled"||payload.save!==false||
  payload.independentlyVerified!==false||!Array.isArray(payload.routes)||
  payload.routes.length>4||payload.googleRequests!==1)
  throw Error("A szerver válasza nem felel meg a Google-adatkezelési szerződésnek.");
 // EEA: no Google route content displayed with, next to, or linked to any map.
 $("maps").hidden=true;
 const root=$("gateway-results-content");root.replaceChildren();
 show("strong","Google Maps · előzetes tömegközlekedési útvonalak",root);
 if(!payload.routes.length)
  show("p","A Google erre a cím- és időpontpárra nem adott támogatott útvonalat.",root);
 payload.routes.forEach((route,i)=>{
  if(!route||!Number.isFinite(route.durationSeconds)||
   !Array.isArray(route.steps)||route.steps.length>45)return;
  const panel=show("article","",root,"result");
  show("h3","Google Maps útvonal "+(i+1),panel);
  show("p","Google szerint: "+Math.ceil(route.durationSeconds/60)+" perc",panel);
  for(const step of route.steps){
   if(step.kind==="walk"&&Number.isFinite(step.meters))
    show("p","🚶 Gyaloglás: "+step.meters+" m",panel);
   if(step.kind==="transit")
    show("p","🚆 "+(step.line||"Járat")+" · "+step.from+
     " "+hu(step.departure)+" → "+step.to+" "+hu(step.arrival)+
     (step.agency?" · "+step.agency:""),panel);
  }
 });
 show("p","A címfeloldás még nincs külön visszaigazolva. A Google-adat nem "+
  "függetlenül ellenőrzött menetrend, nem Léna AI-ajánlás, és nincs My Trips mentés.",root);
 $("gateway-results").hidden=false;
}
async function execute(mode){
 if(running)return;
 if(!$("gateway-consent").checked){
  state("Jelöld be az egyértelmű hozzájárulást a címek szerveres feldolgozásához.");return;
 }
 const normalized=query();
 if(normalized.status!=="ok"){
  state("A cím vagy időpont nem érvényes: "+normalized.status);return;
 }
 if(mode==="search"&&!verified){
  state("Előbb futtasd a költségmentes szerverellenőrzést.");return;
 }
 running=true;active=new AbortController();
 const control=active,started=performance.now();
 $("gateway-diagnose").disabled=true;$("gateway-search").disabled=true;
 $("gateway-results").hidden=true;
 const deadline=setTimeout(()=>control.abort(),29_000);
 const ticker=setInterval(()=>{
  $("gateway-clock").textContent=((performance.now()-started)/1000).toFixed(2).replace(".",",")+" mp";
 },75);
 let authTimer=null;
 try{
  state(mode==="diagnose"?"A szerver állapotának ellenőrzése: 0 Google-kérés...":
   "Google Routes: egy engedélyezett keresés, teljes 30 mp időkorláttal...");
  const c=client();
  if(!c)throw Error("A Family Guard bejelentkezési kapcsolata nem elérhető.");
  const result=await Promise.race([
   c.client.auth.getSession(),
   new Promise((_,reject)=>{authTimer=setTimeout(()=>reject(Error(
    "A bejelentkezés nem válaszolt 8 másodpercen belül.")),8_000)})
  ]);
  clearTimeout(authTimer);authTimer=null;
  if(control.signal.aborted)throw Error("Lejárt az időkorlát.");
  const session=result?.data?.session;
  if(result?.error||!session?.access_token||!session.user?.id)
   throw Error("Jelentkezz be ugyanebben a böngészőben a Family Guardba.");
  const response=await fetch(ENDPOINT,{
   method:"POST",signal:control.signal,credentials:"omit",cache:"no-store",
   redirect:"error",headers:{"Content-Type":"application/json",
    "Authorization":"Bearer "+session.access_token,"apikey":c.key},
   body:JSON.stringify({mode,consent:true,query:normalized.query})
  });
  const raw=await response.text();
  if(raw.length>200_000)throw Error("A szerver túlméretes választ adott.");
  let data=null;
  try{data=JSON.parse(raw)}catch{}
  if(!response.ok){
   const code=data?.error;
   throw Error((LABELS[code]||"Szerverhiba HTTP "+response.status)+
    " [HTTP "+response.status+"].");
  }
  if(mode==="diagnose"){
   if(data?.schema!=="sho.smart-trip.universal-diagnostic/1"||
    data.googleRequests!==0||data.quotaReserved!==0||
    data.paidProviderContacted!==false)throw Error("Érvénytelen diagnosztikai válasz.");
   verified=data.ready===true;
   $("gateway-search").disabled=!verified;
   state(verified?"✅ A szerver működik, a három biztonsági engedély aktív. "+
    "A felhasználó által engedélyezett napi 1 Google-kérés külön kattintással indítható.":
    "🔒 A Google Routes API nem áll rendelkezésre ezen a profilon vagy a szerver konfigurációja hiányos. "+
    "Diagnosztika: 0 Google-hívás, 0 kvótafoglalás.");
  }else{
   verified=false;
   render(data);
   state("✅ A Google Maps Routes-válasz beérkezett. "+
    "Nem történt AI-feldolgozás vagy mentés.");
  }
 }catch(e){
  verified=false;
  $("maps").hidden=true;
  state("⚠️ "+(control.signal.aborted?
   "A teljes keresés 29 másodperces biztonsági határnál megszakadt.":
   e?.message||"A kapcsolat nem sikerült."));
 }finally{
  if(authTimer!==null)clearTimeout(authTimer);
  clearTimeout(deadline);clearInterval(ticker);
  $("gateway-clock").textContent=((performance.now()-started)/1000).toFixed(2).replace(".",",")+" mp";
  active=null;running=false;
  $("gateway-diagnose").disabled=false;
  $("gateway-search").disabled=!verified;
 }
}
$("gateway-diagnose").addEventListener("click",()=>{void execute("diagnose")});
$("gateway-search").addEventListener("click",()=>{void execute("search")});
for(const id of ["from","to","day","time","mode","priority","profile"]){
 $(id).addEventListener("input",invalidate);
 $(id).addEventListener("change",invalidate);
}
// The free Google Maps handoff must never coexist with displayed Google
// Routes content under EEA map-free usage restrictions.
for(const action of ["prepare","swap","my-location"])
 $(action).addEventListener("click",invalidate);
$("gateway-consent").addEventListener("change",()=>{if(!$("gateway-consent").checked)invalidate()});
