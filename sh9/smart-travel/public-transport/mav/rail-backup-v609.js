/* SH9 MÁV Smart Rail · Phase 2G Backup & Restore v609.
 * Explicit user export/import ONLY. Profile-bound, redacted JSON v1.
 * NO cloud upload, GPS, polling, Supabase or background sync.
 */
(function(root,factory){
 'use strict';
 const personal=root?.SH9_MAV_PERSONAL_V607||(typeof require==='function'?require('./rail-personal-v607.js'):null);
 const journey=root?.SH9_MAV_JOURNEY_MANAGER_V608||(typeof require==='function'?require('./rail-journey-manager-v608.js'):null);
 const departure=root?.SH9_MAV_DEPARTURE_V611||(typeof require==='function'?require('./rail-departure-v611.js'):null);
 const api=factory(personal,journey,departure);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_BACKUP_V609=api;
})(typeof window!=='undefined'?window:null,function(personal,journey,departure){
 'use strict';
 const FORMAT='sh9-mav-backup-v2',LEGACY_FORMAT='sh9-mav-backup-v1',MAX_BYTES=256*1024,PROFILES=['z','m'];
 const favoriteFields=['from','to','label'],historyFields=['from','to','label','mode','when','timestamp'];
 const journeyFields=['id','from','to','mode','when','savedAt'];
 const departureFields=['journeyId','time','travel','buffer','checklist','status'];
 const fieldsOnly=(obj,fields)=>{const out={};for(const field of fields)if(obj[field]!==undefined)out[field]=obj[field];return out};
 const signature=p=>p.from.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu')+
  '\u001F'+p.to.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu');
 const histSignature=p=>signature(p)+'\u001F'+p.mode+'\u001F'+p.when;
 function privateFreeTrip(item){return fieldsOnly(item,journeyFields)}
 function build(storage,now=new Date()){
  if(!personal||!journey||!departure)throw Error('A vasúti modulok nem érhetők el');
  const profiles={};
  for(const id of PROFILES){
   profiles[id]={
    favorites:personal.loadFavorites(storage,id).map(x=>fieldsOnly(x,favoriteFields)),
    history:personal.loadHistory(storage,id,now.getTime()).map(x=>fieldsOnly(x,historyFields)),
    journeys:journey.read(storage,id).map(privateFreeTrip),
    departure:journey.read(storage,id).map(j=>{
     const saved=departure.readSaved(storage,id,j);
     return saved?{journeyId:j.id,...fieldsOnly(saved,departureFields.slice(1))}:null
    }).filter(Boolean)
   };
  }
  return {format:FORMAT,version:2,createdAt:now.toISOString(),privacy:'redacted',profiles};
 }
 function encode(backup){
  const text=JSON.stringify(backup,null,2);
  if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('A mentés túllépte a 256 KB-os korlátot');
  return text;
 }
 function validStation(s){
  return typeof s==='string'&&s===s.trim()&&s.length>=2&&s.length<=120&&!/[\u0000-\u001f<>]/.test(s);
 }
 function strictRecord(raw,allowed){
  return !!raw&&typeof raw==='object'&&!Array.isArray(raw)&&
   Object.keys(raw).every(k=>allowed.includes(k))&&!Object.keys(raw).some(k=>k==='__proto__'||k==='constructor');
 }
 function checkFavorite(raw){
  if(!strictRecord(raw,favoriteFields)||!validStation(raw.from)||!validStation(raw.to))return null;
  const parsed=personal.favorite(raw);
  if(!parsed||raw.label!==undefined&&(typeof raw.label!=='string'||parsed.label!==raw.label))return null;
  return fieldsOnly(parsed,favoriteFields);
 }
 function checkHistory(raw,now){
  if(!strictRecord(raw,historyFields)||!validStation(raw.from)||!validStation(raw.to))return null;
  const parsed=personal.historyItem(raw,now);
  if(!parsed||parsed.mode!==raw.mode||parsed.when!==raw.when||parsed.timestamp!==raw.timestamp)return null;
  if(raw.label!==undefined&&(typeof raw.label!=='string'||parsed.label!==raw.label))return null;
  return fieldsOnly(parsed,historyFields);
 }
 function checkJourney(raw){
  if(!strictRecord(raw,journeyFields)||!validStation(raw.from)||!validStation(raw.to))return null;
  const parsed=journey.normalize(raw);
  if(!parsed||parsed.when!==raw.when||parsed.id!==raw.id||parsed.savedAt!==raw.savedAt||parsed.mode!==raw.mode)return null;
  return privateFreeTrip(parsed);
 }
 function checkDeparture(raw){
  if(!departure||!strictRecord(raw,departureFields)||typeof raw.journeyId!=='string'||
     !/^[a-zA-Z0-9_-]{5,64}$/.test(raw.journeyId)||
     typeof raw.time!=='string'||(raw.time!==''&&!departure.instantForBudapest(raw.time))||
     !Number.isInteger(raw.travel)||raw.travel<5||raw.travel>180||
     !Number.isInteger(raw.buffer)||raw.buffer<5||raw.buffer>60||
     !Array.isArray(raw.checklist)||raw.checklist.length!==departure.CHECKS.length||
     raw.checklist.some(x=>typeof x!=='boolean')||
     !departure.STATES.includes(raw.status))return null;
  return fieldsOnly(raw,departureFields);
 }
 function parse(input,now=Date.now()){
  if(!personal||!journey)throw Error('Hiányzó helyi vasúti adatmodul');
  const text=typeof input==='string'?input:JSON.stringify(input);
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Túl nagy mentésfájl (maximum 256 KB)');
  let raw;try{raw=JSON.parse(text)}catch(_){throw Error('Sérült vagy nem JSON mentésfájl')}
  const legacy=raw?.format===LEGACY_FORMAT&&raw.version===1;
  const current=raw?.format===FORMAT&&raw.version===2;
  if(!raw||typeof raw!=='object'||(!legacy&&!current)||raw.privacy!=='redacted'||
   typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))
   throw Error('Ismeretlen vagy nem biztonságos mentésformátum');
  if(!raw.profiles||typeof raw.profiles!=='object'||Array.isArray(raw.profiles)||
   Object.keys(raw.profiles).sort().join(',')!=='m,z')
   throw Error('A mentésben mindkét profilnak külön kell szerepelnie');
  const profiles={};
  for(const id of PROFILES){
   const p=raw.profiles[id];
   const fields=Object.keys(p||{}).sort().join(',');
   if(!p||typeof p!=='object'||Array.isArray(p)||
      fields!==(legacy?'favorites,history,journeys':'departure,favorites,history,journeys'))
    throw Error('Hiányzó vagy hibás profiladatok');
   if(!Array.isArray(p.favorites)||!Array.isArray(p.history)||!Array.isArray(p.journeys)||
    (current&&!Array.isArray(p.departure))||
    p.favorites.length>40||p.history.length>10||p.journeys.length>30||
    (current&&p.departure.length>30))
    throw Error('Az adatok túllépik a biztonságos elemszámot');
   const favorites=p.favorites.map(checkFavorite);
   const history=p.history.map(v=>checkHistory(v,now));
   const journeys=p.journeys.map(checkJourney);
   if([...favorites,...history,...journeys].some(x=>!x))
    throw Error('A mentés hibás adatot vagy nem engedélyezett személyes mezőt tartalmaz');
   const ids=journeys.map(j=>j.id);
   if(new Set(ids).size!==ids.length)throw Error('Duplikált utazásazonosító a mentésben');
   const assistants=current?p.departure.map(checkDeparture):[];
   if(assistants.some(x=>!x))throw Error('Hibás vagy tiltott indulási asszisztens adat');
   const assistantIds=assistants.map(x=>x.journeyId);
   if(new Set(assistantIds).size!==assistantIds.length||
      assistantIds.some(assistantId=>!ids.includes(assistantId)))
    throw Error('Az indulási beállítások nem a mentésben lévő utazáshoz tartoznak');
   profiles[id]={favorites,history,journeys,departure:assistants};
  }
  return {format:legacy?LEGACY_FORMAT:FORMAT,version:legacy?1:2,createdAt:raw.createdAt,privacy:'redacted',profiles};
 }
 function merge(storage,archive,now=Date.now()){
  const data=parse(archive,now),writes=[],counts={};
  for(const id of PROFILES){
   const incoming=data.profiles[id];
   const f=personal.loadFavorites(storage,id);
   const favSeen=new Set(f.map(signature));let favAdded=0;
   for(const p of incoming.favorites){
    const key=signature(p);if(favSeen.has(key))continue;
    if(f.length>=40)throw Error((id==='m'?'Mónika':'Zsolt')+' kedvencei megteltek (40/40)');
    f.push(p);favSeen.add(key);favAdded++;
   }
   const h=personal.loadHistory(storage,id,now);
   const hByKey=new Map();
   for(const p of [...h,...incoming.history]){
    const key=histSignature(p);
    const existing=hByKey.get(key);
    if(!existing||p.timestamp>existing.timestamp)hByKey.set(key,p);
   }
   const history=[...hByKey.values()].sort((a,b)=>b.timestamp-a.timestamp).slice(0,10);
   const beforeH=new Set(h.map(histSignature));
   const histAdded=history.filter(p=>!beforeH.has(histSignature(p))).length;
   const j=journey.read(storage,id);const jIds=new Set(j.map(p=>p.id));let jAdded=0;
   for(const p of incoming.journeys){
    if(jIds.has(p.id))continue; // original local data (including private notes) always wins
    if(j.length>=30)throw Error((id==='m'?'Mónika':'Zsolt')+' utazásai megteltek (30/30)');
    j.push({...p,ticket:'',car:'',seat:'',note:''});
    jIds.add(p.id);jAdded++;
   }
   // Only the SIX known profile-scoped keys. Never write hh-profile or unrelated app keys.
   writes.push([personal.favoritesKey(id),JSON.stringify(f)]);
   writes.push([personal.historyKey(id),JSON.stringify(history)]);
   writes.push([journey.storageKey(id),JSON.stringify(j)]);
   counts[id]={favoritesAdded:favAdded,historyAdded:histAdded,journeysAdded:jAdded,
    favoritesTotal:f.length,historyTotal:history.length,journeysTotal:j.length};
  }
  return {writes,counts};
 }
 function restore(storage,archive,now=Date.now()){
  const plan=merge(storage,archive,now);const originals=[];
  for(const [key] of plan.writes){
   let old;try{old=storage.getItem(key)}catch(_){throw Error('Nem olvasható a helyi tárhely')}
   originals.push([key,old]);
  }
  let completed=0;
  try{
   for(const [key,value] of plan.writes){storage.setItem(key,value);completed++}
  }catch(_){
   let rollbackOk=true;
   for(let i=completed-1;i>=0;i--){
    const [key,value]=originals[i];
    try{if(value===null)storage.removeItem(key);else storage.setItem(key,value)}
    catch(_){rollbackOk=false}
   }
   throw Error(rollbackOk?'Mentési hiba: a korábbi adatok visszaálltak.':
    'Mentési hiba: az automatikus visszaállítás nem teljes. Őrizd meg a mentésfájlt!');
  }
  return plan.counts;
 }
 function mount(doc,win){
  const get=id=>doc.getElementById(id);
  const download=get('rail-backup-download'),file=get('rail-backup-file'),
   apply=get('rail-backup-apply'),preview=get('rail-backup-preview');
  if(!download||!file||!apply||!preview||!win.localStorage)return null;
  const storage=win.localStorage;
  let selected=null;
  function status(text){preview.textContent=text}
  download.addEventListener('click',()=>{
   try{
    const json=encode(build(storage));
    const blob=new win.Blob(['\uFEFF'+json],{type:'application/json;charset=utf-8'});
    const url=win.URL.createObjectURL(blob);
    const a=doc.createElement('a');a.href=url;
    a.download='SH9-MAV-biztonsagi-mentes-'+new Date().toISOString().slice(0,10)+'.json';
    doc.body.append(a);a.click();a.remove();
    win.setTimeout(()=>win.URL.revokeObjectURL(url),1500);
    status('Biztonsági mentés elkészítve mindkét profilról. Jegyszámok, ülőhelyek és magánjegyzetek nélkül.');
   }catch(err){status('Exporthiba: '+err.message)}
  });
  file.addEventListener('change',async()=>{
   selected=null;apply.disabled=true;
   const chosen=file.files?.[0];if(!chosen){status('Nincs kiválasztott fájl.');return}
   if(chosen.size>MAX_BYTES){status('A fájl túl nagy (max. 256 KB).');return}
   try{
    const text=(await chosen.text()).replace(/^\uFEFF/,'');
    selected=parse(text);
    const a=selected.profiles.z,b=selected.profiles.m;
    status('Ellenőrzött mentés · Zsolt: '+a.favorites.length+' kedvenc, '+a.history.length+
     ' előzmény, '+a.journeys.length+' utazás · Mónika: '+b.favorites.length+' kedvenc, '+
     b.history.length+' előzmény, '+b.journeys.length+
     ' utazás. Az adatok csak a saját profiljukhoz adódnak hozzá. A meglévő adatok nem íródnak felül.');
    apply.disabled=false;
   }catch(err){status('Nem tölthető be: '+err.message)}
  });
  apply.addEventListener('click',()=>{
   if(!selected)return;
   try{
    const counts=restore(storage,selected);
    status('Visszaállítás kész. Zsolt: +'+counts.z.favoritesAdded+' kedvenc, +'+
     counts.z.historyAdded+' előzmény, +'+counts.z.journeysAdded+' utazás. Mónika: +'+
     counts.m.favoritesAdded+' kedvenc, +'+counts.m.historyAdded+' előzmény, +'+
     counts.m.journeysAdded+' utazás. A meglévő magánadatok megmaradtak.');
    win.SH9_MAV_PERSONAL_UI?.render();
    win.SH9_MAV_JOURNEYS_UI?.render();
    selected=null;apply.disabled=true;file.value='';
   }catch(err){status('Visszaállítás sikertelen: '+err.message)}
  });
  return {build:()=>build(storage),preview:()=>selected};
 }
 return Object.freeze({FORMAT,MAX_BYTES,storageKey:journey?.storageKey,
  build,encode,parse,merge,restore,mount});
});
if(typeof window!=='undefined'&&typeof document!=='undefined'&&window.SH9_MAV_BACKUP_V609){
 window.SH9_MAV_BACKUP_UI=window.SH9_MAV_BACKUP_V609.mount(document,window);
}
