/*
 * SHO Smart Trip V5 · One-click, inline Google Routes DEV testing.
 * Product owner explicitly authorized removing the per-search consent sheet
 * on 2026-11-09. Selecting the V5 provider and pressing "Útvonal keresése"
 * is the user-initiated request, NOT a background/typing/automatic API call.
 * Does not forward Google content to an AI, save it, or mix with private GTFS.
 * Google Cloud may bill for each intentional search; server logs usage.
 */
import {buildV5Intake} from "./smart-trip-v5-intake.mjs";
import {summarizeGoogleWalks,walkSectionLabel} from "./google-walk-summary-v1.mjs";
const HOST="https://vhsrupphzcjkdrusonzh.supabase.co";
const ENDPOINT=HOST+"/functions/v1/hh-smart-trip-universal-v1";
const ERRORS=Object.freeze({
 unauthorized_profile:"A választott profil nincs hitelesítve. Jelentkezz be a Family Guardba.",
 origin_denied:"A szerver nem engedélyezi a weboldal címét.",
 development_usage_accounting_unavailable:"A felhasználás naplózása nem elérhető, így nem indítottunk Google-keresést.",
 server_configuration_missing:"A Google API szerverbeállítása hiányzik.",
 google_http_error:"A Google Routes API elutasította a kérést.",
 google_network_or_timeout:"A Google Routes nem válaszolt időben.",
 google_invalid_response:"Nem érkezett feldolgozható Google-útvonal.",
 google_response_too_large:"A Google válasza túl nagy.",
 invalid_time:"Az indulási időpontot a Google nem fogadta el.",
 universal_gateway_disabled:"A Google Routes átmenetileg nem érhető el.",
 invalid_locations:"A kiválasztott cím vagy koordináta hibás."
});
const $=id=>document.getElementById(id);
const fmt=stamp=>{
 const ms=Date.parse(stamp);
 return Number.isFinite(ms)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).format(new Date(ms)):"—";
};
const item=(tag,parent,text,cls)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 el.textContent=String(text??"");
 parent.append(el);
 return el;
};
const refs=()=>({
 container:$("st22Results"),rows:$("st22JourneyList"),source:$("st22Source"),
 status:$("st22Status"),search:$("st22Search")
});
let active=null,serial=0,client=null;
function credentials(){
 const cfg=globalThis.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||typeof cfg.publishableKey!=="string"||
  cfg.publishableKey.length<20||typeof cfg.supabaseUrl!=="string"||
  !globalThis.supabase?.createClient)
  throw Error("A Family Guard/Supabase kapcsolat nem érhető el.");
 const url=new URL(cfg.supabaseUrl);
 if(url.origin!==HOST||url.pathname!=="/"||url.search||url.hash)
  throw Error("Nem megfelelő Supabase projekt.");
 if(!client)client=globalThis.supabase.createClient(cfg.supabaseUrl,
  cfg.publishableKey,{auth:{storageKey:"hh-guardian-family-auth-v785",
   persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
 return {db:client,key:cfg.publishableKey};
}
function cancel(){
 ++serial;
 if(active)active.abort();
 active=null;
 const {search}=refs();
 if(search)search.disabled=false;
}
function render(data,refsSnapshot){
 if(data?.schema!=="sho.smart-trip.universal-routes/1"||
  data?.source!=="google_routes"||data?.attribution!=="Google Maps"||
  data?.presentation!=="map_free_text_only"||data?.ai_processing!=="disabled"||
  data?.save!==false||data?.independentlyVerified!==false||
  data?.googleRequests!==1||!Array.isArray(data.routes)||data.routes.length>4)
  throw Error("A Google-válasz nem felel meg a Smart Trip szerződésének.");
 const {rows,status,source,container}=refsSnapshot;
 rows.replaceChildren();
 source.textContent="Google Maps · Routes API · előzetes útvonalak";
 if(!data.routes.length){
  status.textContent="A Google nem talált megfelelő tömegközlekedési útvonalat.";
  return;
 }
 let shown=0;
 data.routes.forEach((route,i)=>{
  const summary=summarizeGoogleWalks(route);
  if(!summary)return;
  const card=document.createElement("details");
  card.className="st22-v5-inline-route";
  card.open=i===0;
  const headline=document.createElement("summary");
  headline.textContent=(i+1)+". Google-útvonal · "+
   Math.ceil(route.durationSeconds/60)+" perc · "+
   summary.totalWalkMeters+" m séta · "+summary.transfers+" átszállás";
  card.append(headline);
  const steps=item("div",card,"","st22-v5-inline-steps");
  for(const part of summary.items){
   if(part.kind==="walk"){
    item("p",steps,"🚶 "+walkSectionLabel(part.phase)+": "+part.meters+" m");
   }else{
    const t=part.step;
    item("p",steps,"🚉 "+(t.line||"Járat")+" · "+t.from+" "+fmt(t.departure)+
     " → "+t.to+" "+fmt(t.arrival)+(t.agency?" · "+t.agency:""));
   }
  }
  rows.append(card);
  shown++;
 });
 if(!shown)throw Error("A Google-válasz nem tartalmaz ellenőrizhető utazási szakaszokat.");
 status.textContent="✅ "+shown+" Google-útvonal érkezett. Az első részletesen nyitva van, "+
  "a többi összecsukva. A gyaloglás összevont, a méterek megmaradtak.";
 item("p",rows,"Forrás: Google Maps · térkép nélküli megjelenítés. "+
  "Előzetes szolgáltatói útvonal, nem Léna AI ajánlása; My Trips mentés nincs.",
  "st22-v5-inline-source");
 container.hidden=false;
}
async function run(query,token,controller){
 const nodes=refs(),started=performance.now();
 let sessionClock=null;
 const abortClock=setTimeout(()=>controller.abort(),29000);
 try{
  const {db,key}=credentials();
  const session=await Promise.race([
   db.auth.getSession(),
   new Promise((_,reject)=>{sessionClock=setTimeout(()=>
    reject(Error("A Family Guard belépés nem válaszolt.")),8000);})
  ]);
  if(sessionClock)clearTimeout(sessionClock);
  if(token!==serial||controller.signal.aborted)return;
  if(session?.error||!session?.data?.session?.access_token)
   throw Error("A kereséshez jelentkezz be a Family Guardba.");
  const response=await fetch(ENDPOINT,{
   method:"POST",signal:controller.signal,redirect:"error",
   cache:"no-store",credentials:"omit",
   headers:{"Content-Type":"application/json",
    "Authorization":"Bearer "+session.data.session.access_token,
    "apikey":key},
   // The owner's explicit consent is embodied in their deliberate V5
   // provider selection and search-button click, not a prechecked checkbox.
   body:JSON.stringify({mode:"search",consent:true,query})
  });
  const responseText=await response.text();
  if(responseText.length>200000)throw Error("A szerver válasza túl nagy.");
  let data;
  try{data=JSON.parse(responseText)}
  catch{throw Error("A szerver érvénytelen választ adott.");}
  if(!response.ok)throw Error(ERRORS[data?.error]||"HTTP "+response.status+
   " · a Google Routes-kérés sikertelen.");
  if(token!==serial||controller.signal.aborted)return;
  render(data,nodes);
  nodes.status.textContent+=" · "+((performance.now()-started)/1000)
   .toFixed(1).replace(".",",")+" mp.";
 }catch(e){
  if(token!==serial)return;
  nodes.rows.replaceChildren();
  nodes.status.textContent="⚠️ "+(controller.signal.aborted?
   "A Google Routes keresése megszakadt. Ha az API már elindult, a szolgáltató számlázhatja.":
   String(e?.message||"A keresés sikertelen."));
 }finally{
  if(sessionClock)clearTimeout(sessionClock);
  clearTimeout(abortClock);
  if(active===controller){active=null;nodes.search.disabled=false;}
 }
}
function open(payload){
 const prepared=buildV5Intake(payload);
 if(prepared.status!=="ok")return {status:prepared.status,
  message:"A V5 kereséshez érvényes címeket, dátumot és időpontot válassz."};
 const nodes=refs();
 if(!nodes.rows||!nodes.container||!nodes.status||!nodes.source||!nodes.search)
  return {status:"unavailable",message:"A Smart Trip beépített eredménynézete hiányzik."};
 if(active)return {status:"started"}; // Ignore double click, never double-bill.
 const token=++serial;
 const controller=new AbortController();active=controller;
 nodes.container.hidden=false;
 nodes.rows.replaceChildren();
 nodes.source.textContent="Google Maps · Routes API · fejlesztői keresés";
 nodes.status.textContent="🔎 Google Routes API keresés folyamatban…";
 nodes.search.disabled=true;
 // No preliminary diagnose, dialog, auto-click or background retry.
 void run(prepared.query,token,controller);
 nodes.container.scrollIntoView?.({behavior:"smooth",block:"nearest"});
 return {status:"started"};
}
function init(){
 // Changing the input or provider invalidates any pending request. The
 // provider request may still be billed after a client-side abort.
 for(const id of ["st22From","st22To","st22Date","st22Time",
  "st22Priority","st22SearchMethod","st22Profile"]){
  const el=$(id);if(!el)continue;
  el.addEventListener(id==="st22Profile"?"click":"change",cancel);
  if(["st22From","st22To"].includes(id))el.addEventListener("input",cancel);
 }
 // Override the legacy dialog interface. It stays dormant for prior QA
 // compatibility; no intermediate test sheet opens for V5.
 globalThis.SH9_SMART_TRIP_V5_API=Object.freeze({open,cancel,mode:"inline_one_click"});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
