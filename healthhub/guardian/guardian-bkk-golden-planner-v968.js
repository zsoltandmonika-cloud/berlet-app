/* HealthHub v968 · BKK Golden Standard Planner.
 * Reuses the REAL, wired search inputs, native mode buttons and BKK timetable.
 * MÁV, Volán and Smart Trip retain their approved layout and own engines.
 * Local, explicit trip saves only; no extra GPS/network requests. */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const KEY='hh-bkk-golden-trips-v968-';
 const $=id=>d.getElementById(id);
 const pad=n=>String(n).padStart(2,'0');
 const datePart=ms=>{const t=new Date(ms);return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())};
 const timePart=ms=>{const t=new Date(ms);return pad(t.getHours())+':'+pad(t.getMinutes())};
 const store=()=>{try{return w.localStorage}catch(_){return null}};
 const profile=()=>{try{return store()?.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 const valid=p=>!!p&&typeof p.name==='string'&&p.name.length>0&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);
 const read=()=>{
  try{const x=JSON.parse(store()?.getItem(KEY+profile())||'[]');return Array.isArray(x)?x.slice(0,20).filter(a=>a&&a.from&&a.to):[]}
  catch(_){return []}
 };
 const write=items=>{try{store()?.setItem(KEY+profile(),JSON.stringify(items.slice(0,20)));return true}catch(_){return false}};
 function init(){
  const hub=$('hhSmartHubDestinationV802'),nativePair=$('hhSmartHubPairedV806'),modePanel=$('hhPlannerTimeV939');
  const nativeMode=modePanel?.querySelector('.hh-planner-time-buttons-v939');
  const originalDate=$('hhPlannerDateV939'),status=$('hhSmartHubDestinationStatusV802');
  const originalPlan=$('hhSmartHubPlanV806'),catalog=$('hhBkkCatalogV801');
  if(!hub||!nativePair||!nativeMode||!originalDate||!originalPlan||$('hhBkkGoldenPlannerV968'))return;
  const panel=d.createElement('section');
  panel.id='hhBkkGoldenPlannerV968';panel.className='hh-bkk-golden-v968';
  panel.setAttribute('aria-label','BKK Golden Standard útvonaltervező');
  const head=d.createElement('div');head.className='hh-bkk-golden-head-v968';
  const title=d.createElement('h2');title.textContent='◫ Útvonaltervező';
  head.append(title,nativeMode);
  nativeMode.setAttribute('aria-label','Indulás most, indulás ekkor vagy érkezés ekkor');
  const depart=$('hhPlannerDepartV939'),arrive=$('hhPlannerArriveV939');
  if(depart)depart.textContent='Indulás ekkor';
  if(arrive)arrive.textContent='Érkezés ekkor';
  const route=d.createElement('div');route.className='hh-bkk-golden-routebox-v968';
  const rail=d.createElement('div');rail.className='hh-bkk-golden-rail-v968';
  rail.setAttribute('aria-hidden','true');
  rail.innerHTML='<span></span><span></span>';
  nativePair.prepend(rail);
  nativePair.querySelectorAll('.hh-smart-hub-field-v806').forEach(field=>{
   field.dataset.goldenField=field.querySelector('#hhSmartHubFromV806')?'from':'to';
  });
  const datetime=d.createElement('div');datetime.className='hh-bkk-golden-datetime-v968';
  datetime.innerHTML='<label class="hh-bkk-golden-date-v968" aria-label="Utazási dátum"><span aria-hidden="true">▦</span><b id="hhBkkGoldenDateLabelV968">Dátum</b><input type="date" id="hhBkkGoldenDateV968" aria-label="Utazási dátum kiválasztása"></label><label class="hh-bkk-golden-time-v968" aria-label="Utazási idő"><span aria-hidden="true">◷</span><b id="hhBkkGoldenTimeLabelV968">Idő</b><input type="time" id="hhBkkGoldenTimeV968" step="60" aria-label="Utazási idő kiválasztása"></label>';
  route.append(nativePair,datetime);
  const actions=d.createElement('div');actions.className='hh-bkk-golden-actions-v968';
  actions.innerHTML='<button type="button" class="hh-bkk-golden-search-v968" id="hhBkkGoldenFindV968">⌕ Útvonal keresése</button><button type="button" id="hhBkkGoldenScheduleV968" class="hh-bkk-golden-schedule-v968">↻ BKK járatok ↗</button>';
  const quick=d.createElement('div');quick.className='hh-bkk-golden-quick-v968';
  quick.innerHTML='<button type="button" id="hhBkkGoldenSaveV968">✚ Utazás mentése</button><button type="button" id="hhBkkGoldenJourneysV968" aria-controls="hhBkkGoldenTripsV968" aria-expanded="false">▣ Utazásaim</button>';
  const message=d.createElement('p');message.className='hh-bkk-golden-status-v968';
  message.id='hhBkkGoldenStatusV968';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const saved=d.createElement('section');saved.id='hhBkkGoldenTripsV968';
  saved.className='hh-bkk-golden-trips-v968';saved.hidden=true;
  saved.setAttribute('aria-label','BKK mentett utazások');
  panel.append(head,route,actions,quick,modePanel,message,saved);
  const oldTop=hub.querySelector('.hh-smart-hub-top-v802');
  if(oldTop)oldTop.hidden=true;
  hub.insertBefore(panel,hub.firstChild);
  const from=$('hhSmartHubFromV806'),to=$('hhSmartHubToV806');
  const date=$('hhBkkGoldenDateV968'),time=$('hhBkkGoldenTimeV968');
  const dateText=$('hhBkkGoldenDateLabelV968'),timeText=$('hhBkkGoldenTimeLabelV968');
  function notify(s){message.textContent=s||''}
  function mode(){return $('hhPlannerArriveV939')?.getAttribute('aria-pressed')==='true'?'arrive':
   $('hhPlannerDepartV939')?.getAttribute('aria-pressed')==='true'?'depart':'now'}
  const locale=new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric',weekday:'short',timeZone:'Europe/Budapest'});
  function sync(){
   const stamp=mode()==='now'?Date.now():Date.parse(originalDate.value);
   const value=Number.isFinite(stamp)?stamp:Date.now();
   date.value=datePart(value);
   time.value=timePart(value);
   dateText.textContent=locale.format(new Date(value));
   timeText.textContent=time.value;
   datetime.dataset.mode=mode();
  }
  function applyDate(){
   if(!date.value||!time.value)return;
   // The original router validates time and refreshes the actual timetable.
   if(mode()==='now')$('hhPlannerDepartV939')?.click();
   originalDate.value=date.value+'T'+time.value;
   originalDate.dispatchEvent(new Event('change',{bubbles:true}));
   sync();
  }
  for(const element of nativeMode.querySelectorAll('button')){
   element.addEventListener('click',()=>{
    w.requestAnimationFrame?w.requestAnimationFrame(sync):w.setTimeout(sync,0);
   });
  }
  date.addEventListener('change',applyDate);
  time.addEventListener('change',applyDate);
  sync();
  // Update display when the phone becomes active, no background polling.
  w.addEventListener('focus',sync);
  function search(){
   notify('');
   if(!from.value.trim()){notify('Válassz ellenőrzött indulási helyet.');from.focus();return}
   if(!to.value.trim()){notify('Válassz ellenőrzött úti célt.');to.focus();return}
   if(originalPlan.disabled){
    notify('A címeket a felugró javaslatlistából kell kiválasztani, így ellenőrzött útvonal készül.');
    to.focus();return;
   }
   originalPlan.click();
   const plans=$('hhSmartHubTripPlansV804');
   if(plans)plans.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  $('hhBkkGoldenFindV968').addEventListener('click',search);
  $('hhBkkGoldenScheduleV968').addEventListener('click',()=>{
   if(!catalog)return;
   catalog.open=true;
   catalog.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  function renderTrips(){
   saved.replaceChildren();
   const heading=d.createElement('strong');heading.textContent='Saját BKK-utazások · '+(profile()==='m'?'Mónika':'Zsolt');
   saved.append(heading);
   const list=read();
   if(!list.length){
    const empty=d.createElement('p');empty.textContent='Még nincs mentett BKK-utazás ennél a profilnál.';
    saved.append(empty);return;
   }
   list.forEach((item,index)=>{
    const row=d.createElement('div');row.className='hh-bkk-golden-saved-v968';
    const label=d.createElement('span');label.textContent=item.from.name+' → '+item.to.name+
     (item.when?' · '+item.when.replace('T',' '):' · indulás most');
    const reopen=d.createElement('button');reopen.type='button';reopen.textContent='Újratervezés';
    reopen.addEventListener('click',()=>{
     if(!valid(item.from)||!valid(item.to)){notify('Az utazás címei nem használhatók.');return}
     w.dispatchEvent(new CustomEvent('hh-guardian-map-origin-v836',{detail:item.from}));
     w.dispatchEvent(new CustomEvent('hh-guardian-map-destination-v819',{detail:item.to}));
     if(item.mode!=='now'&&item.when){
      const btn=$(item.mode==='arrive'?'hhPlannerArriveV939':'hhPlannerDepartV939');
      btn?.click();originalDate.value=item.when;
      originalDate.dispatchEvent(new Event('change',{bubbles:true}));
     }else $('hhPlannerNowV939')?.click();
     sync();saved.hidden=true;$('hhBkkGoldenJourneysV968').setAttribute('aria-expanded','false');
     notify('Mentett helyek betöltve. Ellenőrizd a friss menetrendi találatot.');
    });
    const del=d.createElement('button');del.type='button';del.textContent='Törlés';del.setAttribute('aria-label',item.from.name+' – '+item.to.name+' törlése');
    del.addEventListener('click',()=>{const items=read();items.splice(index,1);if(write(items))renderTrips();else notify('A helyi tárhely nem írható.');});
    row.append(label,reopen,del);saved.append(row);
   });
  }
  $('hhBkkGoldenSaveV968').addEventListener('click',()=>{
   const selected=w.HH_SMART_HUB_ROUTER_V804?.selection;
   if(!valid(selected?.start)||!valid(selected?.target)){
    notify('Mentéshez válassz két ellenőrzött címet a keresőből.');return;
   }
   const trim=p=>({name:p.name.slice(0,120),lat:p.lat,lng:p.lng});
   const trip={from:trim(selected.start),to:trim(selected.target),
    mode:mode(),when:mode()==='now'?null:originalDate.value,created:Date.now()};
   const items=read();items.unshift(trip);
   if(!write(items)){notify('A böngésző helyi tárhelyére nem sikerült menteni.');return}
   notify('✓ Utazás mentve az aktív profilhoz, kizárólag ezen az eszközön.');
   if(!saved.hidden)renderTrips();
  });
  $('hhBkkGoldenJourneysV968').addEventListener('click',e=>{
   saved.hidden=!saved.hidden;e.currentTarget.setAttribute('aria-expanded',String(!saved.hidden));
   if(!saved.hidden)renderTrips();
  });
  const switcher=$('guardianProfileSwitch');
  if(switcher)switcher.addEventListener('click',()=>{
   w.setTimeout(()=>{if(!saved.hidden)renderTrips();notify('')},0);
  });
  w.addEventListener('storage',event=>{
   if(event.key==='hh-profile'||event.key?.startsWith(KEY)){if(!saved.hidden)renderTrips();}
  });
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
