/* SH9 Usage Control v880 · Puter authenticated, on-demand measurement.
 * Account-wide allowance/storage vs current calling-app API breakdown are
 * explicitly separated. No tokens, health data, polling or automatic sign-in.
 * Sources: https://docs.puter.com/Auth/getMonthlyUsage/ and /FS/space/
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{
  root.SH9_PUTER_USAGE_V880=api;
  const boot=()=>api.mount(root.document,root);
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
 }
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const MICROCENTS_PER_USD=100000000,GB=1073741824;
 const SOURCE_CREDIT='Puter auth.getMonthlyUsage',SOURCE_STORAGE='Puter fs.space';
 const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const usd=v=>v/MICROCENTS_PER_USD;
 const round=v=>Math.round(v*1000000)/1000000;
 const fmt=(v,d=4)=>typeof v==='number'&&Number.isFinite(v)?
  new Intl.NumberFormat('hu-HU',{minimumFractionDigits:0,maximumFractionDigits:d}).format(v):'—';
 function normalize(usage,storage,at){
  if(!usage||typeof usage!=='object')throw Error('A Puter nem adott értelmezhető havi fogyasztási adatot.');
  const when=at||new Date().toISOString();
  if(!Number.isFinite(Date.parse(when)))throw Error('Érvénytelen mérési időpont.');
  const info=usage.allowanceInfo||{},allowance=info.monthUsageAllowance,remaining=info.remaining;
  const creditValid=num(allowance)&&allowance>0&&num(remaining)&&remaining<=allowance;
  const rows=[];
  const display={creditValid,storageValid:false,remainingUSD:null,allowanceUSD:null,
   consumedUSD:null,storedGB:null,capacityGB:null,api:[],apps:[]};
  if(creditValid){
   const used=round(usd(allowance-remaining)),limit=round(usd(allowance));
   display.allowanceUSD=limit;display.remainingUSD=round(usd(remaining));display.consumedUSD=used;
   rows.push({id:'puter-allowance-'+when,provider:'puter',metric:'Puter havi kreditkeret felhasználása',
    used,limit,unit:'USD kredit / hó',at:when,period:when.slice(0,7),
    source:SOURCE_CREDIT,verified:true});
  }
  if(storage&&num(storage.used)&&num(storage.capacity)&&storage.capacity>0&&storage.used<=storage.capacity){
   const used=round(storage.used/GB),limit=round(storage.capacity/GB);
   display.storageValid=true;display.storedGB=used;display.capacityGB=limit;
   rows.push({id:'puter-storage-'+when,provider:'puter',metric:'Puter teljes fióktárhely',
    used,limit,unit:'GB tárhely',at:when,period:when.slice(0,7),
    source:SOURCE_STORAGE,verified:true});
  }
  // Per official Puter docs these are *only* the current calling app's
  // API and app usage; never label them account-wide or total AI spend.
  if(usage.usage&&typeof usage.usage==='object'){
   display.api=Object.entries(usage.usage).filter(([k,v])=>
    typeof k==='string'&&v&&typeof v==='object'&&num(v.count)&&num(v.cost))
    .map(([name,v])=>({name:name.slice(0,100),count:v.count,usedUSD:round(usd(v.cost))}))
    .sort((a,b)=>b.usedUSD-a.usedUSD).slice(0,15);
  }
  if(usage.appTotals&&typeof usage.appTotals==='object'){
   display.apps=Object.entries(usage.appTotals).filter(([k,v])=>v&&num(v.count)&&num(v.total))
    .map(([name,v])=>({name:String(name).slice(0,100),count:v.count,usedUSD:round(usd(v.total))}))
    .sort((a,b)=>b.usedUSD-a.usedUSD).slice(0,10);
  }
  return {schema:'sh9.puter.usage/1',measuredAt:when,rows,display};
 }
 function mount(doc,w){
  const read=doc.getElementById('puterUsageReadV880');
  const login=doc.getElementById('puterConnectV880');
  const status=doc.getElementById('puterUsageStatusV880');
  const root=doc.getElementById('puterUsageSummaryV880');
  if(!read||!login||!status||!root)return;
  let loading=null,busy=false;
  const setStatus=s=>{status.textContent=s};
  const el=(tag,text,css)=>{
   const e=doc.createElement(tag);if(css)e.className=css;
   if(text!==undefined)e.textContent=String(text);return e;
  };
  function sdk(){
   if(w.puter?.auth?.getMonthlyUsage&&w.puter?.fs?.space)return Promise.resolve(w.puter);
   if(loading)return loading;
   loading=new Promise((resolve,reject)=>{
    const script=doc.createElement('script');script.src='https://js.puter.com/v2/';
    script.async=true;
    let done=false;
    const finish=(error)=>{
     if(done)return;done=true;
     w.clearTimeout(timeout);
     if(error){loading=null;reject(error)}
     else if(w.puter?.auth?.getMonthlyUsage&&w.puter?.fs?.space)resolve(w.puter);
     else {loading=null;reject(Error('A Puter SDK nem támogatja a szükséges usage funkciókat.'))}
    };
    script.onload=()=>finish(null);
    script.onerror=()=>finish(Error('A Puter SDK nem tölthető be.'));
    const timeout=w.setTimeout(()=>finish(Error('A Puter SDK betöltése túllépte az időkorlátot.')),15000);
    doc.head.appendChild(script);
   });
   return loading;
  }
  function draw(report){
   root.replaceChildren();
   const {display:d}=report;
   const cards=el('div',undefined,'github-billing-kpis');
   function tile(label,value,note){
    const item=el('div',undefined,'github-billing-kpi');
    item.append(el('span',label,'tiny muted'),el('strong',value),el('span',note,'tiny muted'));cards.append(item);
   }
   if(d.creditValid){
    tile('Havi Puter-keret',fmt(d.allowanceUSD)+' USD','Fiókszintű kreditkeret');
    tile('Felhasznált keret',fmt(d.consumedUSD)+' USD','A keret és a maradék különbsége');
    tile('Fennmaradó keret',fmt(d.remainingUSD)+' USD','Nem azonos a számlázott költséggel');
   }else tile('Havi Puter-kredit','Nincs hiteles adat','Nem becsülünk keretfelhasználást.');
   if(d.storageValid)tile('Fióktárhely',fmt(d.storedGB,3)+' / '+fmt(d.capacityGB,3)+' GB','Teljes fióktárhely, nem havi forgalom');
   else tile('Fióktárhely','Nincs mérés','Nem érkezett ellenőrzött kapacitás.');
   root.append(cards);
   const label=el('p','Az alábbi API-adatok kizárólag az Usage Center alkalmazásra vonatkoznak. A Táplálkozás vagy Recepttár más Puter-alkalmazásban keletkező AI-költségét nem összesítik automatikusan.','small');
   root.append(label);
   if(d.api.length){
    const list=el('div',undefined,'github-billing-table');
    d.api.forEach(r=>{
     const line=el('div',undefined,'github-billing-row');
     line.append(el('span',r.name,'github-billing-sku'),
      el('span',fmt(r.count,0)+' hívás','github-billing-gross'),
      el('strong',fmt(r.usedUSD)+' USD','github-billing-net'));list.append(line);
    });
    root.append(list);
   }else root.append(el('p','Nincs alkalmazásszintű Puter API-bontás.','small'));
   root.append(el('p','Lekérdezés: '+new Date(report.measuredAt).toLocaleString('hu-HU')+'. Csak manuális mérés, nincs háttérfrissítés.','small'));
  }
  async function signIn(){
   if(busy)return;
   busy=true;login.disabled=true;
   try{
    // signIn MUST run directly in the user's click handler. On first tap,
    // only load the SDK; second tap performs the popup-safe sign-in.
    if(!w.puter?.auth?.signIn){
     setStatus('Puter SDK betöltése…');
     await sdk();
     setStatus('A Puter SDK kész. Koppints újra a Puter belépés gombra.');
     return;
    }
    await w.puter.auth.signIn();
    setStatus('✓ Puter belépés kész. A fogyasztás lekérése külön gombnyomásra indul.');
   }catch(e){setStatus('⚠ '+String(e?.message||e).slice(0,160))}
   finally{busy=false;login.disabled=false}
  }
  async function measure(){
   if(busy)return;
   busy=true;read.disabled=true;
   try{
    setStatus('Puter SDK ellenőrzése…');
    const puter=await sdk();
    if(!await Promise.resolve(puter.auth.isSignedIn?.())){
     setStatus('🔐 Jelentkezz be a Puter-fiókba a Belépés gombbal, majd indítsd újra a lekérést.');
     return;
    }
    setStatus('Puter havi kreditkeret lekérése…');
    const usage=await puter.auth.getMonthlyUsage();
    let space=null,spaceProblem=false;
    try{space=await puter.fs.space()}catch(_){spaceProblem=true}
    const report=normalize(usage,space,new Date().toISOString());
    if(!report.rows.length)throw Error('A Puter nem adott ellenőrizhető havi keret- vagy tárhelyadatot.');
    draw(report);
    doc.dispatchEvent(new CustomEvent('sh9:puter-usage-measured',{detail:report}));
    setStatus('✓ Valós Puter API-mérés · '+new Date(report.measuredAt).toLocaleString('hu-HU')+
      (spaceProblem?' · Tárhelyadat nem érhető el.':'')+'.');
   }catch(e){setStatus('⚠ '+String(e?.message||e).slice(0,200))}
   finally{busy=false;read.disabled=false}
  }
  login.addEventListener('click',signIn);
  read.addEventListener('click',measure);
 }
 return Object.freeze({normalize,mount,MICROCENTS_PER_USD,SOURCE_CREDIT,SOURCE_STORAGE});
});
