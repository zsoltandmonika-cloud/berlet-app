/* SH9 Smart Rail v980 · GPS nearby next MÁV trains.
 * The user's private GTFS JSON must include [stop_id,name,lat,lng] station
 * coordinates. All calculations are local. User-initiated one-shot GPS ONLY.
 * This does not fetch, publish, synchronize, or poll train data.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_NEARBY_V980=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TZ='Europe/Budapest',RANGES=[750,1500,3000,5000],COUNTS=[10,20,40];
 const clock=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:TZ,hourCycle:'h23'});
 const radians=Math.PI/180;
 const validLatLng=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&
   Math.abs(lat)<=90&&Math.abs(lng)<=180;
 function meters(a,b,c,d){
  const la1=a*radians,la2=c*radians;
  const delta=(c-a)*radians,dlon=(d-b)*radians;
  const sin=Math.sin(delta/2),slon=Math.sin(dlon/2);
  return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(sin*sin+
    Math.cos(la1)*Math.cos(la2)*slon*slon))));
 }
 // Estimates only: straight-line distance ×1.3 / 70m per minute + 2 minutes
 // station/boarding buffer. Not a confirmed walking route or live ETA.
 function estimateWalk(m){return Math.max(2,Math.ceil(m*1.3/70)+2)}
 function catchability(row,now=Date.now()){
  const spare=(row.departure-now)/60000-row.walkMinutes;
  return {state:spare>=7?'green':spare>=3?'amber':'red',
   spareMinutes:Math.floor(spare),
   waitMinutes:Math.max(0,Math.ceil((row.departure-now)/60000))};
 }
 function nearbyStations(data,fix,radius=3000){
  if(!data||!Array.isArray(data.stops)||!fix||!validLatLng(fix.lat,fix.lng))return [];
  const found=[];
  for(const entry of data.stops){
   if(!Array.isArray(entry)||entry.length<4||!validLatLng(entry[2],entry[3]))continue;
   const distance=meters(fix.lat,fix.lng,entry[2],entry[3]);
   if(distance>radius)continue;
   found.push({id:String(entry[0]),name:String(entry[1]).slice(0,140),
    lat:entry[2],lng:entry[3],meters:distance,walkMinutes:estimateWalk(distance)});
  }
  return found.sort((a,b)=>a.meters-b.meters);
 }
 function nextTrains(data,core,fix,now=Date.now(),options={}){
  if(!data||data.localOnly!==true||data.rightsConfirmed!==false||
   !Array.isArray(data.stops)||!Array.isArray(data.trips)||
   !data.services||!core||!Number.isFinite(now)||!fix||
   !validLatLng(fix.lat,fix.lng))return {status:'invalid',stations:[],rows:[]};
  const radius=RANGES.includes(options.radius)?options.radius:3000;
  const limit=COUNTS.includes(options.limit)?options.limit:20;
  const stations=nearbyStations(data,fix,radius);
  if(!stations.length)return {status:'no-nearby',stations,rows:[],total:0};
  const stopSet=new Map(stations.map(s=>[s.id,s]));
  const stopNames=new Map(data.stops.map(s=>[String(s[0]),String(s[1])]));
  const day=core.budapestDay(new Date(now));
  const to=now+12*3600000,rows=[],activity=new Map(),seen=new Set();
  for(const dayOffset of [-1,0,1]){
   const serviceDay=core.dayShift(day,dayOffset);
   if(!serviceDay)continue;
   for(const trip of data.trips){
    if(!Array.isArray(trip.stops)||trip.stops.length<2)continue;
    const key=serviceDay+'|'+trip.service;
    let active=activity.get(key);
    if(active===undefined){
     active=core.serviceActive(data.services[trip.service],serviceDay);
     activity.set(key,active);
    }
    if(!active)continue;
    // The arrival-only final station is not a departure.
    const final=trip.stops[trip.stops.length-1][0];
    const direction=String(trip.headsign||'').trim();
    const endName=stopNames.get(String(final))||direction||'Végállomás';
    const destination=(direction&&!/^\d+[A-Za-z]?\s*$/.test(direction))?direction:endName;
    for(let i=0;i<trip.stops.length-1;i++){
     const event=trip.stops[i],site=stopSet.get(String(event[0]));
     if(!site)continue;
     const departure=core.wallEpoch(serviceDay,event[2]);
     if(!Number.isFinite(departure)||departure<now||departure>=to)continue;
     const id=String(trip.id)+'|'+site.id+'|'+departure;
     if(seen.has(id))continue;seen.add(id);
     rows.push({id,tripId:String(trip.id),station:site.name,stopId:site.id,
      service:String(trip.route||'MÁV vonat').slice(0,90),destination:String(destination).slice(0,120),
      departure,meters:site.meters,walkMinutes:site.walkMinutes,
      live:false,delayMinutes:null,platform:null});
    }
   }
  }
  rows.sort((a,b)=>a.departure-b.departure||a.meters-b.meters||
    a.service.localeCompare(b.service,'hu'));
  // Red departures remain visible, but the final shown row must give the
  // next plausibly reachable alternative when the earliest rows are all red.
  let shown=rows.slice(0,limit);
  if(shown.length&&shown.every(x=>catchability(x,now).state==='red')){
   const alternative=rows.find(x=>catchability(x,now).state!=='red');
   if(alternative&&!shown.includes(alternative)){
    shown[shown.length-1]=alternative;
    shown.sort((a,b)=>a.departure-b.departure||a.meters-b.meters);
   }
  }
  return {status:'ok',stations,total:rows.length,rows:shown,
   timestamp:now,radius,limit};
 }
 function mount(doc,win){
  const $=id=>doc.getElementById(id);
  const planner=$('planner'),core=win.SH9_MAV_GTFS_CORE_V1;
  const dataset=()=>win.SH9_MAV_PRIVATE_GTFS_V2?.getDataset?.();
  if(!planner||!core||$('railNearbyQuickV980'))return null;
  const actions=planner.querySelector('.actions');
  if(!actions)return null;
  const el=(tag,cls,txt)=>{
   const x=doc.createElement(tag);if(cls)x.className=cls;
   if(txt!==undefined)x.textContent=txt;return x;
  };
  const profile=()=>doc.documentElement?.dataset?.profile==='m'?'m':'z';
  const key=()=> 'sh9-mav-nearby-v980-'+profile();
  function loadSettings(){
   let raw={};try{raw=JSON.parse(win.localStorage.getItem(key())||'{}')||{}}catch(_){}
   return {radius:RANGES.includes(raw.radius)?raw.radius:3000,
    limit:COUNTS.includes(raw.limit)?raw.limit:20};
  }
  function saveSettings(value){try{win.localStorage.setItem(key(),JSON.stringify(value))}catch(_){}}
  const button=el('button','rail-near-open-v980','📍 Innen · Következő vonatok');
  button.type='button';button.id='railNearbyQuickV980';
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','railNearbyPanelV980');
  const panel=el('section','rail-near-panel-v980 glass');panel.id='railNearbyPanelV980';
  panel.hidden=true;panel.setAttribute('aria-label','Közeli állomások következő menetrendi vonatai');
  const header=el('div','rail-near-head-v980');
  const title=el('strong','','📍 Következő vonatok innen');
  const close=el('button','rail-near-close-v980','✕');close.type='button';
  close.setAttribute('aria-label','Következő vonatok panel bezárása');
  header.append(title,close);
  const settings=el('details','rail-near-settings-v980');
  const summary=el('summary','','⚙️ Távolság és találatszám szerkesztése');
  const controls=el('div','rail-near-controls-v980');
  const radiusLabel=el('label','','Keresési távolság');
  const radiusSelect=el('select');radiusSelect.setAttribute('aria-label','Keresési távolság');
  for(const n of RANGES){const opt=el('option','',n+' m');opt.value=String(n);radiusSelect.append(opt);}
  radiusLabel.append(radiusSelect);
  const countLabel=el('label','','Indulások száma');
  const countSelect=el('select');countSelect.setAttribute('aria-label','Indulások száma');
  for(const n of COUNTS){const opt=el('option','',n+' indulás');opt.value=String(n);countSelect.append(opt);}
  countLabel.append(countSelect);controls.append(radiusLabel,countLabel);
  settings.append(summary,controls);
  const status=el('p','rail-near-status-v980');status.id='railNearbyStatusV980';
  status.setAttribute('aria-live','polite');status.setAttribute('role','status');
  const results=el('div','rail-near-results-v980');results.id='railNearbyResultsV980';
  const foot=el('small','rail-near-foot-v980',
   'Helyben számított GTFS-menetrend, nem élő vonatpozíció. Sétaidő: légvonal ×1,3 és 2 perc ráhagyás. Zöld: ≥7 perc tartalék, sárga: 3–7 perc, piros: 3 percnél kevesebb. A tényleges gyalogút és vágány eltérhet.');
  panel.append(header,settings,status,results,foot);
  actions.insertAdjacentElement('afterend',button);
  button.insertAdjacentElement('afterend',panel);
  const settingsNow=()=>({radius:Number(radiusSelect.value),limit:Number(countSelect.value)});
  function populate(){const p=loadSettings();radiusSelect.value=String(p.radius);countSelect.value=String(p.limit);}
  let previousFix=null,previousAt=null,busy=false;
  function render(data,at){
   results.replaceChildren();
   if(data.status==='invalid'){status.textContent='⚠️ A saját menetrend nem ellenőrizhető.';return;}
   if(data.status==='no-nearby'){
    status.textContent='Nincs MÁV-megálló a kiválasztott '+data.radius+' méteres körzetben. Növeld a távolságot.';
    return;
   }
   if(!data.rows.length){
    status.textContent='A közeli '+data.stations.length+' állomáson nincs menetrendi indulás a következő 12 órában.';
    return;
   }
   status.textContent=data.stations.length+' közeli állomás · '+data.total+' indulás 12 órán belül · időrendi sorrend · egyszeri GPS, nem élő';
   for(const item of data.rows){
    const state=catchability(item,at);
    const row=el('article','rail-near-row-v980');row.dataset.reach=state.state;
    const side=el('div','rail-near-time-v980');
    side.append(el('strong','',clock.format(new Date(item.departure))),
      el('small','',state.waitMinutes+' perc múlva'));
    const content=el('div','rail-near-copy-v980');
    content.append(el('strong','',item.service+' · '+item.station),
      el('span','','Irány: '+item.destination),
      el('small','',item.meters+' m légvonal · kb. '+item.walkMinutes+' perc gyalog'));
    const risk=el('div','rail-near-risk-v980',
      state.state==='green'?'● Elérhetőnek tűnik':
      state.state==='amber'?'● Sietni kell':'● Valószínűleg lekésed');
    risk.setAttribute('aria-label','Becsült elérési esély: '+risk.textContent);
    row.append(side,content,risk);results.append(row);
   }
  }
  function rerender(){
   if(!previousFix||!previousAt)return;
   const raw=dataset();if(!raw)return;
   render(nextTrains(raw,core,previousFix,previousAt,settingsNow()),previousAt);
  }
  function edited(){
   saveSettings(settingsNow());rerender();
  }
  radiusSelect.addEventListener('change',edited);
  countSelect.addEventListener('change',edited);
  close.addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false')});
  function gps(){
   return new Promise((resolve,reject)=>{
    const g=win.navigator?.geolocation;
    if(!g?.getCurrentPosition){reject(Error('A böngésző nem támogatja a helymeghatározást.'));return;}
    g.getCurrentPosition(p=>{
     const fix={lat:p?.coords?.latitude,lng:p?.coords?.longitude,accuracy:p?.coords?.accuracy};
     if(!validLatLng(fix.lat,fix.lng)||!Number.isFinite(fix.accuracy)||fix.accuracy>750)
      reject(Error('A GPS-helyzet túl pontatlan. Nyílt területen próbáld újra.'));
     else resolve(fix);
    },e=>reject(Error(e?.code===1?
     'Engedélyezd az egyszeri helymeghatározást a böngészőnek.':
     'Nem sikerült GPS-helyzetet kérni. Próbáld újra.')),
    {enableHighAccuracy:false,timeout:12000,maximumAge:60000});
   });
  }
  async function search(){
   if(busy)return;
   panel.hidden=false;button.setAttribute('aria-expanded','true');
   populate();
   results.replaceChildren();previousFix=null;previousAt=null;
   const raw=dataset();
   if(!raw){status.textContent='Előbb töltsd be a MÁV GTFS-adatfájlt a tervezőben.';return;}
   if(!raw.stops.some(s=>s.length>=4&&validLatLng(s[2],s[3]))){
    status.textContent='⚠️ A régi menetrendből hiányoznak a koordináták. Töltsd be a v980-as GPS-menetrend JSON-fájlját a MÁV GTFS importnál.';
    return;
   }
   busy=true;button.disabled=true;
   status.textContent='Egyszeri GPS-helyzet kérése…';
   try{
    const fix=await gps(),at=Date.now();
    previousFix=fix;previousAt=at;
    status.textContent='Közeli állomások és indulások keresése a helyi GTFS-ben…';
    win.setTimeout(()=>{
     try{
      const data=nextTrains(raw,core,fix,at,settingsNow());
      render(data,at);
      panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});
     }catch(_){status.textContent='A közeli indulások feldolgozása sikertelen.';}
     finally{busy=false;button.disabled=false}
    },0);
   }catch(e){
    status.textContent='⚠️ '+String(e?.message||'GPS-keresés nem sikerült.');
    busy=false;button.disabled=false;
   }
  }
  button.addEventListener('click',search);
  return Object.freeze({search,version:'980'});
 }
 const api=Object.freeze({meters,estimateWalk,catchability,nearbyStations,nextTrains,mount,version:'980'});
 return api;
});
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 window.SH9_MAV_NEARBY_V980_INSTANCE=window.SH9_MAV_NEARBY_V980.mount(document,window);
}
