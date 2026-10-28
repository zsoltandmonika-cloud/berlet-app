/* SH9 MÁV Phase 2I · Smart Departure Assistant v611.
 * User-entered station time / travel minutes / buffer; NO live timetable or travel estimate.
 * Local-only, profile-separated, no GPS, fetch or background network access.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_DEPARTURE_V611=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const KEY_PREFIX='sh9-mav-departure-v1-';
const CHECKS=['Jegy / QR-kód','Telefon','Töltő','Személyes iratok','Csomag'];
const STATES=['prep','onway','boarded','arrived'];
const STATE_LABELS=['Készülődés','Úton az állomásra','Felszálltam','Megérkeztem'];
const profile=id=>id==='m'?'monika':'zsolt';
const key=id=>KEY_PREFIX+profile(id);
function localBudapest(date){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const out={};for(const p of parts)out[p.type]=p.value;
 return out.year+'-'+out.month+'-'+out.day+'T'+out.hour+':'+out.minute;
}
function instantForBudapest(local){
 if(typeof local!=='string'||!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))return null;
 const date=Date.parse(local+':00Z');if(!Number.isFinite(date))return null;
 const matches=[];
 // Europe/Budapest typically uses UTC+1/+2. Verify the actual date for DST gaps/overlaps.
 for(const offset of [60,120]){
  const dt=new Date(date-offset*60000);
  if(localBudapest(dt)===local)matches.push(dt);
 }
 return matches.sort((a,b)=>a-b)[0]||null;
}
function localFromTrip(trip){
 return trip?.mode==='depart'&&instantForBudapest(trip.when)?trip.when:'';
}
function safeSettings(raw){
 const t=Number(raw?.travel),b=Number(raw?.buffer);
 return {
  time:typeof raw?.time==='string'&&instantForBudapest(raw.time)?raw.time:'',
  travel:Number.isInteger(t)&&t>=5&&t<=180?t:45,
  buffer:Number.isInteger(b)&&b>=5&&b<=60?b:20,
  checklist:CHECKS.map((_,i)=>raw?.checklist?.[i]===true),
  status:STATES.includes(raw?.status)?raw.status:'prep'
 };
}
function load(storage,id,trip){
 const fallback=safeSettings(null);
 try{
  const value=JSON.parse(storage.getItem(key(id))||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value))return {...fallback,time:localFromTrip(trip)};
  const row=Object.prototype.hasOwnProperty.call(value,trip.id)?value[trip.id]:null;
  const s=safeSettings(row);
  return {...s,time:s.time||localFromTrip(trip)};
 }catch(_){return {...fallback,time:localFromTrip(trip)}}
}
/* v612 · Return only explicitly saved assistant data. No synthetic default
 * values and no cross-trip or cross-profile fallback. Read-only. */
function readSaved(storage,id,trip){
 if(!trip||! /^[a-zA-Z0-9_-]{5,64}$/.test(trip.id||''))return null;
 try{
  const rows=JSON.parse(storage.getItem(key(id))||'{}');
  if(!rows||typeof rows!=='object'||Array.isArray(rows)||!Object.prototype.hasOwnProperty.call(rows,trip.id))return null;
  const raw=rows[trip.id],value=safeSettings(raw);
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     typeof raw.time!=='string'||(raw.time!==''&&!instantForBudapest(raw.time))||
     !Number.isInteger(raw.travel)||raw.travel<5||raw.travel>180||
     !Number.isInteger(raw.buffer)||raw.buffer<5||raw.buffer>60||
     !Array.isArray(raw.checklist)||raw.checklist.length!==CHECKS.length||
     raw.checklist.some(v=>typeof v!=='boolean')||!STATES.includes(raw.status))return null;
  return value;
 }catch(_){return null}
}
function save(storage,id,trip,settings){
 const validated=safeSettings(settings);
 const rows=Object.create(null);
 try{
  const saved=JSON.parse(storage.getItem(key(id))||'{}');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
   for(const [k,v] of Object.entries(saved).slice(0,60))
    if(/^[a-zA-Z0-9_-]{5,64}$/.test(k))rows[k]=safeSettings(v);
  }
  rows[trip.id]=validated;
  // Keep 30 current saved-trip assistant configurations, never mix profiles.
  const entries=Object.entries(rows).slice(-30);
  storage.setItem(key(id),JSON.stringify(Object.fromEntries(entries)));
  return true;
 }catch(_){return false}
}
function calculate(time,travel,buffer,now=new Date()){
 const t=instantForBudapest(time),minutes=Number(travel),extra=Number(buffer);
 if(!t||!Number.isInteger(minutes)||minutes<5||minutes>180||
  !Number.isInteger(extra)||extra<5||extra>60)return null;
 const leave=new Date(t.getTime()-(minutes+extra)*60000);
 const remaining=Math.ceil((leave.getTime()-now.getTime())/60000);
 return {stationTime:time,leaveAt:leave.toISOString(),leaveLocal:localBudapest(leave),
  travelMinutes:minutes,bufferMinutes:extra,remainingMinutes:remaining,elapsed:remaining<=0};
}
function remainingLabel(calc){
 if(!calc)return 'Add meg a tervezett állomási időpontot.';
 if(calc.elapsed)return 'A számított indulási időpont már elmúlt.';
 const hours=Math.floor(calc.remainingMinutes/60),mins=calc.remainingMinutes%60;
 return hours>0?'Hátralévő idő: '+hours+' óra '+mins+' perc':'Hátralévő idő: '+mins+' perc';
}
function calendarItem(item,calc){
 if(!calc)return null;
 // Existing RFC5545 Budapest VTIMEZONE generator, but no assumed train running duration.
 return {id:'sd-'+item.id,from:'Otthon',to:item.from,mode:'depart',when:calc.leaveLocal};
}
function mount(doc,win){
 const get=id=>doc.getElementById(id),panel=get('rail-departure'),picker=get('rail-departure-station-time'),
  travel=get('rail-departure-travel'),buffer=get('rail-departure-buffer'),remaining=get('rail-departure-remaining'),
  summary=get('rail-departure-summary'),route=get('rail-departure-route'),note=get('rail-departure-note'),
  saveButton=get('rail-departure-save'),refresh=get('rail-departure-refresh'),
  exportButton=get('rail-departure-calendar'),checks=get('rail-departure-checklist'),
  states=get('rail-departure-status');
 if(!panel||!picker||!travel||!buffer||!remaining||!summary||!route||!note||
  !saveButton||!refresh||!exportButton||!checks||!states||!win.localStorage)return null;
 let selected=null,selectedProfile=null,timer=null;
 const store=win.localStorage,active=()=>doc.documentElement.dataset.profile==='m'?'m':'z';
 function toast(s){win.SH9_MAV_PLANNER_V607?.toast(s)}
 function stop(){if(timer!==null){win.clearInterval(timer);timer=null}}
 function currentTrip(){
  if(!selected||selectedProfile!==active())return null;
  return win.SH9_MAV_JOURNEY_MANAGER_V608?.read(store,active()).find(x=>x.id===selected.id)||null;
 }
 function fieldValues(){
  return {time:picker.value,travel:Number(travel.value),buffer:Number(buffer.value),
   checklist:Array.from(checks.querySelectorAll('input[type="checkbox"]')).map(n=>n.checked),
   status:states.querySelector('[aria-pressed="true"]')?.dataset.status||'prep'};
 }
 function statusLine(message){note.textContent=message}
 function update(){
  const item=currentTrip();if(!item){stop();return null}
  const calc=calculate(picker.value,Number(travel.value),Number(buffer.value),new Date());
  summary.textContent=calc?'Javasolt otthoni indulás: '+calc.leaveLocal.slice(0,10)+' · '+calc.leaveLocal.slice(11):
   'Az indulás számításához válassz érvényes, saját állomási időpontot.';
  remaining.textContent=remainingLabel(calc);
  exportButton.disabled=!calc;
  return calc;
 }
 function commit(){
  const item=currentTrip();
  if(!item){statusLine('Ez az utazás nem található az aktív profilban.');return false}
  const val=fieldValues();
  if(!calculate(val.time,val.travel,val.buffer)){statusLine('Adj meg érvényes állomási időpontot, utazási időt és ráhagyást.');return false}
  if(!save(store,active(),item,val)){statusLine('A helyi mentés nem sikerült. Ellenőrizd a telefon tárhelyét.');return false}
  statusLine('A személyes indulási terv elmentve. A megadott idők nem ellenőrzött BKK/MÁV adatok.');
  return true;
 }
 function renderChecks(settings){
  checks.replaceChildren();
  CHECKS.forEach((title,i)=>{
   const label=doc.createElement('label');label.className='rail-departure-check';
   const input=doc.createElement('input');input.type='checkbox';input.checked=settings.checklist[i];
   const text=doc.createElement('span');text.textContent=title;
   input.addEventListener('change',()=>{
    const item=currentTrip();if(!item)return;
    const val=fieldValues();
    if(save(store,active(),item,val))statusLine('Ellenőrzőlista mentve.');
    else statusLine('Az ellenőrzőlista mentése sikertelen.');
   });
   label.append(input,text);checks.append(label);
  });
 }
 function renderStatuses(current){
  states.replaceChildren();
  STATES.forEach((value,i)=>{
   const b=doc.createElement('button');b.type='button';b.className='rail-departure-state';
   b.dataset.status=value;b.textContent=STATE_LABELS[i];b.setAttribute('aria-pressed',String(value===current));
   b.addEventListener('click',()=>{
    const item=currentTrip();if(!item)return;
    for(const child of states.children)child.setAttribute('aria-pressed',String(child===b));
    if(save(store,active(),item,fieldValues()))statusLine('Utazási státusz mentve: '+STATE_LABELS[i]);
    else statusLine('A státusz mentése sikertelen.');
   });
   states.append(b);
  });
 }
 function open(item){
  const actual=win.SH9_MAV_JOURNEY_MANAGER_V608?.read(store,active()).find(x=>x.id===item?.id);
  if(!actual){toast('A mentett utazás nem található ebben a profilban.');return false}
  selected=actual;selectedProfile=active();stop();
  const settings=load(store,active(),actual);
  route.textContent=actual.from+' → '+actual.to+' · '+(actual.mode==='arrive'?'Tervezett érkezés':actual.mode==='depart'?'Tervezett indulás':'Indulás most')+
   ': '+actual.when.slice(0,10)+' '+actual.when.slice(11);
  picker.value=settings.time;travel.value=String(settings.travel);buffer.value=String(settings.buffer);
  renderChecks(settings);renderStatuses(settings.status);
  const warning=actual.mode==='depart'?
   'A mentett tervezett indulás előre be van töltve, de nem igazolt vonatindulás. Módosíthatod kézzel.':
   'Az eredeti terv nem tartalmaz tervezett vonatindulást. Add meg külön az állomáson kívánt időpontot; érkezési időből nem számolunk vonatindulást.';
  statusLine(warning);
  for(const d of doc.querySelectorAll('.drawer'))d.classList.remove('open');
  panel.classList.add('open');
  update();
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  // Local text update once per minute, only while the panel remains open/visible.
  if(typeof win.setInterval==='function')timer=win.setInterval(()=>{
   if(!panel.classList.contains('open')||doc.hidden||selectedProfile!==active()){stop();return}
   update();
  },60000);
  return true;
 }
 for(const input of [picker,travel,buffer]){
  input.addEventListener('input',update);input.addEventListener('change',update);
 }
 saveButton.addEventListener('click',commit);
 refresh.addEventListener('click',update);
 exportButton.addEventListener('click',()=>{
  const item=currentTrip(),calc=update(),generator=win.SH9_MAV_JOURNEY_MANAGER_V608;
  if(!item||!calc||!generator||typeof generator.ics!=='function'){toast('Nincs érvényes indulási időpont.');return}
  try{
   const reminder=calendarItem(item,calc);
   const blob=new win.Blob(['\uFEFF'+generator.ics(reminder)],{type:'text/calendar;charset=utf-8'});
   const href=win.URL.createObjectURL(blob),a=doc.createElement('a');
   a.href=href;a.download='sh9-indulasi-emlekezteto-'+item.id+'.ics';
   doc.body.append(a);a.click();a.remove();
   win.setTimeout(()=>win.URL.revokeObjectURL(href),1200);
   statusLine('A 15 perces személyes indulási emlékeztető letöltve; a készülék naptárába külön importálandó.');
  }catch(_){statusLine('A naptárfájl előállítása nem sikerült ezen a készüléken.')}
 });
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)update();else stop()});
 return {open,profileChanged(){selected=null;selectedProfile=null;stop();panel.classList.remove('open')},
  refresh:update,close:stop};
}
return Object.freeze({CHECKS,STATES,key,localBudapest,instantForBudapest,localFromTrip,
 safeSettings,load,readSaved,save,calculate,remainingLabel,calendarItem,mount});
});
if(typeof window!=='undefined'&&typeof document!=='undefined'&&window.SH9_MAV_DEPARTURE_V611){
 window.SH9_MAV_DEPARTURE_UI=window.SH9_MAV_DEPARTURE_V611.mount(document,window);
}
