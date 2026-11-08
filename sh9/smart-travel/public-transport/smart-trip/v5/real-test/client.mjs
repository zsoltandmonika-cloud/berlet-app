/* Smart Trip V5 · REAL user-triggered Google Routes audit.
 * Only 3 server-side provider preferences; no Google API key in browser.
 * No map, no Google-content-to-AI forwarding, no My Trips write.
 */
import {evaluate,lenaSummary} from "./engine.mjs";
const $=id=>document.getElementById(id);
const PROJECT_ORIGIN="https://vhsrupphzcjkdrusonzh.supabase.co";
const ENDPOINT=PROJECT_ORIGIN+"/functions/v1/hh-smart-trip-real-pilot-v1";
let active=false,alreadyRun=false,client=null;
const show=(id,text)=>{$(id).textContent=text};
const node=(tag,text,parent,cls="")=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 el.textContent=String(text??"");parent.appendChild(el);return el;
};
const hu=iso=>{
 const time=Date.parse(iso||"");
 return Number.isFinite(time)?new Intl.DateTimeFormat("hu-HU",{
  timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",
  hourCycle:"h23"}).format(new Date(time)):"—";
};
function authClient(){
 const cfg=globalThis.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||typeof cfg.publishableKey!=="string"||
  cfg.publishableKey.length<20||!globalThis.supabase?.createClient)
  return null;
 const u=new URL(cfg.supabaseUrl);
 if(u.origin!==PROJECT_ORIGIN||u.pathname!=="/"||u.search||u.hash)return null;
 if(!client)client=globalThis.supabase.createClient(cfg.supabaseUrl,
  cfg.publishableKey,{auth:{storageKey:"hh-guardian-family-auth-v785",
   persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
 return {client,key:cfg.publishableKey};
}
function output(data,priority,elapsed){
 const result=evaluate(data,priority);
 if(!result)throw Error("Nem ellenőrizhető a szerver válasza. Nincs érvényes A terv.");
 $("out").hidden=false;
 const cover=$("coverage");cover.replaceChildren();
 result.providerReports.forEach(r=>{
  const card=node("article","",cover);
  node("strong",r.provider,card);
  node("div",(r.seen?"✓ ":"? ")+r.note,card,
    r.seen?"good":"warn");
 });
 $("variants").replaceChildren();
 const variants=result.variantReports.map(v=>v.id+": "+v.status+
  " ("+v.count+" alternatíva)").join(" · ");
 node("p","Google-kérések: "+result.googleRequests+
  " · Kvótafoglalások: "+result.quotaReserved+
  " · Keresések: "+variants,$("variants"),"meta");
 if(result.errors.length)node("p","Nem sikerült minden keresési profil: "+
  result.errors.join("; "),$("variants"),"warn");
 show("story",lenaSummary(result,priority));
 const list=$("candidates");list.replaceChildren();
 result.candidates.slice(0,8).forEach((c,i)=>{
  const card=node("article","",list,"route"+(i===0?" best":""));
  node("h3",i===0?"🏆 Előzetes A-jelölt · Google":"Alternatíva "+(i+1),card);
  node("div","Google keresési profil: "+c.variant+
   " · Teljes becsült út: "+c.durationMinutes+" perc"+
   " · Átszállás: "+c.transfers+
   " · Gyaloglás: "+(c.walkMeters===null?"nem ismert":Math.round(c.walkMeters)+" m")+
   " · Gyaloglás utáni átszállási tartalék: "+
   (c.shortestMargin===null?"nincs vagy nem ismert":c.shortestMargin+" perc"),card,"meta");
  if(c.finalWalkMeters!==null)node("div","Utolsó séta a célhoz: "+
   c.finalWalkMeters+" m"+(c.finalWalkMeters>300?" · a kívánt rövid sétánál hosszabb lehet":""),card,"meta");
  const ol=node("ol","",card,"stops");
  c.rides.forEach(r=>{
   node("li",(r.line||"Ismeretlen járat")+" · "+r.kind+
    " · "+(r.from||"?")+" "+hu(r.departure)+" → "+
    (r.to||"?")+" "+hu(r.arrival)+
    (r.agency?" · Üzemeltető: "+r.agency:" · Üzemeltető nincs azonosítva"),
    ol);
  });
  if(c.shortestMargin!==null&&c.shortestMargin<10)
   node("p","⚠️ Szoros menetrendi csatlakozás, élő késés nincs visszaellenőrizve.",
    card,"warn");
 });
 show("timing","Valódi, végponttól végpontig mért válaszidő: "+
  elapsed.toFixed(2).replace(".",",")+" mp. Google API-kérés: "+
  result.googleRequests+"; független üzemeltetői ellenőrzés: NEM történt.");
 $("timing").hidden=false;
 show("status",result.best?"✅ Valódi Google Routes-válasz beérkezett. "+
  (result.fullCoverage?"Mindhárom szolgáltató megjelenik az összesített Google-találatok között, nem feltétlenül ugyanazon az útvonalon.":
  "Nem mindhárom szolgáltató szerepel a Google-alternatívákban.")+
  " Ez előzetes Google-jelölt, független menetrendi ellenőrzés nélkül.":
  "⚠️ A Google-válaszban nincs ellenőrizhető útvonal, ezért nem mutatok kitalált eredményt.");
}
// Config diagnosis uses the SAME signed-in user and fixed fixture as the real
// run, but mode=diagnose is read-only: no quota RPC reserve and no Google fetch.
async function diagnose(){
 if(active)return;
 active=true;$("diagnose").disabled=true;$("diagnose").setAttribute("aria-busy","true");
 let authTimer=null,controller=null,timeout=null;
 try{
  show("status","🔐 Bejelentkezés és szerverkonfiguráció ellenőrzése, Google-költség nélkül...");
  const a=authClient();
  if(!a)throw Error("A Family Guard kapcsolata nem elérhető.");
  const {data,error}=await Promise.race([
   a.client.auth.getSession(),
   new Promise((_,reject)=>{authTimer=setTimeout(()=>
    reject(new Error("A Family Guard bejelentkezése 8 másodperc alatt nem válaszolt.")),8000)})
  ]);
  if(error||!data?.session?.access_token||!data?.session?.user?.id)
   throw Error("Jelentkezz be a Family Guardba ugyanebben a böngészőben.");
  controller=new AbortController();
  timeout=setTimeout(()=>controller.abort(),11000);
  const resp=await fetch(ENDPOINT,{method:"POST",headers:{
   "Content-Type":"application/json",
   Authorization:"Bearer "+data.session.access_token,
   apikey:a.key
  },credentials:"omit",cache:"no-store",redirect:"error",signal:controller.signal,
   body:JSON.stringify({mode:"diagnose",profile:"m",
    origin:{lat:47.52693,lng:19.03802},
    destination:{lat:48.25657,lng:20.62831},
    departureTime:"2026-11-27T15:00:00+01:00"})});
  const raw=await resp.text();
  if(raw.length>3500)throw Error("Érvénytelen méretű diagnosztikai válasz.");
  let d=null;try{d=JSON.parse(raw)}catch{}
  if(!resp.ok)throw Error("A diagnosztikai szerver HTTP "+resp.status+
    " hibát adott ("+(d?.error||"ismeretlen")+").");
  if(d?.schema!=="sho.smart-trip.diagnostic/1"||
   !["ready_for_real_test","not_ready"].includes(d.status)||
   d.googleRequests!==0||d.quotaReserved!==0||
   d.paidProviderContacted!==false||
   !d.checks||!Array.isArray(d.blocking)||
   typeof d.newAttemptAllowed!=="boolean"||
   !(d.quotaUsedToday===null||(Number.isInteger(d.quotaUsedToday)&&d.quotaUsedToday>=0))||
   !(d.quotaUsedMonth===null||(Number.isInteger(d.quotaUsedMonth)&&d.quotaUsedMonth>=0)))
    throw Error("A szerver nem hiteles, költségmentes diagnosztikai választ adott.");
  const names={
   google_key:"Google Routes API-kulcs hiányzik a Supabase Secretsből",
   admin_key:"Supabase admin/secret kulcs nincs elérhetővé téve",
   public_key:"Supabase publikus kulcs nem elérhető",
   quota_readable:"A kvótatáblát a szerver nem tudja olvasni"
  };
  const failures=d.blocking.map(k=>names[k]||"Ismeretlen konfigurációs hiba");
  // The previous HTTP 503 happened BEFORE quota reservation. Successful
  // diagnosis must clear stale error UI and re-arm ONLY with verified 0 usage.
  $("timing").hidden=true;
  $("out").hidden=true;
  if(failures.length){
   show("status","🔴 Diagnózis: "+failures.join("; ")+
    ". Google-hívás: 0. A valódi teszt nem indítható.");
   $("run").disabled=true;
  }else if(!d.newAttemptAllowed){
   show("status","🔒 A konfiguráció rendben, de a Google-kvótaszámláló szerint már "+
    (d.quotaUsedToday===null?"ismeretlen számú":d.quotaUsedToday)+" foglalás van ma. "+
    "Biztonságból új valós teszt nem indítható. Google-hívás: 0 az ellenőrzés során.");
   $("run").disabled=true;
  }else{
   alreadyRun=false;
   $("run").disabled=false;
   show("status","✅ A szerver működik, a napi Google-kvótában 0 foglalás van. "+
    "A korábbi 503-as próbálkozás nem fogyasztott kvótát: a valódi teszt gombja "+
    "újra használható. A Google-kulcs érvényességét még nem vizsgáltuk. "+
    "Google-hívás: 0 az ellenőrzés során.");
  }
 }catch(e){
  show("status","⚠️ Konfigurációs ellenőrzés: "+
   (e?.name==="AbortError"?"A szerver 11 másodperc alatt nem válaszolt.":
    (e?.message||"Ismeretlen hiba.")));
 }finally{
  if(authTimer!==null)clearTimeout(authTimer);
  if(timeout!==null)clearTimeout(timeout);
  active=false;$("diagnose").disabled=false;
  $("diagnose").removeAttribute("aria-busy");
 }
}
$("diagnose")?.addEventListener("click",()=>{void diagnose()});

async function run(){
 if(active||alreadyRun)return;
 if(!$("agree").checked){show("status","⚠️ A valós Google-kérésekhez jelöld be a költség- és adatkezelési hozzájárulást.");return}
 active=true;alreadyRun=true;$("run").disabled=true;$("run").setAttribute("aria-busy","true");
 const start=performance.now(),controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),41000);
 let authTimer=null,networkStarted=false;
 try{
  show("status","🔐 Family Guard bejelentkezés ellenőrzése...");
  const a=authClient();
  if(!a)throw Error("A Family Guard hitelesítés nem elérhető.");
  // The previous pilot could wait forever at getSession(), before fetch's
  // AbortController had any effect. Make auth itself strictly time-bounded.
  const {data,error}=await Promise.race([
   a.client.auth.getSession(),
   new Promise((_,reject)=>{authTimer=setTimeout(()=>
    reject(new Error("A Family Guard munkamenet ellenőrzése 8 másodperc alatt nem válaszolt. A Google-keresés nem indult el.")),8000)})
  ]);
  clearTimeout(authTimer);authTimer=null;
  if(error||!data?.session?.user?.id||!data.session.access_token)
   throw Error("Jelentkezz be a Family Guardba ugyanebben a böngészőben.");
  show("status","🌍 Google Routes: 3 valódi keresési profil fut, a BKK/MÁV/Volán jelenlétét ellenőrzöm...");
  networkStarted=true;
  const response=await fetch(ENDPOINT,{method:"POST",headers:{
   "Content-Type":"application/json",
   "Authorization":"Bearer "+data.session.access_token,
   "apikey":a.key},credentials:"omit",cache:"no-store",redirect:"error",
   signal:controller.signal,body:JSON.stringify({
    mode:"real_test",profile:"m",
    origin:{lat:47.52693,lng:19.03802},
    destination:{lat:48.25657,lng:20.62831},
    departureTime:"2026-11-27T15:00:00+01:00"
   })});
  const content=await response.text();
  if(content.length>480000)throw Error("Túlméretes provider-válasz, biztonságosan elutasítva.");
  let payload=null;try{payload=JSON.parse(content)}catch{}
  if(!response.ok){
   const msg={
    pilot_google_key_or_service_not_configured:"A Google-kulcs vagy a Supabase szolgáltatáskulcs nincs konfigurálva. Nem indult Google-kérés.",
    pilot_daily_one_run_or_quota_exceeded:"Egy valós teszt engedélyezett naponta, vagy elfogyott a Google-kvóta.",
    unauthorized_profile:"A Family Guard fiók nincs jogosítva Mónika profiljára.",
    origin_denied:"Csak a hivatalos SHO oldalról lehet tesztelni.",
    pilot_fixed_fixture_only:"A teszteset adatait nem szabad módosítani.",
    quota_guard_unavailable:"A költségvédelmi adatbázis-védelem nem érhető el."
   };
   const code=payload?.error||"ismeretlen";
   throw Error((msg[code]||"Hálózati/szerverhiba: "+response.status)+
    " [HTTP "+response.status+", hibakód: "+code+"]."+
    " Google-kérések: "+(payload?.googleRequests||0)+
    "; kvótafoglalás: "+(payload?.quotaReserved||0)+".");
  }
  output(payload,$("priority").value,(performance.now()-start)/1000);
 }catch(e){
  const msg=e?.name==="AbortError"?
   "A három valós keresési kérés meghaladta az időkeretet. A szerveroldali költségvédelmi keret továbbra is érvényes.":
   (e?.message||"A valós teszt nem sikerült.");
  show("status","⚠️ "+msg);
  show("timing","A keresés lezárult hibával "+
   ((performance.now()-start)/1000).toFixed(1).replace(".",",")+
   " mp alatt. Nem kaptunk ellenőrzött Google-útvonalat.");
  $("timing").hidden=false;
 }finally{
  if(authTimer!==null)clearTimeout(authTimer);
  clearTimeout(timeout);
  if(!networkStarted)alreadyRun=false;
  active=false;$("run").removeAttribute("aria-busy");
  $("run").disabled=networkStarted;
 }
}
$("run").addEventListener("click",()=>{void run()});
