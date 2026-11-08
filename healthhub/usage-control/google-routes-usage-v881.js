/* SHO Usage Control · Google Routes v881.
 * Read-only authenticated Supabase quota snapshot, explicitly on user click.
 * No Google request, no AI request, no background polling, no key, no writes.
 * Reservations != Google billed events. SKU scenario != invoice.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else if(root){
  root.SH9_GOOGLE_ROUTES_USAGE_V881=api;
  const boot=()=>api.mount(root.document,root);
  if(root.document.readyState==="loading")
   root.document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
 }
})(typeof window==="object"?window:globalThis,function(){
 "use strict";
 const SESSION="hh-supabase-health-session-v1",
  TRUSTED="hh-health-vault-trusted-device-v332",
  HOST="https://vhsrupphzcjkdrusonzh.supabase.co",
  ENDPOINT=HOST+"/functions/v1/hh-smart-trip-usage-v881";
 const plans=Object.freeze({
  Essentials:Object.freeze({free:10000,unitUSD:5,skuId:"9EFF-679A-9B16"}),
  Pro:Object.freeze({free:5000,unitUSD:10,skuId:"02F7-1B55-DC90"})
 });
 const good=n=>Number.isInteger(n)&&n>=0;
 const format=n=>new Intl.NumberFormat("hu-HU",{maximumFractionDigits:2}).format(n);
 function scenario(count,sku){
  const p=plans[sku];
  if(!p||!good(count))return null;
  return {sku,freeCap:p.free,perThousandUSD:p.unitUSD,
   overFree:Math.max(0,count-p.free),
   hypotheticalUSD:Math.round(Math.max(0,count-p.free)*p.unitUSD/1000*10000)/10000};
 }
 function valid(x,month){
  return !!x&&x.schema==="sh9.smart-trip.usage/1"&&
   x.source==="supabase_first_party_quota"&&x.period===month&&
   x.timezone==="UTC"&&Number.isFinite(Date.parse(x.measuredAt))&&
   x.actualGoogleRequests===null&&x.actualGoogleBillingUSD===null&&
   x.billingSku===null&&good(x.month?.reservations)&&
   x.month.limit===200&&
   (x.day===null||(good(x.day?.reservations)&&x.day.limit===20&&
    /^20\d\d-\d\d-\d\d$/.test(x.day.date)))&&
   x.pilot?.maxRunsPerUTCDay===1&&x.pilot?.requestsPerRun===3;
 }
 function session(win){
  let a=null,b=null;
  try{a=JSON.parse(win.sessionStorage.getItem(SESSION)||"null")}catch{}
  try{
   if(win.localStorage.getItem(TRUSTED)==="yes")
    b=JSON.parse(win.localStorage.getItem(SESSION)||"null");
  }catch{}
  const recent=Number(b?.expires_at)>Number(a?.expires_at)?b:(a||b);
  if(typeof recent?.access_token!=="string"||
   !/^eyJ[A-Za-z0-9._-]{30,}$/.test(recent.access_token)||
   Number(recent.expires_at)<=Date.now()/1000+75)return null;
  return recent.access_token;
 }
 function mount(doc,win){
  const get=id=>doc.getElementById(id);
  const button=get("googleRoutesUsageReadV881"),status=get("googleRoutesUsageStatusV881"),
   holder=get("googleRoutesUsageRowsV881"),month=get("month");
  if(!button||!holder||!status||!month)return false;
  const vault=()=>win.HH_DAILY_HEALTH_SYNC_V319;
  const create=(tag,content,css="")=>{
   const e=doc.createElement(tag);
   if(css)e.className=css;e.textContent=String(content);return e;
  };
  function draw(data){
   holder.replaceChildren();
   const grid=create("div","","google-routes-kpis");
   const kpi=(label,value,detail)=>{
    const c=create("div","","google-routes-kpi");
    c.append(create("div",label,"small"),
     create("strong",value),create("div",detail,"tiny muted"));return c;
   };
   grid.append(
    kpi("Mai kvótafoglalás (UTC)",data.day?
      format(data.day.reservations)+" / "+data.day.limit:"—",
      data.day?"A mai Google-teszt foglalásai":"Másik hónap · nem aktuális nap"),
    kpi("Havi kvótafoglalás",format(data.month.reservations)+" / "+
      data.month.limit,"Saját Supabase-korlát · nem Google Billing"),
    kpi("Essentials forgatókönyv",format(scenario(data.month.reservations,"Essentials").hypotheticalUSD)+
      " USD","10 000/hó díjmentes · 5 USD / további 1000"),
    kpi("Google számlázott összeg","NINCS MÉRÉS",
      "Csak Google Cloud Billing SKU alapján igazolható")
   );
   holder.append(grid);
   const estimates=create("div","","small");
   const pro=scenario(data.month.reservations,"Pro");
   estimates.textContent="Pro alternatíva: "+format(pro.hypotheticalUSD)+
    " USD modellérték · 5000 ingyenes/hó · 10 USD / további 1000. "+
    "Ezek csak feltételes számítások, kizárólag a saját kvótafoglalásainkra. "+
    "Más Google-projektek ugyanazon billing accounton osztozhatnak a SKU ingyenes keretén.";
   holder.append(estimates);
   const forecast=create("div","","notice");
   const remaining=Math.max(0,data.month.limit-data.month.reservations);
   forecast.textContent="Fejlesztői tervezés: 3 API-kérés / teljes keresés. A jelenlegi "+
    "havi belső keretből elméletileg még "+
    Math.floor(remaining/3)+" teljes 3-kéréses keresés férne bele, "+
    "de a külön V5 tesztvégpont napi 1 futásra korlátozott. "+
    "A Google 5 USD-s költségriasztása nem automatikus költési plafon.";
   holder.append(forecast);
   const note=create("p","","small");
   note.textContent="Forrás: Supabase elsődleges kvóta-adat, mérve: "+
    new Date(data.measuredAt).toLocaleString("hu-HU")+
    " · A foglalás eltérhet a Google felé ténylegesen elküldött és számlázott kéréstől. "+
    "A 2026.11.08-i auditban 3 valódi kérés mellett egy elutasított teszt is foglalást okozott; ezt javítottuk. "+
    "Nem indult Google-keresés ezen a riportoldalon.";
   holder.append(note);
   const link=create("a","Google Maps Platform · hivatalos díjszabás","github-live-link");
   link.href="https://developers.google.com/maps/billing-and-pricing/pricing";
   link.target="_blank";link.rel="noopener noreferrer";
   holder.append(link);
   const measured=data.month.reservations,source="Supabase quota reservations · nem Google Billing";
   doc.dispatchEvent(new CustomEvent("sh9:google-routes-usage-measured",{detail:{
    schema:"sh9.smart-trip.usage-measured/1",period:data.period,
    measuredAt:data.measuredAt,rows:[{
     id:"google-routes-usage-"+data.period,provider:"google",
     metric:"Smart Trip Routes kvótafoglalás",used:measured,limit:data.month.limit,
     unit:"API-kérés / hó",at:data.measuredAt,period:data.period,
     source,verified:true
    }]
   }}));
  }
  let busy=false;
  button.addEventListener("click",async()=>{
   if(busy)return;
   const m=month.value,cfg=win.HH_CENTRAL_VAULT;
   if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(m)||
    cfg?.enabled!==true||cfg.supabaseUrl!==HOST||
    typeof cfg.publishableKey!=="string"||cfg.publishableKey.length<20){
    status.textContent="⚠ Health Vault beállítás vagy hónap nem elérhető.";return
   }
   busy=true;button.disabled=true;status.textContent="Bejelentkezés és kvótaellenőrzés…";
   try{
    let token=session(win);
    if(!token&&typeof vault()?.request==="function"){
     // Only after explicit button click, ask the existing Vault to refresh.
     try{await vault().request("/rest/v1/hh_profiles?select=profile_key")}catch{}
     token=session(win);
    }
    if(!token){
     status.textContent="🔐 Jelentkezz be a Health Vaultba, utána kérd le újra.";
     if(typeof vault()?.openLogin==="function")vault().openLogin();
     return;
    }
    const controller=new AbortController();
    const timer=win.setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await win.fetch(ENDPOINT,{
     method:"POST",headers:{apikey:cfg.publishableKey,
      Authorization:"Bearer "+token,"Content-Type":"application/json"},
     cache:"no-store",credentials:"omit",redirect:"error",
     signal:controller.signal,body:JSON.stringify({month:m})
    })}finally{win.clearTimeout(timer)}
    const raw=await response.text();
    if(raw.length>6000)throw Error("Érvénytelen méretű szerverválasz.");
    let data=null;try{data=JSON.parse(raw)}catch{}
    if(!response.ok)throw Error(response.status===403?
     "Nincs hozzáférés a családi Usage Report adatokhoz.": 
     "A Supabase kvótajelentés nem érhető el (HTTP "+response.status+").");
    if(!valid(data,m))throw Error("A riporthoz nem kaptam hiteles, teljes kvótastatisztikát.");
    draw(data);
    status.textContent="✓ Friss, hitelesített Supabase kvótamérés. "+
     "A Google számlázott költsége továbbra sem ellenőrzött.";
   }catch(e){
    status.textContent="⚠ "+(e?.name==="AbortError"?
     "A lekérdezés 12 másodperc után lejárt.":
     String(e?.message||"A lekérdezés nem sikerült."));
   }finally{busy=false;button.disabled=false}
  });
  return true;
 }
 return Object.freeze({mount,valid,scenario,session});
});
