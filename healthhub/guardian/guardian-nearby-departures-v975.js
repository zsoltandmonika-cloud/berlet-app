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
 function near(network,location,maxMeters=1200){
  const point={lat:location.lat,lng:location.lng},places=new Map();
  for(const route of network.routes){
   const line=String(route.id||'');
   if(!LINES.has(line)||!Array.isArray(route.stops))continue;
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
    if(departure<start+nearby.walkMinutes||departure>end)continue;
    const id=key+'|'+departure;
    if(!found.has(id))found.set(id,{...nearby,departure,
      waitMinutes:Math.max(0,Math.ceil(departure-now/60000)),
      tripId:trip.tripId});
   }
  }
  // Prefer the soonest catchable departures. Different buses using the same
  // route+stop+minute are one row, not invented additional services.
  return [...found.values()].sort((a,b)=>a.departure-b.departure||
   a.meters-b.meters).slice(0,limit);
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
  const footer=d.createElement('small');footer.className='hh-bkk-near-footer-v975';
  footer.textContent='Hivatalos BKK GTFS · tervezett, nem élő indulás. Támogatott járatok: 260, 17, 19, 1, 41. A sétaidő becslés.';
  panel.append(heading,note,rows,footer);
  actions.insertAdjacentElement('afterend',btn);
  btn.insertAdjacentElement('afterend',panel);
  function render(result,loc){
   rows.replaceChildren();
   if(!result.length){
    note.textContent='Nincs ellenőrzött, elérhető indulás a következő 12 órában a támogatott öt vonalon, 1,2 km-en belül.';
    return;
   }
   note.textContent=result.length+' következő, elérhető menetrendi indulás · GPS-pontosság kb. '+
    Math.round(loc.accuracy)+' m · sétaidő csak légvonalból becsült';
   for(const item of result){
    const row=d.createElement('article');row.className='hh-bkk-near-result-v975';
    const pill=d.createElement('b');pill.className='hh-bkk-near-line-v975';
    pill.textContent=item.line;
    pill.dataset.mode=['17','19','1','41'].includes(item.line)?'tram':'bus';
    const info=d.createElement('div');info.className='hh-bkk-near-info-v975';
    const stop=d.createElement('strong');stop.textContent=item.name;
    const towards=d.createElement('span');towards.textContent='Irány: '+(item.headsign||'a járat útvonala');
    const walk=d.createElement('small');walk.textContent=item.meters+' m · kb. '+item.walkMinutes+' perc séta';
    info.append(stop,towards,walk);
    const time=d.createElement('div');time.className='hh-bkk-near-clock-v975';
    const hh=d.createElement('strong');hh.textContent=fmt.format(new Date(item.departure*60000));
    const until=d.createElement('b');until.textContent=item.waitMinutes+' perc múlva';
    time.append(hh,until);row.append(pill,info,time);rows.append(row);
   }
  }
  btn.addEventListener('click',async()=>{
   if(working)return;
   panel.hidden=false;btn.setAttribute('aria-expanded','true');
   working=true;btn.disabled=true;rows.replaceChildren();
   note.textContent='GPS-helyzet kérése…';
   try{
    const loc=await geo();
    note.textContent='Közeli megállók és ellenőrzött BKK-menetrend betöltése…';
    const {network,calendar}=await load();
    const candidates=near(network,loc);
    if(!candidates.length){
     note.textContent='Nincs 260-as, 17-es, 19-es, 1-es vagy 41-es megálló 1,2 km-en belül. Más járatok menetrendjéhez még bővíteni kell a forrást.';
     return;
    }
    render(departures(calendar,candidates),loc);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(e){note.textContent='⚠️ '+String(e?.message||'Nem sikerült a keresés.')}
   finally{working=false;btn.disabled=false}
  });
  w.HH_BKK_NEAR_DEPARTURES_V975=Object.freeze({near,departures,version:'975'});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
