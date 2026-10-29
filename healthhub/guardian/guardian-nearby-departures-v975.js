/* HealthHub / SH9 BKK v975 · one-tap nearby planned departures.
 * Explicit one-shot GPS ONLY when the user taps Quick Search. No background
 * tracking, GPS sharing, polling, Supabase, or phantom real-time departures.
 * Uses the EXISTING BKK GTFS stop graph and authenticated? NO: public schedule.
 * Current official compact schedule covers 260/17/19/1/41 only.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const LINES=new Set(['260','17','19','1','41']);
 const PREF='hh-bkk-nearby-quick-prefs-v975-';
 const profile=()=>{try{return w.localStorage?.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 function readPrefs(){
  let raw={};try{raw=JSON.parse(w.localStorage?.getItem(PREF+profile())||'{}')||{}}catch(_){}
  const lines=Array.isArray(raw.lines)?raw.lines.filter(x=>LINES.has(x)):Array.from(LINES);
  return {lines:lines.length?Array.from(new Set(lines)):Array.from(LINES),
   radius:[300,600,1200].includes(raw.radius)?raw.radius:1200,
   limit:[5,10,15].includes(raw.limit)?raw.limit:10};
 }
 function savePrefs(p){
  try{w.localStorage?.setItem(PREF+profile(),JSON.stringify(p))}catch(_){}
 }
 const script=d.currentScript;
 const base=script?.src?new URL('./',script.src):new URL('/berlet-app/healthhub/guardian/',w.location.origin);
 const urls={network:new URL('bkk-network-v806.json',base).href,
  timetable:new URL('bkk-timetable-v859.json',base).href};
 const $=id=>d.getElementById(id);
 let bundle=null,loading=null,working=false;
 const fmt=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit'});
 function dist(a,b){
  const r=Math.PI/180,m=(a.lat+b.lat)/2*r;
  return Math.round(6371000*Math.hypot((a.lat-b.lat)*r,(a.lng-b.lng)*r*Math.cos(m)));
 }
 function geo(){
  return new Promise((resolve,reject)=>{
   if(!w.navigator?.geolocation?.getCurrentPosition){
    reject(Error('A böngésző nem támogatja a GPS-helymeghatározást.'));return;
   }
   w.navigator.geolocation.getCurrentPosition(p=>{
    const c=p?.coords;
    if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
      Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||
      !Number.isFinite(c.accuracy)||c.accuracy>500){
      reject(Error('A GPS nem adott elég pontos helyzetet. Nyílt területen próbáld újra.'));return;
    }
    resolve({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy});
   },e=>{
    const denied=e?.code===1;
    reject(Error(denied?'Engedélyezd a helymeghatározást a böngészőnek ehhez az egyszeri kereséshez.':
      'A GPS-helyzet most nem érhető el. Próbáld újra.'))
   },{enableHighAccuracy:false,maximumAge:30000,timeout:10000});
  });
 }
 async function load(){
  if(bundle&&Date.now()-bundle.loadedAt<15*60000)return bundle;
  if(loading)return loading;
  loading=(async()=>{
   const matcher=w.HH_BKK_TIMETABLE_V859;
   if(!matcher?.validate)throw Error('A hitelesített BKK-menetrendi ellenőrző még nem töltődött be.');
   const [a,b]=await Promise.all([w.fetch(urls.network,{cache:'default'}),
     w.fetch(urls.timetable,{cache:'default'})]);
   if(!a.ok||!b.ok)throw Error('A BKK menetrendi adatforrás átmenetileg nem elérhető.');
   const [network,timetable]=await Promise.all([a.json(),b.json()]);
   const age=Date.now()-Date.parse(network?.generatedAt||'');
   if(network?.schemaVersion!==1||network?.source!=='BKK Zrt., CC BY 4.0'||
    !Array.isArray(network.routes)||!Number.isFinite(age)||age< -60000||age>14*86400000)
    throw Error('A BKK megállóhálózat adata nem ellenőrizhető vagy túl régi.');
   const validated=matcher.validate(timetable);
   if(!validated)throw Error('A BKK menetrend túl régi vagy érvénytelen. Várjuk a friss hivatalos adatot.');
   bundle={network,calendar:validated,loadedAt:Date.now()};
   return bundle;
  })();
  try{return await loading}finally{loading=null}
 }
 function near(network,location,maxMeters=1200,allowed=LINES){
  const point={lat:location.lat,lng:location.lng},places=new Map();
  for(const route of network.routes){
   const line=String(route.id||'');
   if(!LINES.has(line)||!allowed.has(line)||!Array.isArray(route.stops))continue;
   for(const raw of route.stops){
    if(!Array.isArray(raw)||raw.length<4)continue;
    const [id,name,lat,lng]=raw;
    if(typeof id!=='string'||typeof name!=='string'||
       !Number.isFinite(lat)||!Number.isFinite(lng))continue;
    const meters=dist(point,{lat,lng});
    if(meters>maxMeters)continue;
    const key=line+'|'+id;
    if(!places.has(key)||places.get(key).meters>meters)
     places.set(key,{line,id,name:name.slice(0,120),headsign:String(route.headsign||'').slice(0,100),
      meters,walkMinutes:Math.ceil(meters/65)+1});
   }
  }
  return Array.from(places.values()).sort((a,b)=>a.meters-b.meters);
 }
 // The walk is a straight-line estimate, not a verified pedestrian route.
 // Conservative buffers: >=7 minutes is green, 3..7 amber, below 3 red.
 // Never describe these as a live ETA or a guarantee of catching the vehicle.
 function reachability(item,now=Date.now()){
  const timeLeft=item.departure-now/60000;
  const margin=timeLeft-item.walkMinutes;
  return {level:margin>=7?'green':margin>=3?'amber':'red',
   marginMinutes:Math.floor(margin),
   waitMinutes:Math.max(0,Math.ceil(timeLeft))};
 }
 function departures(schedule,candidates,now=Date.now(),limit=10){
  const choices=new Map();
  for(const stop of candidates){
   const k=stop.line+'|'+stop.id;
   if(!choices.has(k))choices.set(k,stop);
  }
  const start=Math.ceil(now/60000),end=start+12*60;
  const found=new Map();
  for(const trip of schedule.trips){
   if(!LINES.has(trip.line))continue;
   for(const stop of trip.stops){
    const key=trip.line+'|'+stop[0],nearby=choices.get(key);
    if(!nearby)continue;
    const departure=stop[2];
    // Keep the imminent departure visible even when walking there is too slow.
    // Otherwise users never see the red warning or the following service.
    if(departure<start||departure>end)continue;
    const id=key+'|'+departure;
    if(!found.has(id))found.set(id,{...nearby,departure,
      waitMinutes:Math.max(0,Math.ceil(departure-now/60000)),
      tripId:trip.tripId});
   }
  }
  // Official departure at a specific line+stop+minute is listed once.
  const ordered=[...found.values()].sort((a,b)=>a.departure-b.departure||
   a.meters-b.meters);
  const firstCatchable=new Map();
  for(const item of ordered){
   if(reachability(item,now).level==='red')continue;
   const key=item.line+'|'+item.id;
   if(!firstCatchable.has(key))firstCatchable.set(key,item.departure);
  }
  for(const item of ordered){
   if(reachability(item,now).level!=='red')continue;
   const alternative=firstCatchable.get(item.line+'|'+item.id);
   if(Number.isFinite(alternative)&&alternative>item.departure)
    item.nextCatchable=alternative;
  }
  const max=Number.isInteger(limit)?Math.max(1,Math.min(15,limit)):10;
  const result=ordered.slice(0,max);
  // At least one potentially reachable alternative must be visible when
  // early results are all too tight, including the sparse 260 timetable.
  if(result.length&&result.every(x=>reachability(x,now).level==='red')){
   const next=ordered.find(x=>reachability(x,now).level!=='red');
   if(next&&!result.includes(next)){
    result[result.length-1]=next;
    result.sort((a,b)=>a.departure-b.departure||a.meters-b.meters);
   }
  }
  return result;
 }
 function init(){
  const guardian=$('hhBkkGoldenPlannerV968');
  const grand=$('planner')&&$('find')?$('planner'):null;
  if(!guardian&&!grand||$('hhBkkNearQuickV975'))return;
  const actions=grand?.querySelector('.actions')||guardian?.querySelector('.hh-bkk-golden-actions-v968');
  if(!actions)return;
  const btn=d.createElement('button');btn.type='button';btn.id='hhBkkNearQuickV975';
  btn.className='hh-bkk-near-quick-v975';
  btn.textContent='📍 Innen · Következő járatok';
  btn.setAttribute('aria-controls','hhBkkNearPanelV975');btn.setAttribute('aria-expanded','false');
  const panel=d.createElement('section');panel.id='hhBkkNearPanelV975';
  panel.className='hh-bkk-near-panel-v975';panel.hidden=true;
  panel.setAttribute('aria-label','Közeli megállók következő menetrendi indulásai');
  const heading=d.createElement('div');heading.className='hh-bkk-near-header-v975';
  const strong=d.createElement('strong');strong.textContent='📍 Következő járatok innen';
  const close=d.createElement('button');close.type='button';close.textContent='✕';
  close.setAttribute('aria-label','Közeli járatok panel bezárása');
  close.addEventListener('click',()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false')});
  heading.append(strong,close);
  const note=d.createElement('p');note.className='hh-bkk-near-note-v975';
  note.id='hhBkkNearStatusV975';note.setAttribute('role','status');
  note.setAttribute('aria-live','polite');
  const rows=d.createElement('div');rows.className='hh-bkk-near-rows-v975';
  const settings=d.createElement('details');settings.id='hhBkkNearSettingsV975';
  settings.className='hh-bkk-near-settings-v975';
  const summary=d.createElement('summary');summary.textContent='⚙️ Járatok, távolság és találatok szerkesztése';
  settings.append(summary);
  const controls=d.createElement('div');controls.className='hh-bkk-near-controls-v975';
  const checks=new Map();
  for(const line of LINES){
   const label=d.createElement('label');label.className='hh-bkk-near-toggle-v975';
   const check=d.createElement('input');check.type='checkbox';check.value=line;
   check.setAttribute('aria-label',line+'-es járat megjelenítése');checks.set(line,check);
   const text=d.createElement('span');text.textContent=line+(line==='260'?' busz':' villamos');
   label.append(check,text);controls.append(label);
  }
  const range=d.createElement('label');range.className='hh-bkk-near-select-v975';
  const rangeTitle=d.createElement('span');rangeTitle.textContent='Keresési távolság';
  const radius=d.createElement('select');radius.setAttribute('aria-label','Keresési távolság');
  for(const [n,t] of [[300,'300 m'],[600,'600 m'],[1200,'1200 m']]){
   const opt=d.createElement('option');opt.value=String(n);opt.textContent=t;radius.append(opt);
  }
  range.append(rangeTitle,radius);controls.append(range);
  const amount=d.createElement('label');amount.className='hh-bkk-near-select-v975';
  const amtTitle=d.createElement('span');amtTitle.textContent='Indulások száma';
  const limitSelect=d.createElement('select');limitSelect.setAttribute('aria-label','Indulások száma');
  for(const n of [5,10,15]){
   const option=d.createElement('option');option.value=String(n);option.textContent=n+' indulás';limitSelect.append(option);
  }
  amount.append(amtTitle,limitSelect);controls.append(amount);
  settings.append(controls);
  function setControls(){
   const p=readPrefs();
   for(const [line,check] of checks)check.checked=p.lines.includes(line);
   radius.value=String(p.radius);limitSelect.value=String(p.limit);
  }
  let lastLocation=null,lastData=null;
  function settingsChanged(event){
   const lines=[...checks].filter(([_,check])=>check.checked).map(([line])=>line);
   if(!lines.length){
    if(event?.target?.type==='checkbox')event.target.checked=true;
    note.textContent='Legalább egy járatot válassz ki.';return;
   }
   const p={lines,radius:Number(radius.value),limit:Number(limitSelect.value)};
   savePrefs(p);
   if(lastData&&lastLocation){
    const candidates=near(lastData.network,lastLocation,p.radius,new Set(p.lines));
    render(departures(lastData.calendar,candidates,Date.now(),p.limit),lastLocation,p);
   }
  }
  for(const check of checks.values())check.addEventListener('change',settingsChanged);
  radius.addEventListener('change',settingsChanged);
  limitSelect.addEventListener('change',settingsChanged);
  const footer=d.createElement('small');footer.className='hh-bkk-near-footer-v975';
  footer.textContent='Hivatalos BKK GTFS · tervezett, nem élő indulás. 260, 17, 19, 1, 41. Zöld: legalább 7 perc ráhagyás; sárga: 3–7 perc; piros: 3 percnél kevesebb. Légvonali sétaidő, nem garantált útvonal vagy elérés. Új kereséshez koppints újra a gombra.';
  panel.append(heading,settings,note,rows,footer);
  actions.insertAdjacentElement('afterend',btn);
  btn.insertAdjacentElement('afterend',panel);
  function render(result,loc,prefs=readPrefs()){
   rows.replaceChildren();
   if(!result.length){
    note.textContent='Nincs ellenőrzött, elérhető indulás a kiválasztott járatokon '+prefs.radius+' méteren belül, a következő 12 órában.';
    return;
   }
   note.textContent=result.length+' következő menetrendi indulás · GPS-pontosság kb. '+
    Math.round(loc.accuracy)+' m. A gyaloglás légvonalból becsült; a jelzés nem garantált elérés.';
   for(const item of result){
    const risk=reachability(item,Date.now());
    const row=d.createElement('article');row.className='hh-bkk-near-result-v975';
    row.dataset.reach=risk.level;
    const pill=d.createElement('b');pill.className='hh-bkk-near-line-v975';
    pill.textContent=item.line;
    pill.dataset.mode=['17','19','1','41'].includes(item.line)?'tram':'bus';
    const info=d.createElement('div');info.className='hh-bkk-near-info-v975';
    const stop=d.createElement('strong');stop.textContent=item.name;
    const towards=d.createElement('span');towards.textContent='Irány: '+(item.headsign||'a járat útvonala');
    const walk=d.createElement('small');walk.textContent=item.meters+' m · kb. '+item.walkMinutes+' perc séta';
    info.append(stop,towards,walk);
    if(risk.level==='red'&&Number.isFinite(item.nextCatchable)){
     const next=d.createElement('small');next.className='hh-bkk-near-next-v976';
     next.textContent='Következő várhatóan elérhető indulás innen: '+
      fmt.format(new Date(item.nextCatchable*60000));
     info.append(next);
    }
    const time=d.createElement('div');time.className='hh-bkk-near-clock-v975';
    const hh=d.createElement('strong');hh.textContent=fmt.format(new Date(item.departure*60000));
    const until=d.createElement('b');until.textContent=risk.waitMinutes+' perc múlva';
    const rag=d.createElement('span');rag.className='hh-bkk-near-rag-v976';
    rag.textContent=risk.level==='green'?'● Elérhetőnek tűnik':
     risk.level==='amber'?'● Szoros az idő':'● Valószínűleg lekésed';
    rag.setAttribute('aria-label','Becsült elérési esély: '+rag.textContent);
    time.append(hh,until,rag);row.append(pill,info,time);rows.append(row);
   }
  }
  btn.addEventListener('click',async()=>{
   if(working)return;
   panel.hidden=false;btn.setAttribute('aria-expanded','true');
   working=true;btn.disabled=true;rows.replaceChildren();setControls();
   note.textContent='GPS-helyzet kérése…';
   try{
    const loc=await geo();
    note.textContent='Közeli megállók és ellenőrzött BKK-menetrend betöltése…';
    const data=await load(),{network,calendar}=data,prefs=readPrefs();
    lastLocation=loc;lastData=data;
    const candidates=near(network,loc,prefs.radius,new Set(prefs.lines));
    if(!candidates.length){
     rows.replaceChildren();
     note.textContent='Nincs a kiválasztott járatokhoz megálló '+prefs.radius+' méteren belül. Módosítsd a szűrőket.';
     return;
    }
    render(departures(calendar,candidates,Date.now(),prefs.limit),loc,prefs);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(e){note.textContent='⚠️ '+String(e?.message||'Nem sikerült a keresés.')}
   finally{working=false;btn.disabled=false}
  });
  w.HH_BKK_NEAR_DEPARTURES_V975=Object.freeze({near,departures,reachability,readPrefs,version:'976-rag'});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
