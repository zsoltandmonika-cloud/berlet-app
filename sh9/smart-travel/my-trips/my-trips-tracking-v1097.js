/* SH9 My Trips v1097. Single-click MÁVPlusz tracking via saved exact link
 * or a unique date-and-departure-verified local Volán GTFS trip ID.
 * No fabricated HKIR suffix; no permanent polling; no personal files leave device.
 */
(function(w){
 'use strict';
 const DB='hh-volan-full-gtfs-v996',PACK=()=>w.SH9_SMART_TRIP_PACK_V1078;
 const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const num=s=>PACK()?.trackingNumber(s);
 const close=db=>{try{db?.close()}catch(_){}};
 function openDB(){
  return new Promise((resolve,reject)=>{
   if(!w.indexedDB||!w.IDBKeyRange)return reject(Error('Nincs helyi GTFS-adat.'));
   let req;
   try{req=w.indexedDB.open(DB,1)}catch(e){reject(e);return}
   // Do not create an empty GTFS database just to look up a trip.
   req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(_){}};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('GTFS nem érhető el.'));
   req.onblocked=()=>reject(Error('GTFS-adatbázis zárolva.'));
  });
 }
 function txGet(db,store,key){
  return new Promise((resolve,reject)=>{
   try{
    const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).get(key);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error||Error('GTFS-olvasási hiba'));
   }catch(e){reject(e)}
  });
 }
 function txPrefix(db,prefix){
  return new Promise((resolve,reject)=>{
   try{
    const tx=db.transaction('trips','readonly');
    const range=w.IDBKeyRange.bound(prefix,prefix+'\uffff');
    const req=tx.objectStore('trips').getAll(range,30);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error||Error('GTFS-járatlekérési hiba'));
   }catch(e){reject(e)}
  });
 }
 function serviceValid(s,date){
  if(!s||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date||''))return false;
  const stamp=date.replaceAll('-',''),override=s.except||{};
  if(Object.prototype.hasOwnProperty.call(override,stamp))
   return Number(override[stamp])===1;
  if(stamp<String(s.from||'')||stamp>String(s.to||''))return false;
  const d=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(d.getTime()))return false;
  const weekday=(d.getUTCDay()+6)%7;
  return String(s.days||'')[weekday]==='1';
 }
 function departureMinute(s){
  const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||''));
  return m?Number(m[1])*60+Number(m[2]):null;
 }
 function boardingMatch(name,actual){
  const a=normal(name),b=normal(actual);
  if(!a||!b)return false;
  if(a===b||a.includes(b)||b.includes(a))return true;
  // Require two useful common words, not just a shared town name.
  const stop=new Set(b.split(' ').filter(x=>x.length>=4));
  return a.split(' ').filter(x=>x.length>=4&&stop.has(x)).length>=2;
 }
 async function gtfsUrl(trip,route,run){
  const n=num(route),r=PACK()?.trackingNumber(run,3);
  if(!n||!r||!trip?.travelDate)return '';
  const buses=(trip.segments||[]).filter(s=>s.mode==='bus'&&
   new RegExp('(^|[^0-9])'+n+'([^0-9]|$)').test(s.line||'')&&departureMinute(s.departure)!==null);
  if(!buses.length)return '';
  let db;
  try{
   db=await openDB();
   if(!['trips','services','stops'].every(k=>db.objectStoreNames.contains(k)))return '';
   const prefix='hkir_'+n+'_'+r+'-';
   const all=await txPrefix(db,prefix);
   if(!all.length||all.length>=30)return '';
   const matches=[];
   for(const candidate of all){
    if(!new RegExp('^hkir_'+n+'_'+r+'-[0-9]+$').test(candidate.id||''))continue;
    const service=await txGet(db,'services',candidate.service);
    if(!serviceValid(service,trip.travelDate))continue;
    const stops=Array.isArray(candidate.stops)?candidate.stops:[];
    for(const leg of buses){
     const minute=departureMinute(leg.departure);
     const relevant=stops.filter(a=>Array.isArray(a)&&Math.abs(Number(a[2])-minute)<=1);
     for(const stop of relevant){
      const location=await txGet(db,'stops',stop[0]);
      if(location?.name&&boardingMatch(leg.from,location.name)){
       matches.push(candidate.id);
       break;
      }
     }
    }
   }
   const distinct=[...new Set(matches)];
   if(distinct.length!==1)return '';
   const url='https://mavplusz.hu/#/trip/hkir:'+distinct[0]+'?ui_activeItinerary=-1';
   return PACK()?.trackingUrl(url)||'';
  }catch(_){return ''}
  finally{close(db)}
 }
 function budapestDay(at=new Date()){
  const parts={};
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'});
  for(const item of fmt.formatToParts(at))if(item.type!=='literal')parts[item.type]=item.value;
  return parts.year+'-'+parts.month+'-'+parts.day;
 }
 function isTravelDay(trip,at=new Date()){
  return typeof trip?.travelDate==='string'&&trip.travelDate===budapestDay(at);
 }
 async function lookup(trip,route,run){
  const pack=PACK();
  if(!pack)return {url:'',source:'missing'};
  const exact=pack.trackingDeepLink(trip,route,run);
  if(exact)return {url:exact,source:'saved'};
  const fromGtfs=await gtfsUrl(trip,route,run);
  return fromGtfs?{url:fromGtfs,source:'local-gtfs'}:{url:'',source:'not-resolved'};
 }
 function openPending(){
  // Open synchronously from the actual user click, or the browser may block it.
  const tab=w.open('about:blank','_blank');
  if(tab){
   try{tab.document.title='SH9 · járat azonosítása';tab.document.body.textContent='MÁVPlusz járat ellenőrzése…'}catch(_){}
  }
  return tab;
 }
 function finishPending(tab,url){
  const safe=PACK()?.trackingUrl(url)||'https://mavplusz.hu/';
  if(tab&&!tab.closed){try{tab.location.replace(safe);return}catch(_){}}
  w.location.assign(safe);
 }
 w.SH9_TRIP_TRACKING_V1097=Object.freeze({lookup,gtfsUrl,openPending,finishPending,serviceValid,boardingMatch,budapestDay,isTravelDay});
})(window);
