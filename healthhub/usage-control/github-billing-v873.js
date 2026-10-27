/* SH9 v873 · read-only private GitHub Billing meter
 * Explicit click only; no PAT in browser and no background polling.
 * Uses the existing HealthHub Vault session, no new or broadened auth scope. */
(function(w,d){
'use strict';
const STORE="sh9-github-billing-result-v873",SESSION="hh-supabase-health-session-v1";
const TRUSTED="hh-health-vault-trusted-device-v332",TTL=30*60*1000;
const $=id=>d.getElementById(id);
const fmt=x=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(x);
function getSession(){
 let recent=null,remembered=null;
 try{recent=JSON.parse(w.sessionStorage.getItem(SESSION)||'null')}catch(_){}
 try{if(w.localStorage.getItem(TRUSTED)==='yes')remembered=JSON.parse(w.localStorage.getItem(SESSION)||'null')}catch(_){}
 if(!recent)recent=remembered;
 else if(remembered&&Number(remembered.expires_at)>Number(recent.expires_at))recent=remembered;
 if(!recent||typeof recent.access_token!=='string'||
    !/^eyJ[A-Za-z0-9._-]{30,}$/.test(recent.access_token)||
    Number(recent.expires_at)<=Math.floor(Date.now()/1000)+75)
   return null;
 return recent.access_token;
}
function valid(data,month){
 if(!data||data.schema!=='sh9.github.billing/1'||data.period!==month||data.currency!=='USD')return false;
 const keys=['grossAmount','discountAmount','netAmount','actionsLinuxMinutes','actionsStorageGBHours'];
 return keys.every(k=>typeof data[k]==='number'&&Number.isFinite(data[k]))&&
  typeof data.measuredAt==='string'&&Number.isFinite(Date.parse(data.measuredAt))&&
  Array.isArray(data.topSkus)&&data.topSkus.length<=18;
}
function parseCached(month){
 try{
  const x=JSON.parse(w.sessionStorage.getItem(STORE+"-"+month)||'null');
  if(!valid(x?.data,month))return null;
  const t=Date.parse(x.data.measuredAt);
  if(t>Date.now()+60000||Date.now()-t>TTL)return null;
  return x.data;
 }catch(_){return null}
}
function save(data){try{w.sessionStorage.setItem(STORE+"-"+data.period,JSON.stringify({data}))}catch(_){}}
function boot(){
 const button=$('githubBillingReadV873'),root=$('githubBillingRowsV873'),status=$('githubBillingStatusV873');
 if(!button||!root||!status)return;
 const month=$('month');
 const create=(tag,text,cls='')=>{const e=d.createElement(tag);e.textContent=String(text);if(cls)e.className=cls;return e};
 let busy=false;
 function dispatch(data){d.dispatchEvent(new CustomEvent('sh9:github-billing-measured',{detail:data}))}
 function draw(data,cached){
  root.replaceChildren();
  const kpis=create('div','','github-billing-kpis');
  for(const [label,val] of [['Bruttó USD',data.grossAmount],['Kedvezmény USD',data.discountAmount],['Ténylegesen terhelt USD',data.netAmount],['Actions Linux-perc',data.actionsLinuxMinutes]]){
   const e=create('div','','github-billing-kpi');
   e.append(create('div',label,'tiny muted'),create('strong',fmt(val)));
   kpis.append(e);
  }
  root.append(kpis);
  const details=create('div','','small muted');
  details.textContent='Forrás: GitHub Billing API · '+data.lineItemCount+
   ' elszámolási sor · mérve: '+new Date(data.measuredAt).toLocaleString('hu-HU')+
   (cached?' · helyi cache':' · közvetlen lekérés');
  root.append(details);
  if(data.topSkus.length){
   const table=create('div','','github-billing-table');
   for(const s of data.topSkus.slice(0,12)){
    const row=create('div','','github-billing-row');
    row.append(create('span',s.sku,'github-billing-sku'),
     create('span',fmt(s.grossAmount)+' USD','github-billing-gross'),
     create('strong',fmt(s.netAmount)+' USD','github-billing-net'));
    table.append(row);
   }
   root.append(table);
  }
  dispatch(data);
 }
 function showLocal(){
  if(busy)return;
  const cached=parseCached(month.value);
  if(cached){draw(cached,true);status.textContent='✓ Korábbi mérés · legfeljebb 30 perces cache.'}
  else {root.replaceChildren();status.textContent='A számlázási lekérés nem automatikus. Nyomd meg a gombot.'}
 }
 button.addEventListener('click',async()=>{
  if(busy)return;
  const m=month.value,cached=parseCached(m);
  if(cached){draw(cached,true);status.textContent='✓ Cache-ből betöltve, nincs új API-hívás.';return}
  const cfg=w.HH_CENTRAL_VAULT||{},token=getSession();
  if(!token){status.textContent='⚠ A HealthHub Központi Vault-belépés hiányzik vagy lejárt. Lépj be a fő Admin felületen, majd térj vissza.';return}
  if(cfg.enabled!==true||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl||'')||
    typeof cfg.publishableKey!=='string'||cfg.publishableKey.length<15){
   status.textContent='⚠ A HealthHub Vault központi konfigurációja nem érhető el.';return
  }
  busy=true;button.disabled=true;status.textContent='GitHub Billing lekérése biztonságos közvetítőn át…';
  try{
   const ctl=new AbortController(),timeout=w.setTimeout(()=>ctl.abort(),24000);
   let res;
   try{res=await w.fetch(cfg.supabaseUrl+'/functions/v1/hh-github-billing-v873',{
    method:'POST',
    headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',
      Authorization:'Bearer '+token},
    body:JSON.stringify({month:m}),signal:ctl.signal,cache:'no-store'
   })}finally{w.clearTimeout(timeout)}
   const v=await res.json().catch(()=>null);
   if(!res.ok){
    if(res.status===401||res.status===403)throw Error('A Központi Vault-bejelentkezés vagy jogosultság hiányzik.');
    if(v?.error==='github_plan_read_required')throw Error('A GitHub tokent Plan: Read jogosultsággal kell engedélyezni.');
    throw Error('A GitHub Billing kapcsolat nem érhető el (HTTP '+res.status+').');
   }
   if(v?.configured===false){status.textContent='🔐 A GitHub Plan: Read token még nincs beállítva a Supabase Secrets felületen. Ez nem GitHub-hiba.';return}
   if(!valid(v?.data,m))throw Error('A Billing API hiányos vagy eltérő havi adatot adott.');
   if(month.value!==m){status.textContent='A hónap időközben megváltozott. Frissítsd újra.';return}
   save(v.data);draw(v.data,v.source==='cache');
   status.textContent='✓ Ellenőrzött GitHub Billing adatok · '+fmt(v.data.netAmount)+' USD tényleges terhelés.';
  }catch(e){status.textContent='⚠ '+String(e?.message||e).slice(0,220)}
  finally{busy=false;button.disabled=false}
 });
 month.addEventListener('change',showLocal);
 showLocal();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
