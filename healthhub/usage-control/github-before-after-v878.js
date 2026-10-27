/* SH9 v878: measured GitHub Actions pre/post. Billing API only, no polling.
 * An observed reduction in the daily rate is NOT proven causal cost saving. */
(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
else{
 root.SH9_GITHUB_COMPARE_V878=api;
 const boot=()=>api.mount(root.document,root);
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
})(typeof window==='object'?window:globalThis,function(){
'use strict';
const DAY=86400000,KEY='sh9-github-before-after-v878';
const BASE=Object.freeze({
 month:'2026-10',startAt:'2026-09-30T22:00:00Z',
 measuredAt:'2026-10-27T09:11:06Z',linuxMinutes:21184,
 grossUSD:127.15,billedUSD:0,
 source:'GitHub Billing API · 2026.10.27. 10:11 · 108 elszámolási sor'
});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>Math.round(x*100)/100;
function monthStart(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('invalid month');
 const y=Number(month.slice(0,4)),m=Number(month.slice(5));
 if(y<2026||y>2100)throw Error('invalid year');
 const guess=Date.UTC(y,m-1,1);
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',timeZoneName:'shortOffset'}).formatToParts(new Date(guess));
 const zone=parts.find(x=>x.type==='timeZoneName')?.value||'';
 const match=/GMT([+-])(\d\d?)(?::(\d\d))?/.exec(zone);
 if(!match)throw Error('missing timezone');
 const offset=(match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0));
 return guess-offset*60000;
}
function valid(d){
 if(!d||d.schema!=='sh9.github.billing/1'||d.currency!=='USD'||d.verified!==true)return false;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.period||''))return false;
 if(![d.actionsLinuxMinutes,d.grossAmount,d.netAmount].every(finite))return false;
 const measured=Date.parse(d.measuredAt||'');
 return Number.isFinite(measured)&&measured>=Date.parse(BASE.startAt)&&measured<=Date.now()+60000;
}
function calculate(d){
 const beforeRate=BASE.linuxMinutes/((Date.parse(BASE.measuredAt)-Date.parse(BASE.startAt))/DAY);
 const common={beforeRate:round(beforeRate),beforeMinutes:BASE.linuxMinutes,baselineAt:BASE.measuredAt};
 if(!valid(d))return {...common,status:'no_measurement'};
 if(d.period<BASE.month)return {...common,status:'outside'};
 let beginning,minutes;
 try{
  beginning=d.period===BASE.month?Date.parse(BASE.measuredAt):monthStart(d.period);
  minutes=d.period===BASE.month?d.actionsLinuxMinutes-BASE.linuxMinutes:d.actionsLinuxMinutes;
 }catch(_){return {...common,status:'outside'}}
 const days=(Date.parse(d.measuredAt)-beginning)/DAY;
 if(days<0||minutes<0)return {...common,status:'inconsistent'};
 if(days<1)return {...common,status:'pending',elapsedHours:round(days*24),afterMinutes:round(minutes)};
 const rate=minutes/days;
 if(!finite(rate)||rate<0)return {...common,status:'inconsistent'};
 return {...common,status:'measured',afterRate:round(rate),rateChangePct:round(100*(rate/beforeRate-1)),
  afterMinutes:round(minutes),elapsedDays:round(days),month:d.period,measuredAt:d.measuredAt,
  netUSD:round(d.netAmount)};
}
function save(store,d){
 if(!valid(d))return false;
 try{
  store.setItem(KEY+'-'+d.period,JSON.stringify({
   schema:d.schema,period:d.period,currency:'USD',verified:true,
   measuredAt:d.measuredAt,actionsLinuxMinutes:d.actionsLinuxMinutes,
   grossAmount:d.grossAmount,netAmount:d.netAmount
  }));
  return true;
 }catch(_){return false}
}
function load(store,month){
 try{
  const d=JSON.parse(store.getItem(KEY+'-'+month)||'null');
  return valid(d)&&d.period===month?d:null;
 }catch(_){return null}
}
function mount(doc,w){
 const root=doc.getElementById('sh9GitHubCompareV878'),month=doc.getElementById('month');
 if(!root||!month)return;
 const status=doc.getElementById('sh9GitHubCompareStatusV878');
 const body=doc.getElementById('sh9GitHubCompareRowsV878');
 const fmt=x=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(x);
 function node(tag,text,css){
  const el=doc.createElement(tag);if(text!==undefined)el.textContent=String(text);
  if(css)el.className=css;return el;
 }
 function tile(label,value){
  const el=node('div',undefined,'gh-compare-cell');
  el.append(node('div',label,'small muted'),node('strong',value));
  return el;
 }
 function render(measurement){
  body.replaceChildren();
  const r=calculate(measurement),k=node('div',undefined,'gh-compare-grid');
  k.append(tile('Előtte · napi átlag',fmt(r.beforeRate)+' Linux-perc'));
  if(r.status==='measured'){
   k.append(tile('Utána · napi átlag',fmt(r.afterRate)+' Linux-perc'));
   k.append(tile('Változás',(r.rateChangePct>0?'+':'')+fmt(r.rateChangePct)+'%'));
   body.append(k,node('p','Mérés: '+fmt(r.elapsedDays)+' nap · '+fmt(r.afterMinutes)+' új Linux-perc · '+new Date(r.measuredAt).toLocaleString('hu-HU'),'small'));
   status.textContent='✓ Előtte/utána napi átlag: '+(r.rateChangePct<0?'csökkent':r.rateChangePct>0?'nőtt':'nem változott');
  }else{
   body.append(k);
   const explanation=r.status==='pending'?
    'Az új mintavétel óta '+fmt(r.elapsedHours)+' óra telt el. Legalább 24 óra kell a napi átlaghoz.':
    r.status==='inconsistent'?'A havi kumulált mérés kisebb a kiindulónál vagy időrendhibás; nincs összehasonlítás.':
    r.status==='outside'?'A kiválasztott hónap nem érvényes a méréshez.':
    'Ehhez a hónaphoz még nincs új API-mérés. Használd a GitHub Billing lekérése gombot.';
   body.append(node('p',explanation,'small'));
   status.textContent=r.status==='pending'?'⏳ Még kevés utólagos adat':'Kiinduló mérés rögzítve';
  }
  body.append(node('p',BASE.source+' · bruttó '+fmt(BASE.grossUSD)+' USD · terhelt '+fmt(BASE.billedUSD)+' USD.','tiny muted'),
   node('p','A napi átlag változása megfigyelés, nem bizonyított okozati hatás vagy dollárban realizált megtakarítás.','tiny muted'));
 }
 function storage(){try{return w.localStorage}catch(_){return null}}
 doc.addEventListener('sh9:github-billing-measured',e=>{
  if(!e.detail||e.detail.period!==month.value)return;
  if(storage())save(storage(),e.detail);
  render(e.detail);
 });
 month.addEventListener('change',()=>render(storage()?load(storage(),month.value):null));
 render(storage()?load(storage(),month.value):null);
}
return Object.freeze({BASE,valid,monthStart,calculate,save,load,mount});
});
