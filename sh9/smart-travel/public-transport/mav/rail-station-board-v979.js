/* SH9 Smart Rail v979 · Native station departures, approved local GTFS only.
 * No static train fakes, GPS, network requests, Supabase or background polling.
 * A board appears after an explicit user click, with verified calendar dates.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_STATION_BOARD_V979=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TZ='Europe/Budapest',HOUR_MS=3600000,MAX_HOURS=24;
 const clock=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:TZ,hourCycle:'h23'});
 const short=x=>String(x??'').trim().slice(0,120);
 const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU');
 function boardDepartures(data,core,station,when,{limit=20,hours=MAX_HOURS}={}){
  if(!data||!core||!Array.isArray(data.stops)||!Array.isArray(data.trips)||
    !data.services||!data.localOnly||data.rightsConfirmed!==false||
    !(when instanceof Date)||!Number.isFinite(when.getTime())||
    typeof station!=='string'||station.trim().length<2)
   return {status:'invalid',rows:[]};
  const stations=new Map(data.stops);
  const ids=new Set(core.stationIds({stops:stations},station));
  if(!ids.size)return {status:'unknown-station',rows:[]};
  const day=core.budapestDay(when),start=when.getTime();
  const length=Math.min(24,Math.max(1,Math.floor(Number(hours)||24)))*HOUR_MS;
  const until=start+length,rows=[],activities=new Map();
  const names=new Map(data.stops);
  // Include the previous GTFS service day for overnight times beyond 24:00.
  for(let offset=-1;offset<=1;offset++){
   const serviceDay=core.dayShift(day,offset);
   if(!serviceDay)continue;
   for(const trip of data.trips){
    const key=serviceDay+'|'+trip.service;
    let active=activities.get(key);
    if(active===undefined){
     active=core.serviceActive(data.services[trip.service],serviceDay);
     activities.set(key,active);
    }
    if(!active||!Array.isArray(trip.stops)||trip.stops.length<2)continue;
    for(let i=0;i<trip.stops.length-1;i++){
     const [stopId,arrival,depart]=trip.stops[i];
     if(!ids.has(stopId)||!Number.isInteger(depart))continue;
     const epoch=core.wallEpoch(serviceDay,depart);
     if(!Number.isFinite(epoch)||epoch<start||epoch>=until)continue;
     const terminus=trip.stops[trip.stops.length-1][0];
     const direction=short(trip.headsign||names.get(terminus)||'');
     rows.push({id:String(trip.id||''),stopId,station:names.get(stopId)||station,
      departure:epoch,service:short(trip.route||'MÁV vonat'),direction,
      destination:names.get(terminus)||direction,live:false,delayMinutes:null,platform:null});
    }
   }
  }
  rows.sort((a,b)=>a.departure-b.departure||a.service.localeCompare(b.service,'hu'));
  return {status:'ok',station:short(station),source:short(data.source||'MÁV GTFS'),
   windowStart:start,windowEnd:until,total:rows.length,
   rows:rows.slice(0,Math.max(1,Math.min(100,Math.floor(Number(limit)||20))))};
 }
 function mount(doc,win){
  if(!doc||!win||!doc.getElementById)return null;
  const core=win.SH9_MAV_GTFS_CORE_V1,privateFeed=()=>win.SH9_MAV_PRIVATE_GTFS_V2;
  const depart=doc.getElementById('depart'),from=doc.getElementById('from');
  if(!core||!depart||!from||doc.getElementById('railStationBoardV979'))return null;
  const el=(tag,cls,txt)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
  const section=el('section','rail-board-v979 glass');section.id='railStationBoardV979';section.hidden=true;
  section.setAttribute('aria-label','MÁV állomási menetrendi indulások');
  const head=el('div','rail-board-head-v979');
  const title=el('strong','rail-board-title-v979','🚆 Állomási indulások');
  const close=el('button','rail-board-close-v979','✕');close.type='button';close.setAttribute('aria-label','Állomási indulások bezárása');
  head.append(title,close);section.append(head);
  const controls=el('div','rail-board-controls-v979');
  const stationLabel=el('label','rail-board-station-v979');
  stationLabel.append(el('span','','Állomás'));
  const stationInput=el('input','rail-board-input-v979');stationInput.id='railBoardStationV979';
  stationInput.type='text';stationInput.placeholder='Pl. Budapest-Keleti';stationInput.autocomplete='off';
  stationInput.setAttribute('list','railBoardStationsV979');stationInput.setAttribute('aria-label','Állomás keresése');
  const suggestions=el('datalist');suggestions.id='railBoardStationsV979';
  stationLabel.append(stationInput,suggestions);controls.append(stationLabel);
  const dateline=el('div','rail-board-date-row-v979');
  const dateLabel=el('label','');dateLabel.append(el('span','','Nap'));
  const dateInput=el('input');dateInput.type='date';dateInput.id='railBoardDayV979';
  dateInput.setAttribute('aria-label','Állomási indulások dátuma');dateLabel.append(dateInput);
  const timeLabel=el('label','');timeLabel.append(el('span','','Indulás ettől'));
  const timeInput=el('input');timeInput.type='time';timeInput.id='railBoardTimeV979';
  timeInput.setAttribute('aria-label','Indulások kezdő időpontja');timeLabel.append(timeInput);
  dateline.append(dateLabel,timeLabel);controls.append(dateline);
  const actions=el('div','rail-board-actions-v979');
  const now=el('button','rail-board-now-v979','◷ Most');now.type='button';
  const count=el('select','rail-board-count-v979');count.setAttribute('aria-label','Indulások megjelenített száma');
  for(const n of [10,20,40,100]){const option=el('option','',n+' indulás');option.value=String(n);if(n===20)option.selected=true;count.append(option);}
  const go=el('button','rail-board-go-v979','🔎 Indulások keresése');go.type='button';
  actions.append(now,count,go);controls.append(actions);section.append(controls);
  const message=el('p','rail-board-status-v979');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  section.append(message);
  const rows=el('div','rail-board-results-v979');rows.id='railBoardResultsV979';section.append(rows);
  const footer=el('small','rail-board-footer-v979','MÁV GTFS · csak menetrendi adatok. Nem élő indulás, késés vagy vágányinformáció. A betöltött adatok csak ezen a készüléken maradnak.');
  section.append(footer);
  depart.parentNode.insertBefore(section,depart);
  close.addEventListener('click',()=>{section.hidden=true;close.blur()});
  const currentDay=()=>core.budapestDay(new Date());
  const currentTime=()=>clock.format(new Date()).replace(/\s/g,'');
  const resetTime=()=>{dateInput.value=currentDay();timeInput.value=currentTime();};
  resetTime();
  function updateSuggestions(){
   const dataset=privateFeed()?.getDataset?.();
   suggestions.replaceChildren();if(!dataset?.stops)return;
   const needle=fold(stationInput.value).trim();
   const unique=[...new Set(dataset.stops.map(x=>x[1]))];
   const items=needle?unique.filter(x=>fold(x).includes(needle)).slice(0,45):
    unique.filter(x=>/Budapest-Keleti|Budapest-Nyugati|Miskolc-Tiszai|Kazincbarcika|Debrecen|Szolnok/.test(x)).slice(0,45);
   const frag=doc.createDocumentFragment();
   for(const name of items){const option=el('option');option.value=name;frag.append(option);}
   suggestions.append(frag);
  }
  stationInput.addEventListener('input',updateSuggestions);
  stationInput.addEventListener('focus',updateSuggestions);
  function selectedWhen(){
   if(!/^\d{4}-\d\d-\d\d$/.test(dateInput.value)||!/^\d\d:\d\d$/.test(timeInput.value))return null;
   const [hours,minutes]=timeInput.value.split(':').map(Number);
   const epoch=core.wallEpoch(dateInput.value,hours*60+minutes);
   return Number.isFinite(epoch)?new Date(epoch):null;
  }
  function render(data){
   rows.replaceChildren();
   if(!data||data.status!=='ok'){message.textContent='Az állomás nem található a saját MÁV menetrendben. Válassz egy javasolt állomást.';return;}
   if(!data.rows.length){
    message.textContent='Nincs menetrendi indulás a kiválasztott 24 órában. Próbálj másik időpontot vagy állomást.';
    return;
   }
   message.textContent=data.total+' indulás a következő 24 órában · időrendi sorrend · tervezett menetrend';
   const showingToday=dateInput.value===currentDay();
   for(const item of data.rows){
    const row=el('article','rail-board-row-v979');
    const clockBox=el('div','rail-board-clock-v979');
    const dt=el('strong','',clock.format(new Date(item.departure)));clockBox.append(dt);
    if(showingToday){
     const delta=Math.ceil((item.departure-Date.now())/60000);
     if(delta>=0&&delta<=120)clockBox.append(el('small','',delta+' perc múlva'));
    }
    const content=el('div','rail-board-row-copy-v979');
    content.append(el('strong','',item.service),
      el('span','','Irány: '+(item.direction||item.destination||'ismeretlen')));
    const kind=el('small','rail-board-schedule-v979','Menetrend');
    row.append(clockBox,content,kind);
    rows.append(row);
   }
  }
  let busy=false;
  function search(){
   if(busy)return;
   const dataset=privateFeed()?.getDataset?.();
   if(!dataset){message.textContent='Előbb töltsd be a saját MÁV GTFS-fájlt az útvonaltervezőben.';rows.replaceChildren();return;}
   const when=selectedWhen();
   if(!when){message.textContent='Válassz érvényes dátumot és időpontot.';return;}
   busy=true;go.disabled=true;message.textContent='Állomási menetrend keresése a helyi GTFS-ben…';
   // Yield once to paint loading status; no network activity.
   win.setTimeout(()=>{
    try{render(boardDepartures(dataset,core,stationInput.value,when,{limit:Number(count.value)}));}
    catch(_){rows.replaceChildren();message.textContent='A helyi GTFS menetrend nem dolgozható fel. Ellenőrizd a betöltött fájlt.';}
    finally{busy=false;go.disabled=false}
   },0);
  }
  go.addEventListener('click',search);
  stationInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});
  now.addEventListener('click',()=>{resetTime();search()});
  count.addEventListener('change',()=>{if(!section.hidden)search()});
  dateInput.addEventListener('change',()=>{if(dateInput.value!==currentDay())timeInput.value='00:00'});
  function open(name){
   stationInput.value=short(name||from.value)||'Budapest-Keleti';
   resetTime();section.hidden=false;updateSuggestions();
   search();section.scrollIntoView?.({behavior:'smooth',block:'start'});
   return true;
  }
  // The existing links have separate official fallbacks, but board clicks
  // first open the native timetable. Other MÁV actions are never intercepted.
  doc.addEventListener('click',function(e){
   const trigger=e.target?.closest?.('[data-rail-action="board"]');
   if(!trigger)return;
   e.preventDefault();e.stopImmediatePropagation();
   open(from.value);
  },true);
  const api=Object.freeze({open,search,version:'979'});
  win.SH9_MAV_STATION_BOARD_V979=api;
  return api;
 }
 return Object.freeze({boardDepartures,mount,version:'979'});
});
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const instance=window.SH9_MAV_STATION_BOARD_V979.mount(document,window);
 if(instance)window.SH9_MAV_STATION_BOARD_V979=Object.freeze({...window.SH9_MAV_STATION_BOARD_V979,...instance});
}
