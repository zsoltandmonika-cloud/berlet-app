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
  node("h3",i===0?"🏆 Léna A terve":"Alternatíva "+(i+1),card);
  node("div","Google keresési profil: "+c.variant+
   " · Teljes becsült út: "+c.durationMinutes+" perc"+
   " · Átszállás: "+c.transfers+
   " · Gyaloglás: "+(c.walkMeters===null?"nem ismert":Math.round(c.walkMeters)+" m")+
   " · Menetrendi átszállási ablak: "+
   (c.shortestMargin===null?"nincs vagy nem ismert":c.shortestMargin+" perc"),card,"meta");
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
  (result.fullCoverage?"Mindhárom szolgáltató szerepel a visszakapott jelöltekben.":
  "Nem mindhárom szolgáltató szerepel a Google-alternatívákban.")+
  " A tényleges menetrendi szolgáltatói ellenőrzés külön feladat.":
  "⚠️ A Google-válaszban nincs ellenőrizhető útvonal, ezért nem mutatok kitalált eredményt.");
}
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
